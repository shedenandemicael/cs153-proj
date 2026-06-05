import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import { ebaySellFetch } from "./http";

interface PolicyListResponse {
  fulfillmentPolicies?: Array<{ fulfillmentPolicyId?: string; name?: string }>;
  paymentPolicies?: Array<{ paymentPolicyId?: string; name?: string }>;
  returnPolicies?: Array<{ returnPolicyId?: string; name?: string }>;
}

export interface ListingPolicyIds {
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
}

export async function optInToBusinessPolicies(): Promise<void> {
  try {
    await ebaySellFetch("/sell/account/v1/program/opt_in", {
      method: "POST",
      body: { programType: "SELLING_POLICY_MANAGEMENT" },
    });
  } catch {
    // Already opted in
  }
}

export async function getListingPolicyIds(): Promise<ListingPolicyIds> {
  await optInToBusinessPolicies();

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

  const fulfillmentPolicyId = fulfillment.fulfillmentPolicies?.[0]?.fulfillmentPolicyId;
  const paymentPolicyId = payment.paymentPolicies?.[0]?.paymentPolicyId;
  const returnPolicyId = returns.returnPolicies?.[0]?.returnPolicyId;

  if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
    throw new Error(
      "Sandbox seller is missing business policies. In eBay Sandbox Seller Hub, create payment, return, and shipping (fulfillment) policies for EBAY_US, then try again."
    );
  }

  return { fulfillmentPolicyId, paymentPolicyId, returnPolicyId };
}
