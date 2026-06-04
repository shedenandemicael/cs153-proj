const statusStyles: Record<string, string> = {
  PROCESSING: "bg-blue-100 text-blue-800",
  AWAITING_INPUT: "bg-amber-100 text-amber-900",
  READY: "bg-green-100 text-green-800",
  PUBLISHED: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-red-100 text-red-800",
  INTAKE: "bg-slate-100 text-slate-700",
  GENERATED: "bg-blue-100 text-blue-800",
  REVIEWED: "bg-green-100 text-green-800",
  DRAFT: "bg-slate-100 text-slate-700",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function Badge({ status }: { status: string }) {
  const style = statusStyles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
