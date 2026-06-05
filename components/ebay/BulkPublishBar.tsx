"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface SellStatus {
  publishEnabled: boolean;
  connected: boolean;
  policiesReady?: boolean;
  hint?: string;
}

export function BulkPublishBar({
  publishableItemIds,
  returnTo,
  onComplete,
}: {
  publishableItemIds: string[];
  returnTo: string;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SellStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const count = publishableItemIds.length;

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/ebay/sell/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const onFocus = () => loadStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadStatus]);

  function connect() {
    const tab = window.open(
      `/api/ebay/auth?returnTo=${encodeURIComponent(returnTo)}`,
      "_blank",
      "noopener,noreferrer"
    );
    if (!tab) setError("Allow popups to connect eBay.");
  }

  async function setupPolicies() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ebay/sell/setup-policies", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function publishAll() {
    if (count === 0) return;
    if (!confirm(`Publish ${count} listing${count === 1 ? "" : "s"} to eBay sandbox?`)) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/items/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: publishableItemIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");

      const failed = data.results?.filter((r: { ok: boolean }) => !r.ok) ?? [];
      if (failed.length > 0) {
        const detail = failed
          .map((r: { itemId: string; error?: string }) => r.error ?? r.itemId)
          .slice(0, 3)
          .join("; ");
        setError(
          `Published ${data.published ?? 0}, failed ${failed.length}.${detail ? ` ${detail}` : ""}`
        );
      } else {
        setMessage(data.message ?? `Published ${data.published} listing(s).`);
      }

      onComplete?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  if (count === 0 && status?.connected) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Publish to eBay</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {count > 0
              ? `${count} listing${count === 1 ? "" : "s"} ready to publish`
              : status?.connected
                ? "No listings ready yet"
                : "Connect eBay once to publish from here"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!status?.connected ? (
            <Button variant="secondary" onClick={connect}>
              Connect eBay
            </Button>
          ) : (
            <>
              {status.policiesReady === false ? (
                <Button variant="secondary" loading={loading} onClick={setupPolicies}>
                  Finish setup
                </Button>
              ) : null}
              <Button
                loading={loading}
                disabled={!status.publishEnabled || count === 0}
                onClick={publishAll}
              >
                Publish all ready{count > 0 ? ` (${count})` : ""}
              </Button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-3">
          <Alert variant="success">{message}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {status?.hint && !status.connected ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{status.hint}</p>
      ) : null}
    </div>
  );
}
