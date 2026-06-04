import { Card } from "@/components/ui/Card";
import type { AgentStepLog } from "@/lib/agent/types";

const STEP_LABELS: Record<string, string> = {
  identify_item: "Photo identification",
  await_user_input: "Seller input",
  fetch_comparables: "Market research",
  determine_price: "Price analysis",
  generate_listing: "Listing generation",
  auto_approve: "Auto-approve",
  auto_evaluate: "Evaluation",
  auto_publish: "Publish",
};

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
      return "✕";
    case "skipped":
      return "○";
    case "running":
      return "…";
    default:
      return "·";
  }
}

export function AgentRunTimeline({
  steps,
  runStatus,
  error,
}: {
  steps: AgentStepLog[];
  runStatus?: string | null;
  error?: string | null;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Agent run</h3>
        {runStatus && (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {runStatus}
          </span>
        )}
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={`${s.id}-${i}`} className="flex gap-3 text-sm">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                s.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : s.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : s.status === "skipped"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-blue-100 text-blue-800"
              }`}
            >
              {statusIcon(s.status)}
            </span>
            <div>
              <p className="font-medium text-slate-800">
                {STEP_LABELS[s.id] ?? s.id}
              </p>
              <p className="text-slate-600">{s.message}</p>
              <p className="text-xs text-slate-400">{new Date(s.at).toLocaleTimeString()}</p>
            </div>
          </li>
        ))}
      </ol>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
