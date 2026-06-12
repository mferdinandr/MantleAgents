export interface WorkflowValidationResult {
  passed: boolean;
  issues: string[];
}

export interface GeneratedWorkflow {
  workflowJson: Record<string, unknown> | null;
  summary: string;
  validation: WorkflowValidationResult;
}
