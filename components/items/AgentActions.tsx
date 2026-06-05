"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DeleteItemButton } from "@/components/items/DeleteItemButton";

export function AgentActions({
  itemId,
  itemLabel,
  publishedOnEbay = false,
}: {
  itemId: string;
  itemLabel: string;
  publishedOnEbay?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function rerun() {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}/run`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Re-run failed");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Re-run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" loading={loading} onClick={rerun}>
        Re-run agent
      </Button>
      <DeleteItemButton
        itemId={itemId}
        itemLabel={itemLabel}
        publishedOnEbay={publishedOnEbay}
        variant="button"
      />
    </div>
  );
}
