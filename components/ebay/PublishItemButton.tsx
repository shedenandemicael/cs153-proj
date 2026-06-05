"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PublishItemButton({
  itemId,
  disabled,
  variant = "secondary",
  className = "",
  onPublished,
}: {
  itemId: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  onPublished?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePublish() {
    setLoading(true);
    try {
      const res = await fetch("/api/items/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: [itemId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");

      const result = data.results?.[0];
      if (result && !result.ok) {
        throw new Error(result.error ?? "Publish failed");
      }

      onPublished?.();
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      className={`px-3 py-1.5 text-xs ${className}`}
      loading={loading}
      disabled={disabled || loading}
      onClick={handlePublish}
    >
      Publish
    </Button>
  );
}
