import { AgentIntakeForm } from "@/components/items/AgentIntakeForm";

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Add photos</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--muted)]">
        Spot prices, writes, and lists your item. Optional notes help if anything&apos;s unclear.
      </p>
      <AgentIntakeForm />
    </div>
  );
}
