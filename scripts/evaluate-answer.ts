import fs from 'fs/promises'
import path from 'path'

import { run } from '@openai/agents'

import { projectAgent } from '../agents/project-agent'

import { resetEvalContext, getEvalContext } from '../lib/eval-context'

import { judgeFact } from './judgeFact'
import { judgeGroundedness } from './judgeGroundedness'

type EvaluationCase = {
  id: string
  query: string
  customerName?: string
  documentType?: string

  expectedFiles: string[]
  expectedFacts?: string[]

  expectedTools?: string[]
  expectedDocumentTypes?: string[]
}

type FactJudgeResult = {
  fact: string
  matched: boolean
  reason: string
}

type EvaluationResult = {
  id: string
  query: string

  stringMatched: string
  stringFactRecall: number

  semanticMatched: string
  semanticFactRecall: number

  groundednessScore: number
  groundednessReason: string

  toolRecall: number | null

  documentTypeFilterRecall: number | null
  retrievedDocumentTypeRecall: number | null

  answer: string
  judgeDetails: string
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

  // Answer Eval対象
  const answerCases = cases.filter(
    (testCase) => testCase.expectedFacts && testCase.expectedFacts.length > 0,
  )

  const results: EvaluationResult[] = []

  for (const testCase of answerCases) {
    console.log(`[evaluate] ${testCase.id}`)

    // caseごとにTool Resultを初期化
    resetEvalContext()

    // Agent実行
    const result = await run(projectAgent, testCase.query)

    const message = result.finalOutput?.message ?? ''

    const expectedFacts = testCase.expectedFacts ?? []

    // --------------------------------
    // 1. String Match Eval
    // --------------------------------

    const matchedFacts = expectedFacts.filter((fact) => message.includes(fact))

    const stringFactRecall =
      expectedFacts.length === 0
        ? 1
        : matchedFacts.length / expectedFacts.length

    // --------------------------------
    // 2. Semantic Answer Eval
    // --------------------------------

    const judgeResults: FactJudgeResult[] = []

    for (const fact of expectedFacts) {
      const judgeResult = await judgeFact(fact, message)

      judgeResults.push(judgeResult)
    }

    const semanticMatchedFacts = judgeResults.filter((result) => result.matched)

    const semanticFactRecall =
      expectedFacts.length === 0
        ? 1
        : semanticMatchedFacts.length / expectedFacts.length

    // --------------------------------
    // 3. Tool Context取得
    // --------------------------------

    const toolContexts = getEvalContext()

    // Groundedness Judgeへ渡すContext
    const context = toolContexts
      .map((item) => {
        return `
Tool: ${item.toolName}

Input:
${JSON.stringify(item.input, null, 2)}

Result:
${JSON.stringify(item.content, null, 2)}
        `.trim()
      })
      .join('\n\n---\n\n')

    // --------------------------------
    // 4. Groundedness Eval
    // --------------------------------

    const groundedness = await judgeGroundedness(message, context)

    // --------------------------------
    // 5. Tool Selection Eval
    // --------------------------------

    const actualTools = [...new Set(toolContexts.map((item) => item.toolName))]

    const expectedTools = testCase.expectedTools

    const toolRecall =
      expectedTools && expectedTools.length > 0
        ? expectedTools.filter((tool) => actualTools.includes(tool)).length /
          expectedTools.length
        : null

    // --------------------------------
    // 6. DocumentType Filter Eval
    // --------------------------------

    const actualDocumentTypeFilters = [
      ...new Set(
        toolContexts
          .filter((item) => item.toolName === 'search_documents_semantic')
          .map((item) => {
            const input = item.input as {
              documentType?: string
            }

            return input.documentType
          })
          .filter((documentType): documentType is string =>
            Boolean(documentType),
          ),
      ),
    ]

    const expectedDocumentTypes = testCase.expectedDocumentTypes

    const documentTypeFilterRecall =
      expectedDocumentTypes && expectedDocumentTypes.length > 0
        ? expectedDocumentTypes.filter((type) =>
            actualDocumentTypeFilters.includes(type),
          ).length / expectedDocumentTypes.length
        : null

    // --------------------------------
    // 7. Retrieved DocumentType Eval
    // --------------------------------

    const retrievedDocumentTypes = [
      ...new Set(
        toolContexts
          .filter((item) => item.toolName === 'search_documents_semantic')
          .flatMap((item) => {
            const content = item.content as {
              results?: Array<{
                documentType?: string
              }>
            }

            return (
              content.results
                ?.map((result) => result.documentType)
                .filter((documentType): documentType is string =>
                  Boolean(documentType),
                ) ?? []
            )
          }),
      ),
    ]

    const retrievedDocumentTypeRecall =
      expectedDocumentTypes && expectedDocumentTypes.length > 0
        ? expectedDocumentTypes.filter((type) =>
            retrievedDocumentTypes.includes(type),
          ).length / expectedDocumentTypes.length
        : null

    // --------------------------------
    // 8. Result保存
    // --------------------------------

    results.push({
      id: testCase.id,
      query: testCase.query,

      stringMatched: `${matchedFacts.length}/${expectedFacts.length}`,

      stringFactRecall,

      semanticMatched: `${semanticMatchedFacts.length}/${expectedFacts.length}`,

      semanticFactRecall,

      groundednessScore: groundedness.score,

      groundednessReason: groundedness.reason,

      toolRecall,

      documentTypeFilterRecall,

      retrievedDocumentTypeRecall,

      answer: message,

      judgeDetails: judgeResults
        .map(
          (result) =>
            `${result.matched ? '✅' : '❌'} ${result.fact}: ${result.reason}`,
        )
        .join('\n'),
    })
  }

  // --------------------------------
  // Average
  // --------------------------------

  const averageStringFactRecall =
    results.reduce((sum, result) => sum + result.stringFactRecall, 0) /
    results.length

  const averageSemanticFactRecall =
    results.reduce((sum, result) => sum + result.semanticFactRecall, 0) /
    results.length

  const averageGroundedness =
    results.reduce((sum, result) => sum + result.groundednessScore, 0) /
    results.length

  const toolRecallValues = results
    .map((result) => result.toolRecall)
    .filter((value): value is number => value !== null)

  const averageToolRecall =
    toolRecallValues.length > 0
      ? toolRecallValues.reduce((sum, value) => sum + value, 0) /
        toolRecallValues.length
      : null

  // --------------------------------
  // Summary
  // --------------------------------

  console.log('')
  console.log(
    `Average string fact recall: ${averageStringFactRecall.toFixed(2)}`,
  )

  console.log(
    `Average semantic fact recall: ${averageSemanticFactRecall.toFixed(2)}`,
  )

  console.log(`Average groundedness: ${averageGroundedness.toFixed(2)}`)

  if (averageToolRecall !== null) {
    console.log(`Average tool recall: ${averageToolRecall.toFixed(2)}`)
  }

  console.log('')

  console.table(
    results.map((result) => ({
      id: result.id,

      semantic: result.semanticMatched,

      semanticRecall: result.semanticFactRecall.toFixed(2),

      groundedness: result.groundednessScore.toFixed(2),

      toolRecall:
        result.toolRecall === null ? 'N/A' : result.toolRecall.toFixed(2),

      filterRecall:
        result.documentTypeFilterRecall === null
          ? 'N/A'
          : result.documentTypeFilterRecall.toFixed(2),

      retrievedTypeRecall:
        result.retrievedDocumentTypeRecall === null
          ? 'N/A'
          : result.retrievedDocumentTypeRecall.toFixed(2),
    })),
  )

  // --------------------------------
  // Groundedness Issues
  // --------------------------------

  const groundednessFailures = results.filter(
    (result) => result.groundednessScore < 1,
  )

  if (groundednessFailures.length > 0) {
    console.log('\nGroundedness Issues')

    for (const result of groundednessFailures) {
      console.log('')
      console.log(result.id)

      console.log(`Score: ${result.groundednessScore}`)

      console.log(`Reason: ${result.groundednessReason}`)
    }
  }

  // --------------------------------
  // Tool Selection Issues
  // --------------------------------

  const toolSelectionFailures = results.filter(
    (result) =>
      (result.toolRecall !== null && result.toolRecall < 1) ||
      (result.documentTypeFilterRecall !== null &&
        result.documentTypeFilterRecall < 1) ||
      (result.retrievedDocumentTypeRecall !== null &&
        result.retrievedDocumentTypeRecall < 1),
  )

  if (toolSelectionFailures.length > 0) {
    console.log('\nTool Selection Issues')

    for (const result of toolSelectionFailures) {
      console.log('')
      console.log(result.id)

      console.log(
        `Tool Recall: ${
          result.toolRecall === null ? 'N/A' : result.toolRecall.toFixed(2)
        }`,
      )

      console.log(
        `Filter Recall: ${
          result.documentTypeFilterRecall === null
            ? 'N/A'
            : result.documentTypeFilterRecall.toFixed(2)
        }`,
      )

      console.log(
        `Retrieved Type Recall: ${
          result.retrievedDocumentTypeRecall === null
            ? 'N/A'
            : result.retrievedDocumentTypeRecall.toFixed(2)
        }`,
      )
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
