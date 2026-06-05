import { itemStatusLabel } from "@/lib/utils/item-status";

const statusStyles: Record<string, string> = {
  PROCESSING: "bg-[var(--spot-light)] text-[var(--spot-dark)]",
  AWAITING_INPUT: "bg-amber-100 text-amber-900",
  READY: "bg-green-100 text-green-800",
  PUBLISHED: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-red-100 text-red-800",
  INTAKE: "bg-slate-100 text-slate-700",
  GENERATED: "bg-[var(--spot-light)] text-[var(--spot-dark)]",
  REVIEWED: "bg-green-100 text-green-800",
  DRAFT: "bg-slate-100 text-slate-700",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function Badge({ status }: { status: string }) {
  const style = statusStyles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {itemStatusLabel(status)}
    </span>
  );
}
