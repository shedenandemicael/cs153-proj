type AlertVariant = "info" | "warning" | "error" | "success";

const styles: Record<AlertVariant, string> = {
  info: "bg-blue-50 text-blue-900 border-blue-200",
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
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}>{children}</div>
  );
}
