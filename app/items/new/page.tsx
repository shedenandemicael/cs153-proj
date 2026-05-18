import { AgentIntakeForm } from "@/components/items/AgentIntakeForm";

export default function NewItemPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Autonomous listing agent</h1>
      <p className="mb-6 text-slate-600">
        Submit item photos. The agent handles research, pricing, copy, approval, and optional
        publish without manual review.
      </p>
      <AgentIntakeForm />
    </div>
  );
}
