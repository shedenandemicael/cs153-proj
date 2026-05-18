import { BatchIntakeForm } from "@/components/items/BatchIntakeForm";

export default function BatchUploadPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Batch upload</h1>
      <p className="mb-6 text-slate-600">
        Add all your photos in one go. We&apos;ll ask how to split them into listings in the next
        step.
      </p>
      <BatchIntakeForm />
    </div>
  );
}
