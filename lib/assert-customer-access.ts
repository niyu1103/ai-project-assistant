import type { RunContext } from "@openai/agents";
import type { AgentContext } from "@/lib/agent-context";

export const assertCustomerAccess = (
  customerId: string,
  runContext?: RunContext<AgentContext>,
) => {
  const verifiedCustomerId = runContext?.context.verifiedCustomerId;

  if (!verifiedCustomerId) {
    throw new Error("Customer is not verified");
  }

  if (customerId !== verifiedCustomerId) {
    throw new Error("Customer access denied");
  }
};
