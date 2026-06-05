import { EBAY_MARKETPLACE_ID } from "../fetch/http";
import { ebaySellFetch } from "./http";
import { optInToBusinessPolicies, setupBusinessPolicies } from "./setup-policies";

export { optInToBusinessPolicies } from "./setup-policies";

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

export async function getListingPolicyIds(): Promise<ListingPolicyIds> {
  await optInToBusinessPolicies();

  let [fulfillment, payment, returns] = await Promise.all([
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
    const setup = await setupBusinessPolicies();
    return setup.policies;
  }

  return { fulfillmentPolicyId, paymentPolicyId, returnPolicyId };
}
