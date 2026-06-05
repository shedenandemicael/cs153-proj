"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ViewOnEbayLink } from "@/components/ebay/ViewOnEbayLink";

export interface ListingResultData {
  title: string;
  descriptionBullets: string[];
  itemSpecifics: Record<string, string>;
  conditionDesc: string;
  categoryName?: string;
  startingPrice: number;
  buyItNowPrice?: number;
  confidenceScore: number;
  warnings: string[];
  questions: string[];
  pricingRationale?: string | null;
  ebayListingUrl?: string | null;
}

export function ListingResult({ data }: { data: ListingResultData }) {
  const [copied, setCopied] = useState(false);
  const price =
    data.buyItNowPrice != null
      ? `$${data.buyItNowPrice.toFixed(0)}`
      : `$${data.startingPrice.toFixed(0)}`;

  const exportText = [
    data.title,
    "",
    ...data.descriptionBullets.map((b) => `• ${b}`),
    "",
    `Condition: ${data.conditionDesc}`,
    `Price: ${price}`,
  ].join("\n");

  async function copyListing() {
    await navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-bold text-[var(--foreground)]">{price}</p>
        <span className="text-sm text-[var(--muted)]">
          {Math.round(data.confidenceScore * 100)}% match confidence
        </span>
      </div>

      {data.pricingRationale && (
        <p className="mb-4 text-sm text-[var(--muted)]">{data.pricingRationale}</p>
      )}

      {data.warnings.length > 0 && (
        <div className="mb-4 space-y-1">
          {data.warnings.map((w, i) => (
            <Alert key={i} variant="warning">
              {w}
            </Alert>
          ))}
        </div>
      )}

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Title</dt>
          <dd className="mt-1 text-[var(--foreground)]">{data.title}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Description
          </dt>
          <dd className="mt-1">
            <ul className="list-disc space-y-1 pl-5 text-[var(--foreground)]">
              {data.descriptionBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </dd>
        </div>
        {Object.keys(data.itemSpecifics).length > 0 && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Details
            </dt>
            <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[var(--foreground)]">
              {Object.entries(data.itemSpecifics).map(([k, v]) => (
                <span key={k}>
                  {k}: {v}
                </span>
              ))}
            </dd>
          </div>
        )}
        {data.categoryName && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Category
            </dt>
            <dd className="mt-1 text-[var(--foreground)]">{data.categoryName}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {data.ebayListingUrl ? <ViewOnEbayLink url={data.ebayListingUrl} /> : null}
        <Button type="button" variant="secondary" onClick={copyListing}>
          {copied ? "Copied" : "Copy text"}
        </Button>
      </div>
    </Card>
  );
}
