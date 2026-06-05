import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/Card";
import { AgentActions } from "@/components/items/AgentActions";

export const dynamic = "force-dynamic";

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { evaluation: true, listingDraft: true },
  });

  if (!item) notFound();

  const metrics = item.evaluation;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/items/${id}`}
            className="text-sm font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline"
          >
            ← Agent result
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Agent metrics</h1>
          <p className="mt-1 text-slate-600">
            Autonomous run — no human edits recorded.
          </p>
        </div>
        <AgentActions itemId={id} itemLabel={item.listingDraft?.title ?? "this item"} />
      </div>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-sm text-slate-500">Est. time saved</dt>
            <dd className="text-2xl font-semibold">{metrics?.timeSavedMinutes ?? 0} min</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-sm text-slate-500">Fields generated</dt>
            <dd className="text-2xl font-semibold">{metrics?.fieldsGenerated ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <dt className="text-sm text-slate-500">Human edits</dt>
            <dd className="text-2xl font-semibold">{metrics?.fieldsEditedByUser ?? 0}</dd>
          </div>
        </dl>
        {metrics?.qualityScore != null && (
          <p className="mt-6 text-slate-700">
            Automated quality score: <strong>{metrics.qualityScore.toFixed(1)}</strong> / 5
          </p>
        )}
        {metrics?.qualityNotes && (
          <p className="mt-2 text-sm text-slate-500">{metrics.qualityNotes}</p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">CS153 — Autonomous agent track</h2>
        <p className="mt-2 text-sm text-slate-600">
          This build optimizes for end-to-end automation: market fetch → pricing → copy → policy-based
          approval → evaluation → optional publish. Human intervention is limited to optional
          overrides (re-run, delete) rather than required review gates.
        </p>
      </Card>
    </div>
  );
}
