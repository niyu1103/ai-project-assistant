import fs from 'fs/promises'
import path from 'path'

import customers from '../data/customers.json'
import { searchDatabricksDocuments } from '../lib/databricks'

type EvaluationCase = {
  id: string
  query: string
  customerName?: string
  expectedFiles: string[]
}

async function main() {
  const casesPath = path.join(
    process.cwd(),
    'data',
    'rag-evaluation-cases.json',
  )

  const cases = JSON.parse(
    await fs.readFile(casesPath, 'utf-8'),
  ) as EvaluationCase[]

  const results = []

  for (const testCase of cases) {
    let customerId: string | undefined

    if (testCase.customerName) {
      const customer = customers.find(
        (customer) =>
          customer.name.includes(testCase.customerName!) ||
          customer.shortName.includes(testCase.customerName!),
      )

      customerId = customer?.id
    }

    const searchResults = await searchDatabricksDocuments(testCase.query, 5, {
      customerId,
    })

    const actualFiles = searchResults.map((result) => result.file)

    const matchedFiles = testCase.expectedFiles.filter((file) =>
      actualFiles.includes(file),
    )

    const recall =
      testCase.expectedFiles.length === 0
        ? 1
        : matchedFiles.length / testCase.expectedFiles.length

    const precision =
      actualFiles.length === 0 ? 0 : matchedFiles.length / actualFiles.length

    results.push({
      id: testCase.id,
      query: testCase.query,
      expectedFiles: testCase.expectedFiles.join(', '),
      actualFiles: actualFiles.join(', '),
      matched: `${matchedFiles.length}/${testCase.expectedFiles.length}`,
      recall,
      precision,
    })
  }

  console.table(results)

  const averageRecall =
    results.reduce((sum, result) => sum + result.recall, 0) / results.length

  const averagePrecision =
    results.reduce((sum, result) => sum + result.precision, 0) / results.length

  console.log(`Average recall: ${averageRecall.toFixed(2)}`)

  console.log(`Average precision: ${averagePrecision.toFixed(2)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
