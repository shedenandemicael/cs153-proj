"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

interface BatchSummary {
  id: string;
  status: string;
  totalItems: number;
  processed: number;
  succeeded: number;
  failed: number;
  items: Array<{
    id: string;
    batchIndex: number | null;
    status: string;
    title: string | null;
    startingPrice: number | null;
    imagePath: string | null;
  }>;
}

export function BatchProgress({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/items/batch/${batchId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load batch");
        if (!active) return;
        setSummary(data);

        if (data.status === "processing" || data.status === "pending") {
          setTimeout(poll, 2000);
        } else {
          router.refresh();
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Poll failed");
      }
    }

    poll();
    return () => {
      active = false;
    };
  }, [batchId, router]);

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!summary) {
    return <Alert variant="info">Loading batch status…</Alert>;
  }

  const progress =
    summary.totalItems > 0 ? Math.round((summary.processed / summary.totalItems) * 100) : 0;
  const isDone = summary.status === "completed";

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Batch progress</h2>
        <p className="mt-1 text-sm text-slate-600">
          {isDone
            ? "All items processed."
            : "Agent is working through your closet one item at a time."}
        </p>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm text-slate-600">
            <span>
              {summary.processed} / {summary.totalItems} items
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div className="rounded-lg bg-green-50 p-3">
            <dt className="text-green-700">Succeeded</dt>
            <dd className="text-xl font-semibold text-green-900">{summary.succeeded}</dd>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <dt className="text-red-700">Failed</dt>
            <dd className="text-xl font-semibold text-red-900">{summary.failed}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-600">Total</dt>
            <dd className="text-xl font-semibold">{summary.totalItems}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Items in batch</h3>
        <ul className="divide-y divide-slate-100">
          {summary.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {item.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imagePath}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {item.title ?? `Item ${(item.batchIndex ?? 0) + 1}`}
                </p>
                {item.startingPrice != null && (
                  <p className="text-sm text-slate-500">${item.startingPrice.toFixed(2)}</p>
                )}
              </div>
              <Badge status={item.status} />
              <Link href={`/items/${item.id}`} className="text-sm text-blue-600 hover:underline">
                View
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {isDone && (
        <Link href="/">
          <Button>Back to dashboard</Button>
        </Link>
      )}
    </div>
  );
}
