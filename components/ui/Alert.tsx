type AlertVariant = "info" | "warning" | "error" | "success";

const styles: Record<AlertVariant, string> = {
  info: "border-[var(--border)] bg-[var(--spot-light)] text-[var(--spot-dark)]",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  error: "bg-red-50 text-red-900 border-red-200",
  success: "bg-green-50 text-green-900 border-green-200",
};

export function Alert({
  variant = "info",
  children,
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border px-4 py-3 text-sm break-words ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
