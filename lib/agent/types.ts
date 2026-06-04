export type AgentStepId =
  | "identify_item"
  | "await_user_input"
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

export type AgentQuestionField = "size" | "brand" | "condition" | "freeformNotes" | "custom";

export interface AgentQuestion {
  id: string;
  field: AgentQuestionField;
  question: string;
  placeholder?: string;
  required?: boolean;
}

export interface AutonomousRunResult {
  itemId: string;
  success: boolean;
  itemStatus: string;
  steps: AgentStepLog[];
  error?: string;
  published: boolean;
  offerId?: string;
  awaitingInput?: boolean;
  questions?: AgentQuestion[];
}
