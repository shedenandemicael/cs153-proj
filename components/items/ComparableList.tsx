import { Card } from "@/components/ui/Card";

export interface ComparableRow {
  id: string;
  title: string;
  price: number;
  condition?: string | null;
  soldDate?: string | null;
  url?: string | null;
  listingType?: string | null;
  source: string;
}

function sourceLabel(source: string, listingType?: string | null): string {
  if (source === "mock") return "mock data";
  if (source === "ebay-sold") return "eBay sold (Insights API)";
  if (source === "ebay-browse") return "eBay active (Browse API)";
  if (listingType === "sold") return "eBay sold";
  if (listingType === "active") return "eBay active";
  return source;
}

function typeBadge(type?: string | null) {
  if (type === "sold") {
    return (
      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
        Sold
      </span>
    );
  }
  if (type === "active") {
    return (
      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
        Active
      </span>
    );
  }
  return null;
}

export function ComparableList({ comparables }: { comparables: ComparableRow[] }) {
  if (comparables.length === 0) return null;

  const sources = [...new Set(comparables.map((c) => c.source))];
  const soldCount = comparables.filter((c) => c.listingType === "sold").length;
  const activeCount = comparables.filter((c) => c.listingType === "active").length;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Comparable listings</h3>
      <ul className="space-y-2 text-sm">
        {comparables.map((c) => (
          <li
            key={c.id}
            className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex flex-wrap items-center gap-1">
                {typeBadge(c.listingType)}
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-slate-700 hover:text-[var(--spot)] hover:underline"
                  >
                    {c.title}
                  </a>
                ) : (
                  <span className="text-slate-700 line-clamp-2">{c.title}</span>
                )}
              </div>
              {c.soldDate && (
                <p className="text-xs text-slate-400">
                  Sold {new Date(c.soldDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className="shrink-0 font-medium text-slate-900">${c.price.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">
        {soldCount > 0 && `${soldCount} sold`}
        {soldCount > 0 && activeCount > 0 && " · "}
        {activeCount > 0 && `${activeCount} active`}
        {(soldCount > 0 || activeCount > 0) && " — "}
        {sources.map((s) => sourceLabel(s)).join(", ")} (official API, not scraped)
      </p>
    </Card>
  );
}
