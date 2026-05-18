"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import {
  BatchOptionsModal,
  type BatchOptions,
} from "@/components/items/BatchOptionsModal";

const MAX_PHOTOS = 30;
const MAX_LISTINGS = 10;

export function BatchIntakeForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const revokePreviews = useCallback((urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function setFilesWithPreviews(newFiles: File[]) {
    setPreviews((prev) => {
      revokePreviews(prev);
      return newFiles.map((f) => URL.createObjectURL(f));
    });
    setFiles(newFiles);
  }

  function addFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    const merged = [...files, ...images].slice(0, MAX_PHOTOS);
    setFilesWithPreviews(merged);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  }

  function removePhoto(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFilesWithPreviews(next);
  }

  function openModal() {
    if (files.length === 0) {
      setError("Add at least one photo.");
      return;
    }
    setError(null);
    setModalOpen(true);
  }

  async function submitBatch(options: BatchOptions) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    formData.append("meta[splitMode]", options.splitMode);
    if (options.brand) formData.append("meta[brand]", options.brand);
    if (options.size) formData.append("meta[size]", options.size);
    if (options.condition) formData.append("meta[condition]", options.condition);
    if (options.defects) formData.append("meta[defects]", options.defects);
    if (options.minPrice) formData.append("meta[minPrice]", options.minPrice);
    if (options.purchasePrice) formData.append("meta[purchasePrice]", options.purchasePrice);
    if (options.freeformNotes) formData.append("meta[freeformNotes]", options.freeformNotes);

    try {
      const res = await fetch("/api/items/batch", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Batch failed");
      setModalOpen(false);
      router.push(`/items/batch/${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50/80"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <p className="text-lg font-medium text-slate-900">Drop photos here</p>
          <p className="mt-1 text-sm text-slate-500">
            or select many at once — up to {MAX_PHOTOS} images
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => inputRef.current?.click()}
          >
            Choose photos
          </Button>
        </div>

        {files.length > 0 && (
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">
                {files.length} photo{files.length === 1 ? "" : "s"} selected
              </p>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setFilesWithPreviews([])}
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {previews.map((src, i) => (
                <div key={src} className="group relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="button" className="mt-4 w-full sm:w-auto" onClick={openModal}>
              Continue
            </Button>
          </div>
        )}
      </Card>

      <BatchOptionsModal
        open={modalOpen}
        photoCount={files.length}
        maxListings={MAX_LISTINGS}
        maxPhotos={MAX_PHOTOS}
        onClose={() => !loading && setModalOpen(false)}
        onConfirm={submitBatch}
        loading={loading}
      />
    </>
  );
}
