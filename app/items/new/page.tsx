import { AgentIntakeForm } from "@/components/items/AgentIntakeForm";

export default function NewItemPage() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--spot)]">New listing</p>
      <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Add an item</h1>
      <p className="mb-6 text-[var(--muted)]">
        Upload photos and notes. Spot researches comps, writes the listing, and can publish to eBay
        sandbox when you approve.
      </p>
      <AgentIntakeForm />
    </div>
  );
}
