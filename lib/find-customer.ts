// lib/find-customer.ts
import customers from "@/data/customers.json";

export const findCustomer = (customerName: string) => {
  const normalizeCustomerName = (value: string) =>
    value.trim().replace(/\s+/g, "");

  const normalizedInput = normalizeCustomerName(customerName);

  return customers.find((customer) => {
    const candidateNames = [
      customer.name,
      customer.shortName,
      ...(customer.aliases ?? []),
    ];

    return candidateNames.some(
      (name) => normalizeCustomerName(name) === normalizedInput,
    );
  });
};
