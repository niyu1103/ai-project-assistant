type SearchScopeInput =
  | {
      scope: "customer";
      customerId?: string;
    }
  | {
      scope: "global";
      customerId?: string;
    };

export function validateSearchScope(input: SearchScopeInput): asserts input is
  | {
      scope: "customer";
      customerId: string;
    }
  | {
      scope: "global";
      customerId?: undefined;
    } {
  if (input.scope === "customer" && !input.customerId) {
    throw new Error("customerId is required for customer scope");
  }

  if (input.scope === "global" && input.customerId) {
    throw new Error("customerId must not be specified for global scope");
  }
}
