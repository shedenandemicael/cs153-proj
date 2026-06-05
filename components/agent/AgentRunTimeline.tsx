import type { AgentStepLog } from "@/lib/agent/types";

const STEP_LABELS: Record<string, string> = {
  identify_item: "Photos",
  await_user_input: "Your input",
  fetch_comparables: "Comps",
  determine_price: "Price",
  generate_listing: "Listing",
  auto_approve: "Approved",
  auto_evaluate: "Done",
  auto_publish: "Published",
};

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
      return "✕";
    case "skipped":
      return "○";
    default:
      return "…";
  }
}

export function AgentRunTimeline({
  steps,
  error,
  compact = false,
}: {
  steps: AgentStepLog[];
  runStatus?: string | null;
  error?: string | null;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "py-2" : ""}>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={`${s.id}-${i}`} className="flex gap-2 text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                s.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : s.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-[var(--spot-light)] text-[var(--spot-dark)]"
              }`}
            >
              {statusIcon(s.status)}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)]">{STEP_LABELS[s.id] ?? s.id}</p>
              {!compact && <p className="text-[var(--muted)]">{s.message}</p>}
            </div>
          </li>
        ))}
      </ol>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
