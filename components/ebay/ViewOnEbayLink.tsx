export function ViewOnEbayLink({
  url,
  size = "default",
  className = "",
}: {
  url: string;
  size?: "default" | "compact";
  className?: string;
}) {
  const styles =
    size === "compact"
      ? "text-sm font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline"
      : "inline-flex items-center justify-center rounded-lg bg-[var(--spot)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--spot-dark)]";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles} ${className}`}
    >
      View on eBay{size === "compact" ? " →" : ""}
    </a>
  );
}
