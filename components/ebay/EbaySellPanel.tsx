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
  policiesReady?: boolean;
  policyCounts?: { payment: number; return: number; fulfillment: number };
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
  const [setupLoading, setSetupLoading] = useState(false);
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

  useEffect(() => {
    const onFocus = () => {
      loadStatus();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadStatus]);

  function connect() {
    const returnTo = encodeURIComponent(`/items/${itemId}`);
    const url = `/api/ebay/auth?returnTo=${returnTo}`;
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) {
      setError("Popup blocked — allow popups for this site or try again.");
      return;
    }
    setError(null);
    setMessage("Complete sign-in in the new tab, then return to this page.");
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

  async function setupPolicies() {
    setSetupLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/ebay/sell/setup-policies", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Policy setup failed");
      setMessage(data.message ?? "Sandbox business policies are ready.");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy setup failed");
    } finally {
      setSetupLoading(false);
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
        Connect a sandbox seller account. Business policies (payment, return, shipping) are created
        automatically via the eBay API — no Seller Hub required.
      </p>

      {status && (
        <p className="mt-2 text-sm text-slate-700">
          {status.connected
            ? `Connected${status.username ? ` as ${status.username}` : ""} (${status.environment})${
                status.policiesReady
                  ? " — business policies ready"
                  : status.policyCounts
                    ? ` — policies: payment ${status.policyCounts.payment}, return ${status.policyCounts.return}, shipping ${status.policyCounts.fulfillment}`
                    : ""
              }`
            : `Not connected — ${status.hint ?? "connect below"}`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status?.connected && !status.policiesReady ? (
          <Button variant="secondary" loading={setupLoading} onClick={setupPolicies}>
            Set up sandbox policies
          </Button>
        ) : null}
        {status?.connected ? (
          <Button variant="secondary" loading={loading} onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <Button variant="secondary" onClick={connect} title="Opens eBay sign-in in a new tab">
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
