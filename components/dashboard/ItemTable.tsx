import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { DeleteItemButton } from "@/components/items/DeleteItemButton";

export interface DashboardItem {
  id: string;
  status: string;
  title: string | null;
  startingPrice: number | null;
  updatedAt: string;
  imagePath: string | null;
}

export function ItemTable({ items }: { items: DashboardItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted)]">
        <p>No listings yet. Drop in photos and let Spot draft your first item.</p>
        <Link
          href="/items/new"
          className="mt-4 inline-block font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline"
        >
          New listing →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Item</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Est. price</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imagePath}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-slate-100" />
                  )}
                  <span className="font-medium text-slate-900 line-clamp-1">
                    {item.title ?? "Untitled draft"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge status={item.status} />
              </td>
              <td className="px-4 py-3 text-slate-700">
                {item.startingPrice != null ? `$${item.startingPrice.toFixed(2)}` : "—"}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(item.updatedAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/items/${item.id}`}
                    className="font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline"
                  >
                    Open
                  </Link>
                  <DeleteItemButton
                    itemId={item.id}
                    itemLabel={item.title ?? "Untitled draft"}
                    variant="link"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
