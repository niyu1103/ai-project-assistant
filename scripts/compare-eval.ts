import fs from 'fs/promises'
import path from 'path'

type EvalResult = {
  id: string
  semanticFactRecall: number
  groundednessScore: number
  toolRecall: number | null
  documentTypeFilterRecall: number | null
  retrievedDocumentTypeRecall: number | null
}

type EvalFile = {
  generatedAt: string
  averages: {
    stringFactRecall: number
    semanticFactRecall: number
    groundedness: number
    toolRecall: number | null
  }
  results: EvalResult[]
}

function formatDiff(value: number | null) {
  if (value === null) return 'N/A'

  const sign = value > 0 ? '+' : ''

  return `${sign}${value.toFixed(2)}`
}

function calcDiff(before: number | null, after: number | null): number | null {
  if (before === null || after === null) {
    return null
  }

  return after - before
}

async function loadEval(fileName: string): Promise<EvalFile> {
  const filePath = path.join(process.cwd(), 'data', 'eval-results', fileName)

  const content = await fs.readFile(filePath, 'utf-8')

  return JSON.parse(content) as EvalFile
}

async function main() {
  const before = await loadEval('before.json')
  const after = await loadEval('after.json')

  console.log('')
  console.log('=== Eval Before / After Comparison ===')
  console.log('')

  // -------------------------
  // Average comparison
  // -------------------------

  console.log('Average Metrics')

  console.table([
    {
      metric: 'semanticFactRecall',
      before: before.averages.semanticFactRecall.toFixed(2),
      after: after.averages.semanticFactRecall.toFixed(2),
      diff: formatDiff(
        after.averages.semanticFactRecall - before.averages.semanticFactRecall,
      ),
    },
    {
      metric: 'groundedness',
      before: before.averages.groundedness.toFixed(2),
      after: after.averages.groundedness.toFixed(2),
      diff: formatDiff(
        after.averages.groundedness - before.averages.groundedness,
      ),
    },
    {
      metric: 'toolRecall',
      before:
        before.averages.toolRecall === null
          ? 'N/A'
          : before.averages.toolRecall.toFixed(2),
      after:
        after.averages.toolRecall === null
          ? 'N/A'
          : after.averages.toolRecall.toFixed(2),
      diff: formatDiff(
        calcDiff(before.averages.toolRecall, after.averages.toolRecall),
      ),
    },
  ])

  // -------------------------
  // Case comparison
  // -------------------------

  console.log('')
  console.log('Case Metrics')

  const comparison = after.results.map((afterResult) => {
    const beforeResult = before.results.find(
      (result) => result.id === afterResult.id,
    )

    if (!beforeResult) {
      return {
        id: afterResult.id,
        semantic: 'NEW',
        groundedness: 'NEW',
        toolRecall: 'NEW',
        filterRecall: 'NEW',
        retrievedTypeRecall: 'NEW',
      }
    }

    return {
      id: afterResult.id,

      semantic: formatDiff(
        afterResult.semanticFactRecall - beforeResult.semanticFactRecall,
      ),

      groundedness: formatDiff(
        afterResult.groundednessScore - beforeResult.groundednessScore,
      ),

      toolRecall: formatDiff(
        calcDiff(beforeResult.toolRecall, afterResult.toolRecall),
      ),

      filterRecall: formatDiff(
        calcDiff(
          beforeResult.documentTypeFilterRecall,
          afterResult.documentTypeFilterRecall,
        ),
      ),

      retrievedTypeRecall: formatDiff(
        calcDiff(
          beforeResult.retrievedDocumentTypeRecall,
          afterResult.retrievedDocumentTypeRecall,
        ),
      ),
    }
  })

  console.table(comparison)

  // -------------------------
  // Improved cases
  // -------------------------

  console.log('')
  console.log('Improved Cases')

  for (const afterResult of after.results) {
    const beforeResult = before.results.find(
      (result) => result.id === afterResult.id,
    )

    if (!beforeResult) continue

    const improvements: string[] = []

    const semanticDiff =
      afterResult.semanticFactRecall - beforeResult.semanticFactRecall

    const groundednessDiff =
      afterResult.groundednessScore - beforeResult.groundednessScore

    const toolDiff = calcDiff(beforeResult.toolRecall, afterResult.toolRecall)

    const filterDiff = calcDiff(
      beforeResult.documentTypeFilterRecall,
      afterResult.documentTypeFilterRecall,
    )

    const retrievedTypeDiff = calcDiff(
      beforeResult.retrievedDocumentTypeRecall,
      afterResult.retrievedDocumentTypeRecall,
    )

    if (semanticDiff > 0) {
      improvements.push(`semanticFactRecall ${formatDiff(semanticDiff)}`)
    }

    if (groundednessDiff > 0) {
      improvements.push(`groundedness ${formatDiff(groundednessDiff)}`)
    }

    if (toolDiff !== null && toolDiff > 0) {
      improvements.push(`toolRecall ${formatDiff(toolDiff)}`)
    }

    if (filterDiff !== null && filterDiff > 0) {
      improvements.push(`filterRecall ${formatDiff(filterDiff)}`)
    }

    if (retrievedTypeDiff !== null && retrievedTypeDiff > 0) {
      improvements.push(`retrievedTypeRecall ${formatDiff(retrievedTypeDiff)}`)
    }

    if (improvements.length === 0) {
      continue
    }

    console.log('')
    console.log(afterResult.id)

    for (const improvement of improvements) {
      console.log(`- ${improvement}`)
    }
  }

  // -------------------------
  // Regression cases
  // -------------------------
  console.log('')
  console.log('Regression Cases')

  let regressionCount = 0

  for (const afterResult of after.results) {
    const beforeResult = before.results.find(
      (result) => result.id === afterResult.id,
    )

    if (!beforeResult) continue

    const regressions: string[] = []

    const semanticDiff =
      afterResult.semanticFactRecall - beforeResult.semanticFactRecall

    const groundednessDiff =
      afterResult.groundednessScore - beforeResult.groundednessScore

    const toolDiff = calcDiff(beforeResult.toolRecall, afterResult.toolRecall)

    const filterDiff = calcDiff(
      beforeResult.documentTypeFilterRecall,
      afterResult.documentTypeFilterRecall,
    )

    const retrievedTypeDiff = calcDiff(
      beforeResult.retrievedDocumentTypeRecall,
      afterResult.retrievedDocumentTypeRecall,
    )

    if (semanticDiff < 0) {
      regressions.push(`semanticFactRecall ${formatDiff(semanticDiff)}`)
    }

    if (groundednessDiff < 0) {
      regressions.push(`groundedness ${formatDiff(groundednessDiff)}`)
    }

    if (toolDiff !== null && toolDiff < 0) {
      regressions.push(`toolRecall ${formatDiff(toolDiff)}`)
    }

    if (filterDiff !== null && filterDiff < 0) {
      regressions.push(`filterRecall ${formatDiff(filterDiff)}`)
    }

    if (retrievedTypeDiff !== null && retrievedTypeDiff < 0) {
      regressions.push(`retrievedTypeRecall ${formatDiff(retrievedTypeDiff)}`)
    }

    if (regressions.length === 0) {
      continue
    }

    regressionCount++

    console.log('')
    console.log(afterResult.id)

    for (const regression of regressions) {
      console.log(`- ${regression}`)
    }
  }

  if (regressionCount === 0) {
    console.log('')
    console.log('No regressions detected.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
