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
  hint?: string;
}

export function EbaySellPanel({
  itemId,
  itemStatus,
  draftStatus,
  savedListingUrl,
}: {
  itemId: string;
  itemStatus: string;
  draftStatus?: string;
  savedListingUrl?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SellStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [listingUrl, setListingUrl] = useState<string | null>(savedListingUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/ebay/sell/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    setListingUrl(savedListingUrl ?? null);
  }, [savedListingUrl]);

  useEffect(() => {
    if (searchParams.get("ebay") === "connected") {
      loadStatus();
      router.replace(`/items/${itemId}`);
    }
  }, [searchParams, itemId, router, loadStatus]);

  useEffect(() => {
    const onFocus = () => loadStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadStatus]);

  function connect() {
    const tab = window.open(
      `/api/ebay/auth?returnTo=${encodeURIComponent(`/items/${itemId}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
    if (!tab) setError("Allow popups to connect eBay.");
  }

  async function setupPolicies() {
    setSetupLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ebay/sell/setup-policies", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSetupLoading(false);
    }
  }

  async function publish() {
    if (!confirm("Publish this listing to eBay sandbox?")) return;
    setPublishLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${itemId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      if (typeof data.listingUrl === "string") setListingUrl(data.listingUrl);
      setMessage("Live on eBay.");
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
    !listingUrl &&
    (itemStatus === "READY" || itemStatus === "GENERATED" || itemStatus === "REVIEWED");

  if (listingUrl) {
    return (
      <Card className="min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">Listed on eBay</p>
        <a
          href={listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-medium text-[var(--spot)] hover:text-[var(--spot-dark)] hover:underline"
        >
          View on eBay →
        </a>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <p className="text-sm font-medium text-[var(--foreground)]">Publish to eBay</p>

      {!status?.connected ? (
        <p className="mt-1 text-sm text-[var(--muted)]">Connect once, then publish any ready listing.</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!status?.connected ? (
          <Button variant="secondary" onClick={connect}>
            Connect eBay
          </Button>
        ) : (
          <>
            {status.policiesReady === false ? (
              <Button variant="secondary" loading={setupLoading} onClick={setupPolicies}>
                Finish setup
              </Button>
            ) : null}
            <Button loading={publishLoading} disabled={!canPublishNow} onClick={publish}>
              Publish
            </Button>
          </>
        )}
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
    </Card>
  );
}
