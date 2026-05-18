"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PricingInsight } from "@/components/items/PricingInsight";
import { Badge } from "@/components/ui/Badge";

export interface ListingResultData {
  title: string;
  descriptionBullets: string[];
  itemSpecifics: Record<string, string>;
  conditionDesc: string;
  categoryName?: string;
  startingPrice: number;
  buyItNowPrice?: number;
  shippingAssumptions?: string;
  confidenceScore: number;
  warnings: string[];
  questions: string[];
  pricingRationale?: string | null;
  pricingMethod?: string | null;
  draftStatus: string;
  itemStatus: string;
  ebayOfferId?: string | null;
}

export function ListingResult({ data }: { data: ListingResultData }) {
  const [copied, setCopied] = useState(false);

  const exportText = [
    data.title,
    "",
    ...data.descriptionBullets.map((b) => `• ${b}`),
    "",
    `Condition: ${data.conditionDesc}`,
    data.categoryName ? `Category: ${data.categoryName}` : "",
    `Starting: $${data.startingPrice.toFixed(2)}`,
    data.buyItNowPrice != null ? `Buy It Now: $${data.buyItNowPrice.toFixed(2)}` : "",
    data.shippingAssumptions ? `Shipping: ${data.shippingAssumptions}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function copyListing() {
    await navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Agent listing output</h2>
        <div className="flex items-center gap-2">
          <Badge status={data.itemStatus} />
          <span className="text-sm text-slate-500">
            {Math.round(data.confidenceScore * 100)}% confidence
          </span>
        </div>
      </div>

      <PricingInsight rationale={data.pricingRationale} method={data.pricingMethod} />

      {data.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.warnings.map((w, i) => (
            <Alert key={i} variant="warning">
              {w}
            </Alert>
          ))}
        </div>
      )}

      {data.questions.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.questions.map((q, i) => (
            <Alert key={i} variant="info">
              {q}
            </Alert>
          ))}
        </div>
      )}

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Title</dt>
          <dd className="mt-1 text-slate-900">{data.title}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Description</dt>
          <dd className="mt-1">
            <ul className="list-disc space-y-1 pl-5 text-slate-800">
              {data.descriptionBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Item specifics</dt>
          <dd className="mt-1 text-slate-800">
            {Object.entries(data.itemSpecifics).map(([k, v]) => (
              <span key={k} className="mr-3 inline-block">
                <strong>{k}:</strong> {v}
              </span>
            ))}
          </dd>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Starting price</dt>
            <dd className="mt-1 text-lg font-semibold">${data.startingPrice.toFixed(2)}</dd>
          </div>
          {data.buyItNowPrice != null && (
            <div>
              <dt className="font-medium text-slate-500">Buy It Now</dt>
              <dd className="mt-1 text-lg font-semibold">${data.buyItNowPrice.toFixed(2)}</dd>
            </div>
          )}
        </div>
        {data.ebayOfferId && (
          <div>
            <dt className="font-medium text-slate-500">eBay offer</dt>
            <dd className="mt-1 font-mono text-slate-800">{data.ebayOfferId}</dd>
          </div>
        )}
      </dl>

      <Button type="button" variant="secondary" className="mt-6" onClick={copyListing}>
        {copied ? "Copied!" : "Copy listing for eBay"}
      </Button>
    </Card>
  );
}
