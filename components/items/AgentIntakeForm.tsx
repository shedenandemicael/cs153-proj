"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export function AgentIntakeForm() {
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
      if (!res.ok && !data.item) {
        throw new Error(data.error ?? "Agent run failed");
      }
      if (data.agent?.awaitingInput) {
        router.push(`/items/${data.item.id}`);
        router.refresh();
        return;
      }
      router.push(`/items/${data.item.id}`);
      router.refresh();
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <section>
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            required
            onChange={handleFileChange}
            className="block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--spot-light)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--spot-dark)] hover:file:bg-[var(--spot-glow)]"
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
            <Label htmlFor="brand">Brand (optional)</Label>
            <Input id="brand" name="brand" placeholder="Agent can infer from photos" />
          </div>
          <div>
            <Label htmlFor="size">Size (optional)</Label>
            <Input id="size" name="size" />
          </div>
          <div>
            <Label htmlFor="minPrice">Minimum price ($)</Label>
            <Input id="minPrice" name="minPrice" type="number" step="0.01" min="0" />
          </div>
          <div>
            <Label htmlFor="purchasePrice">Your cost ($)</Label>
            <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" min="0" />
          </div>
        </div>

        <section>
          <Label htmlFor="freeformNotes">Notes (optional)</Label>
          <Textarea id="freeformNotes" name="freeformNotes" rows={2} placeholder="Defects, model, etc." />
        </section>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Working…" : "List this item"}
        </Button>
      </form>
    </Card>
  );
}
