export type AgentStepId =
  | "identify_item"
  | "fetch_comparables"
  | "determine_price"
  | "generate_listing"
  | "auto_approve"
  | "auto_evaluate"
  | "auto_publish";

export type AgentStepStatus = "pending" | "running" | "completed" | "skipped" | "failed";

export interface AgentStepLog {
  id: AgentStepId;
  status: AgentStepStatus;
  message: string;
  at: string;
}

export interface AutonomousRunResult {
  itemId: string;
  success: boolean;
  itemStatus: string;
  steps: AgentStepLog[];
  error?: string;
  published: boolean;
  offerId?: string;
}
