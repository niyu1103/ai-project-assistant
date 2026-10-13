import { describe, expect, it } from "vitest";
import type { RunContext } from "@openai/agents";

import { assertCustomerAccess } from "@/lib/assert-customer-access";
import type { AgentContext } from "@/lib/agent-context";

describe("assertCustomerAccess", () => {
  it("同じcustomerIdなら許可する", () => {
    const runContext = {
      context: {
        verifiedCustomerId: "cust-001",
      },
    } as RunContext<AgentContext>;

    expect(() => assertCustomerAccess("cust-001", runContext)).not.toThrow();
  });

  it("別顧客のcustomerIdなら拒否する", () => {
    const runContext = {
      context: {
        verifiedCustomerId: "cust-001",
      },
    } as RunContext<AgentContext>;

    expect(() => assertCustomerAccess("cust-002", runContext)).toThrow(
      "Customer access denied",
    );
  });

  it("verifiedCustomerIdが未設定なら拒否する", () => {
    const runContext = {
      context: {
        verifiedCustomerId: null,
      },
    } as RunContext<AgentContext>;

    expect(() => assertCustomerAccess("cust-001", runContext)).toThrow(
      "Customer is not verified",
    );
  });
});
