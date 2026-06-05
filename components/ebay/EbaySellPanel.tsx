"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

interface SellStatus {
  publishEnabled: boolean;
  connected: boolean;
  environment: string;
  username?: string | null;
  hint?: string;
}

export function EbaySellPanel({
  itemId,
  itemStatus,
  draftStatus,
}: {
  itemId: string;
  itemStatus: string;
  draftStatus?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SellStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/ebay/sell/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const ebay = searchParams.get("ebay");
    if (ebay === "connected") {
      setMessage("eBay sandbox account connected.");
      loadStatus();
      router.replace(`/items/${itemId}`);
    }
  }, [searchParams, itemId, router, loadStatus]);

  function connect() {
    const returnTo = encodeURIComponent(`/items/${itemId}`);
    window.location.href = `/api/ebay/auth?returnTo=${returnTo}`;
  }

  async function disconnect() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/ebay/sell/disconnect", { method: "POST" });
      setMessage("Disconnected eBay sandbox account.");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (
      !confirm(
        "Publish this listing to eBay sandbox? It will create a real sandbox listing using your connected seller account."
      )
    ) {
      return;
    }
    setPublishLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${itemId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setMessage(data.message ?? "Published to eBay sandbox.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishLoading(false);
    }
  }

  const canPublishNow =
    status?.publishEnabled &&
    draftStatus === "APPROVED" &&
    (itemStatus === "READY" || itemStatus === "GENERATED" || itemStatus === "REVIEWED");

  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-900">eBay sandbox publish</h3>
      <p className="mt-1 text-sm text-slate-600">
        Connect a sandbox seller account, then publish the approved draft to eBay (Inventory + Offer
        APIs).
      </p>

      {status && (
        <p className="mt-2 text-sm text-slate-700">
          {status.connected
            ? `Connected${status.username ? ` as ${status.username}` : ""} (${status.environment})`
            : `Not connected — ${status.hint ?? "connect below"}`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status?.connected ? (
          <Button variant="secondary" loading={loading} onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button variant="secondary" onClick={connect}>
            Connect eBay Sandbox
          </Button>
        )}
        <Button
          loading={publishLoading}
          disabled={!canPublishNow}
          onClick={publish}
          title={
            !canPublishNow
              ? "Requires connected sandbox account and an approved agent draft"
              : undefined
          }
        >
          Publish to eBay
        </Button>
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

      {itemStatus === "PUBLISHED" && (
        <p className="mt-2 text-xs text-slate-500">This item is already marked as published.</p>
      )}
    </Card>
  );
}
