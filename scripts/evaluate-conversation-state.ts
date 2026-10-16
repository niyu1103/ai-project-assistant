import fs from 'fs/promises'
import path from 'path'

import { runRoutedAgent } from '@/lib/run-routed-agent'
import type { AgentContext } from '@/lib/agent-context'

type ConversationStateEvaluationCase = {
  id: string
  turns: Array<{
    resetBefore?: boolean
    message: string
    expected: {
      customerId: string | null
      currentTopic: 'contract' | 'project' | 'incident' | 'api_usage' | null
      requiredTools?: string[]
      forbiddenTools?: string[]
    }
  }>
}

function buildConversationContext(context: AgentContext) {
  return `
現在の会話状態:
- customerId: ${context.conversationState.customerId ?? '未設定'}
- customerName: ${context.conversationState.customerName ?? '未設定'}
- currentTopic: ${context.conversationState.currentTopic ?? '未設定'}

会話状態に顧客が設定されていて、ユーザーが新しい顧客名を明示していない場合は、
その顧客についての続きの質問として扱ってください。

ユーザーが別の顧客名を明示した場合は、
保存済みの顧客をそのまま使わず、get_customer で新しい顧客を確認してください。
`
}

async function main() {
  const casesPath = path.join(
    process.cwd(),
    'data',
    'conversation-state-evaluation-cases.json',
  )

  const cases = JSON.parse(
    await fs.readFile(casesPath, 'utf-8'),
  ) as ConversationStateEvaluationCase[]

  const evaluationResults = []

  for (const testCase of cases) {
    const context: AgentContext = {
      verifiedCustomerId: null,
      conversationState: {
        customerId: null,
        customerName: null,
        currentTopic: null,
      },
      eval: {
        failTools: [],
      },
    }

    for (let index = 0; index < testCase.turns.length; index++) {
      const turn = testCase.turns[index]

      if (turn.resetBefore) {
        context.verifiedCustomerId = null
        context.conversationState = {
          customerId: null,
          customerName: null,
          currentTopic: null,
        }
      }

      console.log(
        `\n[TURN ${index + 1}/${testCase.turns.length}] ${turn.message}`,
      )

      const conversationContext = buildConversationContext(context)

      const agentInput = `
${conversationContext}

ユーザーの質問:
${turn.message}
`

      const { route, result } = await runRoutedAgent(agentInput, context)

      console.log('[route]', route)

      console.log('[STATE]', context.conversationState)

      const actualTools = [
        ...new Set(
          result.newItems
            .filter((item) => item.type === 'tool_call_item')
            .map((item) => {
              const rawItem = item.rawItem

              if (rawItem.type !== 'function_call') {
                return null
              }

              return rawItem.name
            })
            .filter((name): name is string => name !== null),
        ),
      ]

      const requiredTools = turn.expected.requiredTools ?? []
      const forbiddenTools = turn.expected.forbiddenTools ?? []

      const missingRequiredTools = requiredTools.filter(
        (toolName) => !actualTools.includes(toolName),
      )

      const usedForbiddenTools = forbiddenTools.filter((toolName) =>
        actualTools.includes(toolName),
      )

      const customerIdPassed =
        context.conversationState.customerId === turn.expected.customerId

      const currentTopicPassed =
        context.conversationState.currentTopic === turn.expected.currentTopic

      const passed =
        customerIdPassed &&
        currentTopicPassed &&
        missingRequiredTools.length === 0 &&
        usedForbiddenTools.length === 0

      evaluationResults.push({
        caseId: testCase.id,
        turn: index + 1,
        message: turn.message,
        passed,

        expectedCustomerId: turn.expected.customerId,
        actualCustomerId: context.conversationState.customerId,

        expectedTopic: turn.expected.currentTopic,
        actualTopic: context.conversationState.currentTopic,

        actualTools: actualTools.join(', '),
        missingRequiredTools: missingRequiredTools.join(', '),
        usedForbiddenTools: usedForbiddenTools.join(', '),

        answer: result.finalOutput?.message ?? '',
      })
    }
  }

  console.table(
    evaluationResults.map((result) => ({
      caseId: result.caseId,
      turn: result.turn,
      passed: result.passed,
      expectedCustomerId: result.expectedCustomerId,
      actualCustomerId: result.actualCustomerId,
      expectedTopic: result.expectedTopic,
      actualTopic: result.actualTopic,
      actualTools: result.actualTools,
      missingRequiredTools: result.missingRequiredTools,
      usedForbiddenTools: result.usedForbiddenTools,
    })),
  )

  const failedResults = evaluationResults.filter((result) => !result.passed)

  if (failedResults.length > 0) {
    console.error('\nConversation State evaluation failed')

    for (const result of failedResults) {
      console.error(`\n[${result.caseId}] turn=${result.turn}`)

      console.error(`Message: ${result.message}`)

      console.error(
        `CustomerId: expected=${result.expectedCustomerId}, actual=${result.actualCustomerId}`,
      )

      console.error(
        `Topic: expected=${result.expectedTopic}, actual=${result.actualTopic}`,
      )

      if (result.missingRequiredTools) {
        console.error(`Missing required tools: ${result.missingRequiredTools}`)
      }

      if (result.usedForbiddenTools) {
        console.error(`Used forbidden tools: ${result.usedForbiddenTools}`)
      }

      console.error(`Answer: ${result.answer}`)
    }

    process.exit(1)
  }

  console.log('\nConversation State evaluation passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
