import { Card } from "@/components/ui/Card";

interface Comparable {
  id: string;
  title: string;
  price: number;
  condition?: string | null;
  soldDate?: string | null;
  url?: string | null;
  listingType?: string;
  source?: string;
}

export function ComparableList({ comparables }: { comparables: Comparable[] }) {
  if (comparables.length === 0) return null;

  const avg = comparables.reduce((s, c) => s + c.price, 0) / comparables.length;

  return (
    <Card className="!p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-[var(--foreground)]">Similar sold</h3>
        <span className="text-sm font-semibold text-[var(--spot)]">~${avg.toFixed(0)} avg</span>
      </div>
      <ul className="space-y-2">
        {comparables.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 line-clamp-1 text-[var(--muted)] hover:text-[var(--spot)] hover:underline"
              >
                {c.title}
              </a>
            ) : (
              <span className="min-w-0 flex-1 line-clamp-1 text-[var(--muted)]">{c.title}</span>
            )}
            <span className="shrink-0 font-medium text-[var(--foreground)]">
              ${c.price.toFixed(0)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
