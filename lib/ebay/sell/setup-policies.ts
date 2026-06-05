import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import { ebaySellFetch } from "./http";
import type { ListingPolicyIds } from "./policies";

export async function optInToBusinessPolicies(): Promise<void> {
  try {
    await ebaySellFetch("/sell/account/v1/program/opt_in", {
      method: "POST",
      body: { programType: "SELLING_POLICY_MANAGEMENT" },
    });
  } catch {
    // Already opted in or sandbox lag
  }
}

const POLICY_PREFIX = "CS153 Default";
export const CS153_PAYMENT_POLICY_NAME = `${POLICY_PREFIX} Payment`;
export const CS153_RETURN_POLICY_NAME = `${POLICY_PREFIX} Returns`;
export const CS153_FULFILLMENT_POLICY_NAME = `${POLICY_PREFIX} Shipping`;

interface PolicyListResponse {
  fulfillmentPolicies?: Array<{ fulfillmentPolicyId?: string; name?: string }>;
  paymentPolicies?: Array<{ paymentPolicyId?: string; name?: string }>;
  returnPolicies?: Array<{ returnPolicyId?: string; name?: string }>;
}

export interface BusinessPoliciesStatus {
  ready: boolean;
  paymentCount: number;
  returnCount: number;
  fulfillmentCount: number;
}

export interface SetupBusinessPoliciesResult {
  policies: ListingPolicyIds;
  created: string[];
  alreadyPresent: string[];
}

async function listPolicies(): Promise<PolicyListResponse> {
  const [fulfillment, payment, returns] = await Promise.all([
    ebaySellFetch<PolicyListResponse>("/sell/account/v1/fulfillment_policy", {
      query: { marketplace_id: EBAY_MARKETPLACE_ID },
    }),
    ebaySellFetch<PolicyListResponse>("/sell/account/v1/payment_policy", {
      query: { marketplace_id: EBAY_MARKETPLACE_ID },
    }),
    ebaySellFetch<PolicyListResponse>("/sell/account/v1/return_policy", {
      query: { marketplace_id: EBAY_MARKETPLACE_ID },
    }),
  ]);

  return {
    fulfillmentPolicies: fulfillment.fulfillmentPolicies,
    paymentPolicies: payment.paymentPolicies,
    returnPolicies: returns.returnPolicies,
  };
}

export async function getBusinessPoliciesStatus(): Promise<BusinessPoliciesStatus> {
  try {
    await optInToBusinessPolicies();
    const lists = await listPolicies();
    const paymentCount = lists.paymentPolicies?.length ?? 0;
    const returnCount = lists.returnPolicies?.length ?? 0;
    const fulfillmentCount = lists.fulfillmentPolicies?.length ?? 0;

    return {
      ready: paymentCount > 0 && returnCount > 0 && fulfillmentCount > 0,
      paymentCount,
      returnCount,
      fulfillmentCount,
    };
  } catch {
    return {
      ready: false,
      paymentCount: 0,
      returnCount: 0,
      fulfillmentCount: 0,
    };
  }
}

function policyIdsFromLists(lists: PolicyListResponse): ListingPolicyIds | null {
  const fulfillmentPolicyId = lists.fulfillmentPolicies?.[0]?.fulfillmentPolicyId;
  const paymentPolicyId = lists.paymentPolicies?.[0]?.paymentPolicyId;
  const returnPolicyId = lists.returnPolicies?.[0]?.returnPolicyId;

  if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
    return null;
  }

  return { fulfillmentPolicyId, paymentPolicyId, returnPolicyId };
}

async function createDefaultPaymentPolicy(): Promise<string> {
  const res = await ebaySellFetch<{ paymentPolicyId?: string }>(
    "/sell/account/v1/payment_policy",
    {
      method: "POST",
      body: {
        name: CS153_PAYMENT_POLICY_NAME,
        marketplaceId: EBAY_MARKETPLACE_ID,
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
        immediatePay: false,
      },
    }
  );
  if (!res.paymentPolicyId) {
    throw new Error("eBay did not return paymentPolicyId after create.");
  }
  return res.paymentPolicyId;
}

async function createDefaultReturnPolicy(): Promise<string> {
  const res = await ebaySellFetch<{ returnPolicyId?: string }>(
    "/sell/account/v1/return_policy",
    {
      method: "POST",
      body: {
        name: CS153_RETURN_POLICY_NAME,
        marketplaceId: EBAY_MARKETPLACE_ID,
        returnsAccepted: true,
        returnPeriod: { value: 30, unit: "DAY" },
        refundMethod: "MONEY_BACK",
        returnShippingCostPayer: "BUYER",
      },
    }
  );
  if (!res.returnPolicyId) {
    throw new Error("eBay did not return returnPolicyId after create.");
  }
  return res.returnPolicyId;
}

async function createDefaultFulfillmentPolicy(): Promise<string> {
  const res = await ebaySellFetch<{ fulfillmentPolicyId?: string }>(
    "/sell/account/v1/fulfillment_policy",
    {
      method: "POST",
      body: {
        name: CS153_FULFILLMENT_POLICY_NAME,
        marketplaceId: EBAY_MARKETPLACE_ID,
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
        handlingTime: { unit: "DAY", value: 1 },
        shippingOptions: [
          {
            costType: "FLAT_RATE",
            optionType: "DOMESTIC",
            shippingServices: [
              {
                sortOrder: 1,
                buyerResponsibleForShipping: false,
                freeShipping: true,
                shippingCarrierCode: "USPS",
                shippingServiceCode: "USPSPriorityFlatRateBox",
              },
            ],
          },
        ],
      },
    }
  );
  if (!res.fulfillmentPolicyId) {
    throw new Error("eBay did not return fulfillmentPolicyId after create.");
  }
  return res.fulfillmentPolicyId;
}

/**
 * Opt in to business policies and create payment, return, and fulfillment templates
 * via the Account API (no sandbox Seller Hub required).
 */
export async function setupBusinessPolicies(): Promise<SetupBusinessPoliciesResult> {
  await optInToBusinessPolicies();

  const created: string[] = [];
  const alreadyPresent: string[] = [];

  let lists = await listPolicies();

  if (!lists.paymentPolicies?.length) {
    await createDefaultPaymentPolicy();
    created.push("payment");
  } else {
    alreadyPresent.push("payment");
  }

  if (!lists.returnPolicies?.length) {
    await createDefaultReturnPolicy();
    created.push("return");
  } else {
    alreadyPresent.push("return");
  }

  if (!lists.fulfillmentPolicies?.length) {
    await createDefaultFulfillmentPolicy();
    created.push("fulfillment");
  } else {
    alreadyPresent.push("fulfillment");
  }

  lists = await listPolicies();
  const policies = policyIdsFromLists(lists);
  if (!policies) {
    throw new Error(
      "Business policies could not be verified after setup. Reconnect eBay Sandbox and try again."
    );
  }

  return { policies, created, alreadyPresent };
}
