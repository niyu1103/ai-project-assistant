export type AgentContext = {
  verifiedCustomerId: string | null;

  eval?: {
    failTools?: string[];
  };
};
