import { BatchIntakeForm } from "@/components/items/BatchIntakeForm";

export default function BatchUploadPage() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--spot)]">Batch</p>
      <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Upload many items</h1>
      <p className="mb-6 text-[var(--muted)]">
        Add all your photos at once. Spot will help you split them into separate listings.
      </p>
      <BatchIntakeForm />
    </div>
  );
}
