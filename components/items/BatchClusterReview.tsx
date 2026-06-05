"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BatchImageCluster } from "@/lib/ai/cluster-batch-images";

export type ClusterDraft = BatchImageCluster & { id: string };

function newId() {
  return crypto.randomUUID();
}

export function clustersToDrafts(clusters: BatchImageCluster[]): ClusterDraft[] {
  return clusters.map((c) => ({ ...c, id: newId() }));
}

export function draftsToClusters(drafts: ClusterDraft[]): BatchImageCluster[] {
  return drafts.map(({ label, imageIndices, heroIndex }) => ({
    label,
    imageIndices,
    heroIndex,
  }));
}

function fixHeroIndex(cluster: ClusterDraft): ClusterDraft {
  const len = cluster.imageIndices.length;
  if (len === 0) return { ...cluster, heroIndex: 0 };
  const hero = cluster.heroIndex >= 0 && cluster.heroIndex < len ? cluster.heroIndex : 0;
  return { ...cluster, heroIndex: hero };
}

export function moveImageToCluster(
  drafts: ClusterDraft[],
  imageIndex: number,
  targetClusterId: string
): ClusterDraft[] {
  const without = drafts.map((c) => {
    const pos = c.imageIndices.indexOf(imageIndex);
    if (pos === -1) return c;
    const nextIndices = c.imageIndices.filter((i) => i !== imageIndex);
    let heroIndex = c.heroIndex;
    if (pos === heroIndex) heroIndex = 0;
    else if (pos < heroIndex) heroIndex = Math.max(0, heroIndex - 1);
    return fixHeroIndex({ ...c, imageIndices: nextIndices, heroIndex });
  });

  return without.map((c) => {
    if (c.id !== targetClusterId) return c;
    const nextIndices = [...c.imageIndices, imageIndex];
    return fixHeroIndex({ ...c, imageIndices: nextIndices });
  });
}

export function setClusterHero(drafts: ClusterDraft[], clusterId: string, localIndex: number): ClusterDraft[] {
  return drafts.map((c) =>
    c.id === clusterId ? fixHeroIndex({ ...c, heroIndex: localIndex }) : c
  );
}

export function addEmptyCluster(drafts: ClusterDraft[]): ClusterDraft[] {
  return [
    ...drafts,
    {
      id: newId(),
      label: `Item ${drafts.length + 1}`,
      imageIndices: [],
      heroIndex: 0,
    },
  ];
}

export function updateClusterLabel(drafts: ClusterDraft[], clusterId: string, label: string): ClusterDraft[] {
  return drafts.map((c) => (c.id === clusterId ? { ...c, label } : c));
}

interface BatchClusterReviewProps {
  previews: string[];
  clusters: ClusterDraft[];
  onClustersChange: (next: ClusterDraft[]) => void;
  onBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
  maxItems?: number;
}

export function BatchClusterReview({
  previews,
  clusters,
  onClustersChange,
  onBack,
  onConfirm,
  loading,
  maxItems = 10,
}: BatchClusterReviewProps) {
  const nonEmpty = clusters.filter((c) => c.imageIndices.length > 0);
  const itemCount = nonEmpty.length;

  const allAssigned = useMemo(() => {
    const seen = new Set<number>();
    for (const c of clusters) {
      for (const i of c.imageIndices) seen.add(i);
    }
    return seen.size === previews.length;
  }, [clusters, previews.length]);

  const canConfirm = itemCount > 0 && itemCount <= maxItems && allAssigned && !loading;

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Confirm your items</h2>
        <p className="mt-1 text-sm text-slate-500">
          Spot grouped {previews.length} photo{previews.length === 1 ? "" : "s"} into{" "}
          <span className="font-medium text-slate-700">
            {itemCount} listing{itemCount === 1 ? "" : "s"}
          </span>
          . Drag photos between items or pick a cover photo — then confirm.
        </p>
      </div>

      <div className="space-y-4">
        {clusters.map((cluster, clusterIdx) => {
          if (cluster.imageIndices.length === 0) return null;

          return (
            <div
              key={cluster.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--spot,#6488ea)] text-sm font-semibold text-white">
                  {clusterIdx + 1}
                </span>
                <input
                  type="text"
                  value={cluster.label}
                  onChange={(e) =>
                    onClustersChange(updateClusterLabel(clusters, cluster.id, e.target.value))
                  }
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-[var(--spot,#6488ea)] focus:outline-none focus:ring-1 focus:ring-[var(--spot,#6488ea)]"
                  aria-label={`Item ${clusterIdx + 1} name`}
                />
                <span className="text-xs text-slate-400">
                  {cluster.imageIndices.length} photo
                  {cluster.imageIndices.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {cluster.imageIndices.map((globalIdx, localIdx) => {
                  const isHero = localIdx === cluster.heroIndex;
                  return (
                    <div key={globalIdx} className="group relative w-20 sm:w-24">
                      <button
                        type="button"
                        onClick={() =>
                          onClustersChange(setClusterHero(clusters, cluster.id, localIdx))
                        }
                        className={`block w-full overflow-hidden rounded-lg border-2 transition ${
                          isHero
                            ? "border-[var(--spot,#6488ea)] ring-2 ring-[var(--spot,#6488ea)]/30"
                            : "border-transparent hover:border-slate-300"
                        }`}
                        title={isHero ? "Cover photo" : "Set as cover photo"}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previews[globalIdx]}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                      </button>
                      {isHero && (
                        <span className="pointer-events-none absolute left-1 top-1 rounded bg-[var(--spot,#6488ea)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Cover
                        </span>
                      )}
                      <select
                        className="mt-1 w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-600"
                        value={cluster.id}
                        onChange={(e) =>
                          onClustersChange(
                            moveImageToCluster(clusters, globalIdx, e.target.value)
                          )
                        }
                        aria-label={`Move photo ${globalIdx + 1}`}
                      >
                        {clusters.map((c, i) => (
                          <option key={c.id} value={c.id}>
                            {c.imageIndices.length === 0
                              ? `New item ${i + 1}`
                              : `Item ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {itemCount > maxItems && (
        <p className="mt-3 text-sm text-amber-700">
          Maximum {maxItems} listings per batch. Merge some groups or remove photos.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onClustersChange(addEmptyCluster(clusters))}
          disabled={loading || clusters.length >= maxItems}
        >
          + Add item
        </Button>
        <Button type="button" className="ml-auto" onClick={onConfirm} disabled={!canConfirm}>
          {loading ? "Starting…" : `Looks good — list ${itemCount} item${itemCount === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Card>
  );
}
