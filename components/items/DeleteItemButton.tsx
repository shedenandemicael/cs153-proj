"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface DeleteItemButtonProps {
  itemId: string;
  itemLabel?: string;
  /** Where to go after delete. Omit to stay on the current page (or /dashboard from an item page). */
  redirectTo?: string;
  className?: string;
  variant?: "button" | "link";
}

function resolveRedirectAfterDelete(pathname: string, redirectTo?: string): string | null {
  if (redirectTo !== undefined) return redirectTo;

  const isItemDetailPage =
    /^\/items\/[^/]+$/.test(pathname) &&
    pathname !== "/items/new" &&
    pathname !== "/items/batch";

  if (isItemDetailPage) return "/dashboard";

  return null;
}

export function DeleteItemButton({
  itemId,
  itemLabel = "this item",
  redirectTo,
  className = "",
  variant = "button",
}: DeleteItemButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete "${itemLabel}"? This removes the listing draft, photos, and evaluation data. This cannot be undone.`;
    if (!confirm(message)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");

      const target = resolveRedirectAfterDelete(pathname, redirectTo);
      if (target) router.push(target);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className={`text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 ${className}`}
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      loading={loading}
      onClick={handleDelete}
      className={className}
    >
      Delete
    </Button>
  );
}
