"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export function IntakeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/items", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create item");

      const genRes = await fetch(`/api/items/${data.item.id}/generate`, { method: "POST" });
      if (!genRes.ok) {
        const genData = await genRes.json();
        throw new Error(genData.error ?? "Failed to generate listing");
      }

      router.push(`/items/${data.item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Item photos</h2>
          <p className="mt-1 text-sm text-slate-500">Upload 1–5 photos of the item.</p>
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            required
            onChange={handleFileChange}
            className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          {previews.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" placeholder="e.g. Nike" />
          </div>
          <div>
            <Label htmlFor="size">Size</Label>
            <Input id="size" name="size" placeholder="e.g. M / 10" />
          </div>
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Input id="condition" name="condition" placeholder="e.g. Used - Good" />
          </div>
          <div>
            <Label htmlFor="defects">Defects / wear</Label>
            <Input id="defects" name="defects" placeholder="e.g. small stain on sleeve" />
          </div>
          <div>
            <Label htmlFor="purchasePrice">Purchase price ($)</Label>
            <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" min="0" />
          </div>
          <div>
            <Label htmlFor="minPrice">Minimum acceptable price ($)</Label>
            <Input id="minPrice" name="minPrice" type="number" step="0.01" min="0" />
          </div>
        </div>

        <section>
          <Label htmlFor="freeformNotes">Additional notes</Label>
          <Textarea
            id="freeformNotes"
            name="freeformNotes"
            rows={3}
            placeholder="Anything else the agent should know..."
          />
        </section>

        {error && <Alert variant="error">{error}</Alert>}

        <Alert variant="info">
          Photos and notes are stored locally. Listing generation uses a mock AI provider until you
          configure a real LLM. Nothing is published to eBay without your explicit approval.
        </Alert>

        <Button type="submit" loading={loading}>
          Create item & generate draft
        </Button>
      </form>
    </Card>
  );
}
