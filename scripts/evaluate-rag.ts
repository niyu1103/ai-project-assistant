import fs from "fs/promises";
import path from "path";

import { findCustomer } from "../lib/find-customer";
import { searchDatabricksDocuments } from "../lib/databricks";

type EvaluationCase = {
  id: string;
  query: string;
  customerName?: string;
  expectedFiles: string[];
  documentType?: string;
  expectedFacts?: string[];
};

async function main() {
  const casesPath = path.join(
    process.cwd(),
    "data",
    "rag-evaluation-cases.json",
  );

  const cases = JSON.parse(
    await fs.readFile(casesPath, "utf-8"),
  ) as EvaluationCase[];

  const results = [];

  const TOP_K = 3;

  for (const testCase of cases) {
    let customerId: string | undefined;

    if (testCase.customerName) {
      const customer = findCustomer(testCase.customerName);

      customerId = customer?.id;
    }

    const searchResults = customerId
      ? await searchDatabricksDocuments(
          testCase.query,
          {
            scope: "customer",
            customerId,
            documentType: testCase.documentType,
          },
          TOP_K,
        )
      : await searchDatabricksDocuments(
          testCase.query,
          {
            scope: "global",
            documentType: testCase.documentType,
          },
          TOP_K,
        );

    const actualFiles = [
      ...new Set(searchResults.map((result) => result.file)),
    ];

    const matchedFiles = testCase.expectedFiles.filter((file) =>
      actualFiles.includes(file),
    );

    const recall =
      testCase.expectedFiles.length === 0
        ? 1
        : matchedFiles.length / testCase.expectedFiles.length;

    const precision =
      actualFiles.length === 0 ? 0 : matchedFiles.length / actualFiles.length;

    results.push({
      id: testCase.id,
      query: testCase.query,
      expectedFiles: testCase.expectedFiles.join(", "),
      actualFiles: actualFiles.join(", "),
      matched: `${matchedFiles.length}/${testCase.expectedFiles.length}`,
      recall,
      precision,
    });
  }

  console.table(results);

  const averageRecall =
    results.reduce((sum, result) => sum + result.recall, 0) / results.length;

  const averagePrecision =
    results.reduce((sum, result) => sum + result.precision, 0) / results.length;
  console.log(`Top-K: ${TOP_K}`);
  console.log(`Average recall: ${averageRecall.toFixed(2)}`);
  console.log(`Average precision: ${averagePrecision.toFixed(2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
