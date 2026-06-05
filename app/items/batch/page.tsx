import { BatchIntakeForm } from "@/components/items/BatchIntakeForm";

export default function BatchUploadPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--foreground)]">Batch upload</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Drop all your photos — Spot groups them into listings and picks the best cover shot for each.
      </p>
      <BatchIntakeForm />
    </div>
  );
}
