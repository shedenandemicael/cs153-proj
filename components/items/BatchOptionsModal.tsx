"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

export type BatchSplitMode = "single" | "per_image";

export interface BatchOptions {
  splitMode: BatchSplitMode;
  brand?: string;
  size?: string;
  condition?: string;
  defects?: string;
  minPrice?: string;
  purchasePrice?: string;
  freeformNotes?: string;
}

interface BatchOptionsModalProps {
  open: boolean;
  photoCount: number;
  maxListings: number;
  maxPhotos: number;
  onClose: () => void;
  onConfirm: (options: BatchOptions) => void;
  loading?: boolean;
}

export function BatchOptionsModal({
  open,
  photoCount,
  maxListings,
  maxPhotos,
  onClose,
  onConfirm,
  loading,
}: BatchOptionsModalProps) {
  const [splitMode, setSplitMode] = useState<BatchSplitMode>("per_image");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [defects, setDefects] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const listingCount =
    splitMode === "single" ? 1 : Math.min(photoCount, maxListings);
  const overLimitPerPhoto = splitMode === "per_image" && photoCount > maxListings;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 id="batch-modal-title" className="text-lg font-semibold text-slate-900">
          How should we list these?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {photoCount} photo{photoCount === 1 ? "" : "s"} selected. The agent can infer details from
          images — only add notes if you want.
        </p>

        <fieldset className="mt-5 space-y-3">
          <legend className="text-sm font-medium text-slate-800">Listing layout</legend>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
            <input
              type="radio"
              name="splitMode"
              checked={splitMode === "per_image"}
              onChange={() => setSplitMode("per_image")}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-slate-900">One listing per photo</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Creates {Math.min(photoCount, maxListings)} separate listing
                {Math.min(photoCount, maxListings) === 1 ? "" : "s"}
                {overLimitPerPhoto && ` (max ${maxListings} at a time)`}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
            <input
              type="radio"
              name="splitMode"
              checked={splitMode === "single"}
              onChange={() => setSplitMode("single")}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-slate-900">One listing for all photos</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                All photos on a single item (up to {Math.min(photoCount, 10)} used)
              </span>
            </span>
          </label>
        </fieldset>

        <p className="mt-4 text-sm text-slate-600">
          Agent will process <strong>{listingCount}</strong> listing
          {listingCount === 1 ? "" : "s"} autonomously.
        </p>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Optional details (skip if unsure)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="batch-brand">Brand</Label>
              <Input
                id="batch-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Agent can detect"
              />
            </div>
            <div>
              <Label htmlFor="batch-size">Size</Label>
              <Input id="batch-size" value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="batch-condition">Condition</Label>
              <Input
                id="batch-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="batch-min">Min price ($)</Label>
              <Input
                id="batch-min"
                type="number"
                step="0.01"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="batch-notes">Notes</Label>
              <Textarea
                id="batch-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Defects, model number, etc."
              />
            </div>
          </div>
        </details>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={loading}
            onClick={() =>
              onConfirm({
                splitMode,
                brand: brand || undefined,
                size: size || undefined,
                condition: condition || undefined,
                defects: defects || undefined,
                minPrice: minPrice || undefined,
                purchasePrice: purchasePrice || undefined,
                freeformNotes: notes || undefined,
              })
            }
          >
            Run agent
          </Button>
        </div>
      </div>
    </div>
  );
}
