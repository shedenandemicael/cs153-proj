"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface EvaluationPanelProps {
  itemId: string;
  metrics: {
    timeSavedMinutes: number;
    fieldsGenerated: number;
    fieldsEditedByUser: number;
    qualityScore: number | null;
    qualityNotes: string | null;
  };
}

export function EvaluationPanel({ itemId, metrics }: EvaluationPanelProps) {
  const [scores, setScores] = useState({
    titleClarity: 4,
    descriptionCompleteness: 4,
    pricingReasonableness: 4,
    categoryAccuracy: 4,
  });
  const [notes, setNotes] = useState(metrics.qualityNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overall =
    (scores.titleClarity +
      scores.descriptionCompleteness +
      scores.pricingReasonableness +
      scores.categoryAccuracy) /
    4;

  async function handleSave() {
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/evaluation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores, notes, overall }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save evaluation");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const rubricLabels = [
    { key: "titleClarity" as const, label: "Title clarity (1–5)" },
    { key: "descriptionCompleteness" as const, label: "Description completeness (1–5)" },
    { key: "pricingReasonableness" as const, label: "Pricing reasonableness (1–5)" },
    { key: "categoryAccuracy" as const, label: "Category accuracy (1–5)" },
  ];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">CS153 evaluation</h2>
      <p className="mt-1 text-sm text-slate-500">
        Track automation value and listing quality for your project report.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-500">Est. time saved</dt>
          <dd className="text-xl font-semibold">{metrics.timeSavedMinutes} min</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-500">Fields generated</dt>
          <dd className="text-xl font-semibold">{metrics.fieldsGenerated}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-500">User edits before approval</dt>
          <dd className="text-xl font-semibold">{metrics.fieldsEditedByUser}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-4">
        <h3 className="font-medium text-slate-800">Listing quality rubric</h3>
        {rubricLabels.map(({ key, label }) => (
          <div key={key}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type="number"
              min={1}
              max={5}
              value={scores[key]}
              onChange={(e) =>
                setScores({ ...scores, [key]: Math.min(5, Math.max(1, Number(e.target.value))) })
              }
            />
          </div>
        ))}
        <p className="text-sm text-slate-600">
          Overall quality score: <strong>{overall.toFixed(1)}</strong> / 5
          {metrics.qualityScore != null && (
            <span className="text-slate-400"> (saved: {metrics.qualityScore.toFixed(1)})</span>
          )}
        </p>
        <div>
          <Label htmlFor="evalNotes">Notes</Label>
          <Textarea id="evalNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Evaluation saved.</Alert>}

      <Button className="mt-4" onClick={handleSave}>
        Save evaluation
      </Button>
    </Card>
  );
}
