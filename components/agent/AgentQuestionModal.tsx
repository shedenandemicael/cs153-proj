"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { AgentQuestion } from "@/lib/agent/types";

export function AgentQuestionModal({
  itemId,
  questions,
  open,
  onClose,
}: {
  itemId: string;
  questions: AgentQuestion[];
  open: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAnswers({});
      setError(null);
    }
  }, [open, itemId]);

  if (!open || questions.length === 0) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/items/${itemId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit answers");
      }

      onClose?.();
      router.refresh();

      if (data.agent?.awaitingInput && data.agent?.questions?.length) {
        setAnswers({});
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-question-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="agent-question-title" className="text-lg font-semibold text-slate-900">
          Agent needs your input
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Answer below so the agent can search accurate comparables and finish pricing.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {questions.map((q) => (
            <div key={q.id}>
              <Label htmlFor={`answer-${q.id}`}>
                {q.question}
                {q.required ? " *" : ""}
              </Label>
              <Input
                id={`answer-${q.id}`}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                required={q.required}
                className="mt-1"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" loading={loading}>
              {loading ? "Continuing…" : "Continue agent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
