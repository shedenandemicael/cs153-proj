"use client";

import { useMemo } from "react";
import { AgentQuestionModal } from "@/components/agent/AgentQuestionModal";
import type { AgentQuestion } from "@/lib/agent/types";

export function ItemAgentShell({
  itemId,
  itemStatus,
  agentRunStatus,
  pendingQuestions,
}: {
  itemId: string;
  itemStatus: string;
  agentRunStatus?: string | null;
  pendingQuestions: AgentQuestion[];
}) {
  const showModal = useMemo(
    () =>
      itemStatus === "AWAITING_INPUT" &&
      agentRunStatus === "awaiting_input" &&
      pendingQuestions.length > 0,
    [itemStatus, agentRunStatus, pendingQuestions.length]
  );

  return (
    <AgentQuestionModal itemId={itemId} questions={pendingQuestions} open={showModal} />
  );
}
