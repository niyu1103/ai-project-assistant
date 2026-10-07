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

  diagnosis: ImprovementDiagnosis
}

type ImprovementIssue =
  | 'answer_incomplete'
  | 'ungrounded_answer'
  | 'tool_selection'
  | 'document_type_filter'
  | 'retrieval_failure'

type ImprovementDiagnosis = {
  issues: ImprovementIssue[]
  suggestions: string[]
}

function diagnoseResult(result: {
  semanticFactRecall: number
  groundednessScore: number
  toolRecall: number | null
  documentTypeFilterRecall: number | null
  retrievedDocumentTypeRecall: number | null
}): ImprovementDiagnosis {
  const issues: ImprovementIssue[] = []
  const suggestions: string[] = []

  if (result.semanticFactRecall < 1) {
    issues.push('answer_incomplete')

    suggestions.push(
      '回答に必要な事実が不足しているため、質問の各論点を回答前に確認する。',
    )
  }

  if (result.groundednessScore < 1) {
    issues.push('ungrounded_answer')

    suggestions.push(
      '取得したContextにない情報を回答へ追加しない。必要なら追加検索する。',
    )
  }

  if (result.toolRecall !== null && result.toolRecall < 1) {
    issues.push('tool_selection')

    suggestions.push(
      '必要なToolをすべて使用できるようAgent instructionsを見直す。',
    )
  }

  if (
    result.documentTypeFilterRecall !== null &&
    result.documentTypeFilterRecall < 1
  ) {
    issues.push('document_type_filter')

    suggestions.push(
      '質問内容から適切なdocumentTypeを判断できるよう検索戦略を改善する。',
    )
  }

  if (
    result.retrievedDocumentTypeRecall !== null &&
    result.retrievedDocumentTypeRecall < 1
  ) {
    issues.push('retrieval_failure')

    suggestions.push(
      '必要な文書種別を取得できていないため、Filter・検索Query・再検索条件を見直す。',
    )
  }

  return {
    issues,
    suggestions,
  }
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

    const diagnosis = diagnoseResult({
      semanticFactRecall,
      groundednessScore: groundedness.score,
      toolRecall,
      documentTypeFilterRecall,
      retrievedDocumentTypeRecall,
    })

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
      diagnosis,
    })
  }
  console.log('\nImprovement Candidates')

  for (const result of results) {
    if (result.diagnosis.issues.length === 0) {
      continue
    }

    console.log('')
    console.log(`=== ${result.id} ===`)
    console.log(result.query)

    console.log('')
    console.log('Issues:')

    for (const issue of result.diagnosis.issues ?? []) {
      console.log(`- ${issue}`)
    }

    console.log('')
    console.log('Suggestions:')

    for (const suggestion of result.diagnosis.suggestions ?? []) {
      console.log(`- ${suggestion}`)
    }
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

  const evalResultsDir = path.join(process.cwd(), 'data', 'eval-results')

  const resultName = process.argv[2] ?? 'latest'

  await fs.mkdir(evalResultsDir, {
    recursive: true,
  })

  const resultPath = path.join(evalResultsDir, `${resultName}.json`)
  await fs.writeFile(
    resultPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        averages: {
          stringFactRecall: averageStringFactRecall,
          semanticFactRecall: averageSemanticFactRecall,
          groundedness: averageGroundedness,
          toolRecall: averageToolRecall,
        },
        results,
      },
      null,
      2,
    ),
    'utf-8',
  )

  console.log(`Saved evaluation result: ${resultPath}`)

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
