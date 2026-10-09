import fs from 'node:fs'
import path from 'node:path'
import { File } from 'node:buffer'
import evaluationCases from '@/data/monthly-report-evaluation-cases.json'
import { run } from '@openai/agents'
import { projectAgent } from '@/agents/project-agent'
import { extractMonthlyReport } from '@/lib/extract-monthly-report'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type EvaluationResult = {
  input: string
  passed: boolean
  differences: string[]
}

async function evaluateGroundedness(
  reportContext: unknown,
  toolOutputs: {
    name: string
    output: string
  }[],
  answer: string,
) {
  const groundingContext = `
## 月次報告書
${JSON.stringify(reportContext, null, 2)}

## Tool実行結果
${toolOutputs
  .map(
    (tool) => `
### ${tool.name}
${tool.output}
`,
  )
  .join('\n')}
`

  const response = await openai.responses.create({
    model: 'gpt-5.6',
    input: [
      {
        role: 'system',
        content: `
あなたはAI回答のGroundednessを評価するJudgeです。

回答に含まれる事実・数値・期限・原因・条件・推奨事項が、
与えられたGrounding Contextから直接支持されているかを評価してください。

以下をGroundedness違反としてください。

- Contextに存在しない事実を追加している
- Contextから推測して断定している
- Contextより強い表現に言い換えている
- 条件を勝手に追加・削除している
- 数値・期限・顧客・原因などがContextと矛盾している

文章表現が異なるだけで意味が同じ場合は問題ありません。

回答に含まれる主張がすべてContextで支持されている場合は grounded=true としてください。
`,
      },
      {
        role: 'user',
        content: `
## Grounding Context
${groundingContext}

## 評価対象の回答
${answer}
`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'groundedness_evaluation',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            grounded: {
              type: 'boolean',
            },
            unsupportedClaims: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            reason: {
              type: 'string',
            },
          },
          required: ['grounded', 'unsupportedClaims', 'reason'],
        },
      },
    },
  })

  return JSON.parse(response.output_text) as {
    grounded: boolean
    unsupportedClaims: string[]
    reason: string
  }
}

function createFile(filePath: string, mimeType: string) {
  const buffer = fs.readFileSync(filePath)

  return new File([buffer], path.basename(filePath), {
    type: mimeType,
  })
}

function compareValues(
  actual: unknown,
  expected: unknown,
  currentPath = '',
): string[] {
  const differences: string[] = []

  if (
    typeof actual !== typeof expected ||
    actual === null ||
    expected === null
  ) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      differences.push(
        `${currentPath}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
      )
    }

    return differences
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      differences.push(
        `${currentPath}: expected array, actual=${JSON.stringify(actual)}`,
      )

      return differences
    }

    if (actual.length !== expected.length) {
      differences.push(
        `${currentPath}.length: expected=${expected.length} actual=${actual.length}`,
      )
    }

    expected.forEach((expectedItem, index) => {
      differences.push(
        ...compareValues(
          actual[index],
          expectedItem,
          `${currentPath}[${index}]`,
        ),
      )
    })

    return differences
  }

  if (typeof expected === 'object' && typeof actual === 'object') {
    for (const [key, expectedValue] of Object.entries(expected)) {
      differences.push(
        ...compareValues(
          (actual as Record<string, unknown>)[key],
          expectedValue,
          currentPath ? `${currentPath}.${key}` : key,
        ),
      )
    }

    return differences
  }

  if (actual !== expected) {
    differences.push(
      `${currentPath}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    )
  }

  return differences
}

function evaluateAnswer(
  answer: string,
  expectedChecks: {
    name: string
    allOf: string[]
  }[],
) {
  const checks = expectedChecks.map((check) => {
    const missingKeywords = check.allOf.filter(
      (keyword) => !answer.includes(keyword),
    )

    return {
      name: check.name,
      passed: missingKeywords.length === 0,
      missingKeywords,
    }
  })

  return {
    passed: checks.every((check) => check.passed),
    checks,
  }
}

async function evaluateToolSelection(
  reportContext: unknown,
  expectedTools: string[],
) {
  const input = `
ユーザーの質問:
この月次報告書から、今月注意すべき点を教えてください。

以下は月次報告書から抽出し、
顧客マスタとの照合まで完了したデータです。

<monthly_report>
${JSON.stringify(reportContext, null, 2)}
</monthly_report>

この月次報告書の情報を事実として使用してください。
必要に応じてToolや社内文書検索を使用してください。
`

  const result = await run(projectAgent, input)
  const answer = result.finalOutput?.message ?? ''
  const actualTools = result.newItems
    .filter((item) => item.type === 'tool_call_item')
    .map((item) => item.rawItem.name)

  const missingTools = expectedTools.filter(
    (tool) => !actualTools.includes(tool),
  )

  const unexpectedTools = actualTools.filter(
    (tool) => !expectedTools.includes(tool),
  )

  const toolOutputs = result.newItems
    .filter((item) => item.type === 'tool_call_output_item')
    .map((item) => {
      const rawItem = item.rawItem

      if (
        rawItem.type !== 'function_call_result' ||
        rawItem.output.type !== 'text'
      ) {
        return null
      }

      return {
        name: rawItem.name,
        output: rawItem.output.text,
      }
    })
    .filter((item) => item !== null)

  return {
    answer,
    actualTools,
    toolOutputs,
    missingTools,
    unexpectedTools,
    passed: missingTools.length === 0 && unexpectedTools.length === 0,
  }
}

