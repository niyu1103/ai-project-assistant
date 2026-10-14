import type { RunContext } from "@openai/agents";

import type { AgentContext } from "@/lib/agent-context";
import { addEvalContext } from "@/lib/eval-context";

export const assertCustomerAccess = (
  customerId: string,
  runContext?: RunContext<AgentContext>,
) => {
  const verifiedCustomerId = runContext?.context.verifiedCustomerId;

  if (!verifiedCustomerId) {
    addEvalContext(
      "customer_access_denied",
      {
        reason: "customer_not_verified",
      },
      {
        requestedCustomerId: customerId,
        verifiedCustomerId: null,
      },
    );

    throw new Error("Customer is not verified");
  }

  if (customerId !== verifiedCustomerId) {
    addEvalContext(
      "customer_access_denied",
      {
        reason: "customer_mismatch",
      },
      {
        requestedCustomerId: customerId,
        verifiedCustomerId,
      },
    );

    throw new Error("Customer access denied");
  }
};
