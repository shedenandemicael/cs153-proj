export interface AgentConfig {
  /** Auto-approve listing when confidence meets threshold */
  autoApprove: boolean;
  confidenceThreshold: number;
  /** Attempt eBay publish when credentials exist (sandbox) */
  autoPublish: boolean;
  publishConfidenceThreshold: number;
  /** Block auto-approve if any warnings contain these substrings */
  blockingWarningPatterns: string[];
  /** Estimated minutes saved per autonomous run (evaluation) */
  timeSavedMinutes: number;
}

export function getAgentConfig(): AgentConfig {
  const threshold = parseFloat(process.env.AGENT_CONFIDENCE_THRESHOLD ?? "0.72");
  const publishThreshold = parseFloat(process.env.AGENT_PUBLISH_CONFIDENCE_THRESHOLD ?? "0.85");

  return {
    autoApprove: process.env.AGENT_AUTO_APPROVE !== "false",
    confidenceThreshold: Number.isFinite(threshold) ? threshold : 0.72,
    autoPublish: process.env.AGENT_AUTO_PUBLISH === "true",
    publishConfidenceThreshold: Number.isFinite(publishThreshold) ? publishThreshold : 0.85,
    blockingWarningPatterns: (process.env.AGENT_BLOCKING_WARNINGS ?? "authenticity,recall,counterfeit")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    timeSavedMinutes: parseFloat(process.env.AGENT_TIME_SAVED_MINUTES ?? "18") || 18,
  };
}