async function evaluateFile(
  filePath: string,
  mimeType: string,
  expected: unknown,
): Promise<EvaluationResult> {
  const file = createFile(filePath, mimeType)

  const actual = await extractMonthlyReport(file)

  const differences = compareValues(actual, expected)

  return {
    input: path.basename(filePath),
    passed: differences.length === 0,
    differences,
  }
}

async function main() {
  const evaluationCase = evaluationCases[0]

  const pdfPath = path.resolve(
    'data/evaluation/monthly-report/aosora_monthly_report_2026_09.pdf',
  )

  const pngPath = path.resolve(
    'data/evaluation/monthly-report/aosora_monthly_report_2026_09.png',
  )

  const pdfResult = await evaluateFile(
    pdfPath,
    'application/pdf',
    evaluationCase.expectedExtraction,
  )

  const pngResult = await evaluateFile(
    pngPath,
    'image/png',
    evaluationCase.expectedExtraction,
  )

  console.log('\nExtraction Eval\n')

  for (const result of [pdfResult, pngResult]) {
    console.log(`${result.input}: ${result.passed ? 'PASS' : 'FAIL'}`)

    for (const difference of result.differences) {
      console.log(`  - ${difference}`)
    }
  }

  const pdfFile = createFile(pdfPath, 'application/pdf')

  const pngFile = createFile(pngPath, 'image/png')

  const pdfExtraction = await extractMonthlyReport(pdfFile)
  const pngExtraction = await extractMonthlyReport(pngFile)
  const pdfToolResult = await evaluateToolSelection(
    pdfExtraction,
    evaluationCase.expectedTools,
  )

  const pngToolResult = await evaluateToolSelection(
    pngExtraction,
    evaluationCase.expectedTools,
  )

  console.log('\nTool Selection Eval\n')

  for (const [label, result] of [
    ['PDF', pdfToolResult],
    ['PNG', pngToolResult],
  ] as const) {
    console.log(`${label}: ${result.passed ? 'PASS' : 'FAIL'}`)
    console.log(`  actual: ${result.actualTools.join(', ')}`)

    if (result.missingTools.length > 0) {
      console.log(`  missing: ${result.missingTools.join(', ')}`)
    }

    if (result.unexpectedTools.length > 0) {
      console.log(`  unexpected: ${result.unexpectedTools.join(', ')}`)
    }
  }

  const pdfAnswerResult = evaluateAnswer(
    pdfToolResult.answer,
    evaluationCase.expectedAnswerChecks,
  )

  const pngAnswerResult = evaluateAnswer(
    pngToolResult.answer,
    evaluationCase.expectedAnswerChecks,
  )
  console.log('\nAnswer Eval\n')

  for (const [label, result] of [
    ['PDF', pdfAnswerResult],
    ['PNG', pngAnswerResult],
  ] as const) {
    console.log(`${label}: ${result.passed ? 'PASS' : 'FAIL'}`)

    for (const check of result.checks) {
      console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`)

      if (!check.passed) {
        console.log(`     missing: ${check.missingKeywords.join(', ')}`)
      }
    }
  }

  const pdfGroundedness = await evaluateGroundedness(
    pdfExtraction,
    pdfToolResult.toolOutputs,
    pdfToolResult.answer,
  )
  // const fakeAnswer =
  //   pdfToolResult.answer +
  //   '\nSSO証明書の更新は2026年10月15日までに必ず完了します。'

  // const pdfGroundedness = await evaluateGroundedness(
  //   pdfExtraction,
  //   pdfToolResult.toolOutputs,
  //   fakeAnswer,
  // )

  const pngGroundedness = await evaluateGroundedness(
    pngExtraction,
    pngToolResult.toolOutputs,
    pngToolResult.answer,
  )
  console.log('\nGroundedness Eval\n')

  for (const [label, result] of [
    ['PDF', pdfGroundedness],
    ['PNG', pngGroundedness],
  ] as const) {
    console.log(`${label}: ${result.grounded ? 'PASS' : 'FAIL'}`)

    console.log(`  reason: ${result.reason}`)

    if (result.unsupportedClaims.length > 0) {
      console.log('  unsupported claims:')

      for (const claim of result.unsupportedClaims) {
        console.log(`    - ${claim}`)
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
