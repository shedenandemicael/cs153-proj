"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { PricingInsight } from "@/components/items/PricingInsight";
import type { ListingDraftFormData } from "@/types";

interface ReviewFormProps {
  itemId: string;
  draft: ListingDraftFormData & {
    confidenceScore: number;
    warnings: string[];
    questions: string[];
    status: string;
    pricingRationale?: string | null;
    pricingMethod?: string | null;
  };
  canPublish: boolean;
  publishDisabledReason?: string;
}

export function ReviewForm({
  itemId,
  draft,
  canPublish,
  publishDisabledReason,
}: ReviewFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(draft);
  const [bulletsText, setBulletsText] = useState(draft.descriptionBullets.join("\n"));
  const [specificsText, setSpecificsText] = useState(
    Object.entries(draft.itemSpecifics)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n")
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const displayWarnings = form.warnings.filter((w) => !w.startsWith("Pricing ("));

  async function saveDraft(approve: boolean) {
    setLoading(approve ? "approve" : "save");
    setError(null);
    setMessage(null);

    const descriptionBullets = bulletsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const itemSpecifics: Record<string, string> = {};
    specificsText.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        itemSpecifics[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    try {
      const res = await fetch(`/api/items/${itemId}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          descriptionBullets,
          itemSpecifics,
          approve,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      setMessage(approve ? "Draft approved." : "Draft saved.");
      if (approve) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(null);
    }
  }

  async function regenerate() {
    setLoading("regenerate");
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/generate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Regeneration failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    setLoading("reject");
    try {
      const res = await fetch(`/api/items/${itemId}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reject: true }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setLoading(null);
    }
  }

  async function publish() {
    if (!canPublish) return;
    if (!confirm("Publish this listing draft to eBay sandbox? You must confirm explicitly.")) {
      return;
    }
    setLoading("publish");
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setMessage(data.message ?? "Published to sandbox.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Listing draft</h2>
          <div className="flex items-center gap-2">
            <Badge status={draft.status} />
            <span className="text-sm text-slate-500">
              Confidence: {Math.round(form.confidenceScore * 100)}%
            </span>
          </div>
        </div>

        <PricingInsight rationale={draft.pricingRationale} method={draft.pricingMethod} />

        {(displayWarnings.length > 0 || form.questions.length > 0) && (
          <div className="mb-4 space-y-2">
            {displayWarnings.map((w, i) => (
              <Alert key={`w-${i}`} variant="warning">
                {w}
              </Alert>
            ))}
            {form.questions.map((q, i) => (
              <Alert key={`q-${i}`} variant="info">
                <strong>Question:</strong> {q}
              </Alert>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="bullets">Description (one bullet per line)</Label>
            <Textarea
              id="bullets"
              rows={6}
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="specifics">Item specifics (Key: Value per line)</Label>
            <Textarea
              id="specifics"
              rows={4}
              value={specificsText}
              onChange={(e) => setSpecificsText(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="conditionDesc">Condition description</Label>
            <Textarea
              id="conditionDesc"
              rows={2}
              value={form.conditionDesc}
              onChange={(e) => setForm({ ...form, conditionDesc: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="categoryName">Category</Label>
              <Input
                id="categoryName"
                value={form.categoryName ?? ""}
                onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="shipping">Shipping assumptions</Label>
              <Input
                id="shipping"
                value={form.shippingAssumptions ?? ""}
                onChange={(e) => setForm({ ...form, shippingAssumptions: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="startingPrice">Starting price ($)</Label>
              <Input
                id="startingPrice"
                type="number"
                step="0.01"
                value={form.startingPrice}
                onChange={(e) =>
                  setForm({ ...form, startingPrice: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="buyItNowPrice">Buy It Now ($)</Label>
              <Input
                id="buyItNowPrice"
                type="number"
                step="0.01"
                value={form.buyItNowPrice ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    buyItNowPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" loading={loading === "save"} onClick={() => saveDraft(false)}>
            Save edits
          </Button>
          <Button loading={loading === "approve"} onClick={() => saveDraft(true)}>
            Approve draft
          </Button>
          <Button variant="secondary" loading={loading === "regenerate"} onClick={regenerate}>
            Regenerate
          </Button>
          <Button variant="danger" loading={loading === "reject"} onClick={reject}>
            Reject
          </Button>
          <Button
            variant="primary"
            disabled={!canPublish}
            loading={loading === "publish"}
            onClick={publish}
            title={publishDisabledReason}
          >
            Publish to eBay
          </Button>
        </div>
        {!canPublish && publishDisabledReason && (
          <p className="mt-2 text-xs text-slate-500">{publishDisabledReason}</p>
        )}
      </Card>
    </div>
  );
}
