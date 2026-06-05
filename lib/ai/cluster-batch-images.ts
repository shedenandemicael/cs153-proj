import { encodeFilesForVision } from "./encode-image-files";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export interface BatchImageCluster {
  label: string;
  imageIndices: number[];
  /** Index into imageIndices — best photo for the listing cover */
  heroIndex: number;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

const CLUSTER_SYSTEM_PROMPT = `You group product photos for eBay resale listings.

Rules:
- Photos of the SAME physical item belong in one cluster (different angles, tags, box, detail shots).
- Photos of DIFFERENT items must be in separate clusters.
- Each image index (0 to N-1) must appear in exactly one cluster.
- label: short name for the item (brand + product type when visible).
- heroIndex: index within that cluster's imageIndices for the BEST listing cover photo (clearest full-item view, good lighting).
- Prefer fewer clusters when unsure — only split when clearly different products.
- Output valid JSON only.`;

function buildClusterUserPrompt(imageCount: number): string {
  return [
    `You are given ${imageCount} numbered photos (Image 0 through Image ${imageCount - 1}).`,
    "Group them into distinct products for separate eBay listings.",
    "",
    "Return JSON:",
    `{`,
    `  "clusters": [`,
    `    {`,
    `      "label": "short item name",`,
    `      "imageIndices": [0, 1],`,
    `      "heroIndex": 0`,
    `    }`,
    `  ]`,
    `}`,
  ].join("\n");
}

function fallbackClusters(imageCount: number): BatchImageCluster[] {
  if (imageCount <= 1) {
    return [{ label: "Item 1", imageIndices: [0], heroIndex: 0 }];
  }
  return Array.from({ length: imageCount }, (_, i) => ({
    label: `Item ${i + 1}`,
    imageIndices: [i],
    heroIndex: 0,
  }));
}

function normalizeClusters(raw: unknown, imageCount: number): BatchImageCluster[] | null {
  if (!raw || typeof raw !== "object") return null;
  const clusters = (raw as { clusters?: unknown }).clusters;
  if (!Array.isArray(clusters) || clusters.length === 0) return null;

  const assigned = new Set<number>();
  const result: BatchImageCluster[] = [];

  for (const entry of clusters) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    const indices = Array.isArray(obj.imageIndices)
      ? obj.imageIndices.filter((v): v is number => typeof v === "number" && v >= 0 && v < imageCount)
      : [];
    const unique = [...new Set(indices)].filter((i) => !assigned.has(i));
    if (unique.length === 0) continue;
    unique.forEach((i) => assigned.add(i));

    const label =
      typeof obj.label === "string" && obj.label.trim() ? obj.label.trim() : `Item ${result.length + 1}`;
    let heroIndex = typeof obj.heroIndex === "number" ? obj.heroIndex : 0;
    if (heroIndex < 0 || heroIndex >= unique.length) heroIndex = 0;

    result.push({ label, imageIndices: unique, heroIndex });
  }

  for (let i = 0; i < imageCount; i++) {
    if (!assigned.has(i)) {
      result.push({ label: `Item ${result.length + 1}`, imageIndices: [i], heroIndex: 0 });
      assigned.add(i);
    }
  }

  if (assigned.size !== imageCount || result.length === 0) return null;
  if (result.length > 10) return null;

  return result;
}

/** Vision model groups batch photos into distinct products and picks a cover photo per item. */
export async function clusterBatchImages(files: File[]): Promise<BatchImageCluster[]> {
  const imageCount = files.length;
  if (imageCount === 0) return [];
  if (imageCount === 1) return fallbackClusters(1);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallbackClusters(imageCount);

  const encoded = await encodeFilesForVision(files, 30);
  if (encoded.length === 0) return fallbackClusters(imageCount);

  const model =
    process.env.OPENAI_PRICING_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o";

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [{ type: "text", text: buildClusterUserPrompt(encoded.length) }];

  encoded.forEach((img, index) => {
    userContent.push({ type: "text", text: `Image ${index}:` });
    userContent.push({
      type: "image_url",
      image_url: { url: img.dataUrl, detail: "low" },
    });
  });

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLUSTER_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    const body = (await response.json()) as OpenAIChatResponse;
    if (!response.ok) {
      console.warn("[clusterBatchImages] OpenAI error:", body.error?.message ?? response.status);
      return fallbackClusters(imageCount);
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content) return fallbackClusters(imageCount);

    const parsed = normalizeClusters(JSON.parse(content) as unknown, imageCount);
    return parsed ?? fallbackClusters(imageCount);
  } catch (error) {
    console.warn("[clusterBatchImages] failed:", error);
    return fallbackClusters(imageCount);
  }
}

export function orderFilesForCluster(
  files: File[],
  cluster: BatchImageCluster
): File[] {
  const indices = cluster.imageIndices;
  const heroGlobal = indices[cluster.heroIndex] ?? indices[0];
  const rest = indices.filter((i) => i !== heroGlobal);
  return [files[heroGlobal], ...rest.map((i) => files[i])].filter(Boolean);
}
