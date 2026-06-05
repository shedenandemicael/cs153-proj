"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import {
  BatchClusterReview,
  clustersToDrafts,
  draftsToClusters,
  type ClusterDraft,
} from "@/components/items/BatchClusterReview";
import type { BatchImageCluster } from "@/lib/ai/cluster-batch-images";
import {
  compressImagesForBatch,
  formatBytes,
  totalFileBytes,
} from "@/lib/client/compress-batch-images";
import { parseApiJsonResponse } from "@/lib/client/parse-api-response";

const MAX_PHOTOS = 30;
const MAX_LISTINGS = 10;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type Step = "upload" | "preparing" | "clustering" | "review" | "submitting";

export function BatchIntakeForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("upload");
  const [clusters, setClusters] = useState<ClusterDraft[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
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
    setUploadFiles([]);
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

  async function prepareUploadFiles(): Promise<File[]> {
    setStep("preparing");
    const compressed = await compressImagesForBatch(files);
    setUploadFiles(compressed);

    if (totalFileBytes(compressed) > MAX_UPLOAD_BYTES) {
      throw new Error(
        `Prepared upload is ${formatBytes(totalFileBytes(compressed))} — try fewer photos or smaller originals.`
      );
    }

    return compressed;
  }

  async function startClustering() {
    if (files.length === 0) {
      setError("Add at least one photo.");
      return;
    }
    setError(null);

    try {
      const prepared = uploadFiles.length > 0 ? uploadFiles : await prepareUploadFiles();
      setStep("clustering");

      const formData = new FormData();
      prepared.forEach((file) => formData.append("images", file));

      const res = await fetch("/api/items/batch/cluster", { method: "POST", body: formData });
      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error ?? "Could not group photos"));

      const result = data.clusters as BatchImageCluster[];
      setClusters(clustersToDrafts(result));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not group photos");
      setStep("upload");
    }
  }

  function handleBack() {
    setStep("upload");
    setClusters([]);
    setUploadFiles([]);
    setError(null);
  }

  async function submitBatch() {
    setStep("submitting");
    setError(null);

    try {
      const prepared =
        uploadFiles.length > 0 ? uploadFiles : await compressImagesForBatch(files);
      setUploadFiles(prepared);

      if (totalFileBytes(prepared) > MAX_UPLOAD_BYTES) {
        throw new Error(
          `Prepared upload is ${formatBytes(totalFileBytes(prepared))} — try fewer photos or smaller originals.`
        );
      }

      const formData = new FormData();
      prepared.forEach((file) => formData.append("images", file));
      const confirmed = clusters.filter((c) => c.imageIndices.length > 0);
      formData.append("meta[clusters]", JSON.stringify(draftsToClusters(confirmed)));

      const res = await fetch("/api/items/batch", { method: "POST", body: formData });
      const data = await parseApiJsonResponse(res);
      if (!res.ok) throw new Error(String(data.error ?? "Batch failed"));
      router.push(`/items/batch/${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
      setStep("review");
    }
  }

  if (step === "preparing") {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--spot,#6488ea)]" />
        <p className="text-lg font-medium text-slate-900">Preparing photos…</p>
        <p className="mt-1 text-sm text-slate-500">Compressing images for upload</p>
      </Card>
    );
  }

  if (step === "clustering") {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--spot,#6488ea)]" />
        <p className="text-lg font-medium text-slate-900">Spot is grouping your items…</p>
        <p className="mt-1 text-sm text-slate-500">
          Analyzing {files.length} photo{files.length === 1 ? "" : "s"} to find separate products
        </p>
      </Card>
    );
  }

  if (step === "review" || step === "submitting") {
    return (
      <>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <BatchClusterReview
          previews={previews}
          clusters={clusters}
          onClustersChange={setClusters}
          onBack={handleBack}
          onConfirm={submitBatch}
          loading={step === "submitting"}
          maxItems={MAX_LISTINGS}
        />
      </>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragOver ? "border-[var(--spot,#6488ea)] bg-blue-50" : "border-slate-300 bg-slate-50/80"
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
          Upload everything in one go — Spot figures out how many items you have
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
          <Button type="button" className="mt-4 w-full sm:w-auto" onClick={startClustering}>
            Continue
          </Button>
        </div>
      )}
    </Card>
  );
}
