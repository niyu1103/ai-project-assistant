import { describe, expect, it } from "vitest";

import { validateSearchScope } from "@/lib/validate-search-scope";

describe("validateSearchScope", () => {
  it("customer scopeでcustomerIdありなら許可する", () => {
    expect(() =>
      validateSearchScope({
        scope: "customer",
        customerId: "cust-001",
      }),
    ).not.toThrow();
  });

  it("customer scopeでcustomerIdなしなら拒否する", () => {
    expect(() =>
      validateSearchScope({
        scope: "customer",
      }),
    ).toThrow("customerId is required for customer scope");
  });

  it("global scopeでcustomerIdなしなら許可する", () => {
    expect(() =>
      validateSearchScope({
        scope: "global",
      }),
    ).not.toThrow();
  });

  it("global scopeでcustomerIdありなら拒否する", () => {
    expect(() =>
      validateSearchScope({
        scope: "global",
        customerId: "cust-001",
      }),
    ).toThrow("customerId must not be specified for global scope");
  });
});
