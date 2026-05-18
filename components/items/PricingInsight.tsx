import { Alert } from "@/components/ui/Alert";

export function PricingInsight({
  rationale,
  method,
}: {
  rationale?: string | null;
  method?: string | null;
}) {
  if (!rationale) return null;

  const methodLabel =
    method === "openai-vision"
      ? "GPT-4o vision + comparables"
      : method === "comparable-stats"
        ? "Comparable statistics"
        : method ?? "Automated";

  return (
    <Alert variant="info">
      <p className="font-medium text-slate-900">How we priced this</p>
      <p className="mt-1 text-slate-700">{rationale}</p>
      <p className="mt-2 text-xs text-slate-500">Method: {methodLabel}</p>
    </Alert>
  );
}
