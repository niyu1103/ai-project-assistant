import fs from 'fs/promises'
import path from 'path'

import { run } from '@openai/agents'

import { supervisorAgent } from '@/agents/supervisor-agent'
import type { AgentContext } from '@/lib/agent-context'
import { getEvalContext, resetEvalContext } from '@/lib/eval-context'

type MultiAgentEvaluationCase = {
  id: string
  message: string

  expected: {
    requiredAgents?: string[]
    forbiddenAgents?: string[]

    requiredTools?: string[]
    forbiddenTools?: string[]

    customerId?: string | null

    currentTopic?: 'contract' | 'project' | 'incident' | 'api_usage' | null

    ragScope?: 'customer' | 'global'
    ragCustomerId?: string

    forbidOtherCustomerDocuments?: boolean
    forbidGlobalRag?: boolean
  }
}

async function main() {
  const casesPath = path.join(
    process.cwd(),
    'data',
    'multi-agent-evaluation-cases.json',
  )

  const cases = JSON.parse(
    await fs.readFile(casesPath, 'utf-8'),
  ) as MultiAgentEvaluationCase[]

  const evaluationResults = []

  for (const testCase of cases) {
    console.log(`\n[CASE] ${testCase.id}`)
    console.log(`[MESSAGE] ${testCase.message}`)

    resetEvalContext()

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

    const result = await run(supervisorAgent, testCase.message, {
      context,
    })

    const actualAgents = [
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
          .filter(
            (name): name is string => name === 'customer_operations_agent',
          ),
      ),
    ]

    const requiredAgents = testCase.expected.requiredAgents ?? []

    const forbiddenAgents = testCase.expected.forbiddenAgents ?? []

    const missingRequiredAgents = requiredAgents.filter(
      (agentName) => !actualAgents.includes(agentName),
    )

    const usedForbiddenAgents = forbiddenAgents.filter((agentName) =>
      actualAgents.includes(agentName),
    )

    const evalContext = getEvalContext()

    const actualTools = [...new Set(evalContext.map((item) => item.toolName))]

    const requiredTools = testCase.expected.requiredTools ?? []

    const forbiddenTools = testCase.expected.forbiddenTools ?? []

    const missingRequiredTools = requiredTools.filter(
      (toolName) => !actualTools.includes(toolName),
    )

    const usedForbiddenTools = forbiddenTools.filter((toolName) =>
      actualTools.includes(toolName),
    )

    const ragCalls = evalContext.filter(
      (item) => item.toolName === 'search_documents_semantic',
    )

    const ragScopePassed =
      testCase.expected.ragScope === undefined ||
      ragCalls.some(
        (item) =>
          (
            item.input as {
              scope?: string
            }
          )?.scope === testCase.expected.ragScope,
      )

    const ragCustomerIdPassed =
      testCase.expected.ragCustomerId === undefined ||
      ragCalls.some(
        (item) =>
          (
            item.input as {
              customerId?: string
            }
          )?.customerId === testCase.expected.ragCustomerId,
      )

    let otherCustomerDocumentsFound = false

    if (testCase.expected.forbidOtherCustomerDocuments) {
      for (const ragCall of ragCalls) {
        const content = ragCall.content as {
          results?: Array<{
            customerId?: string
          }>
        }

        for (const ragResult of content.results ?? []) {
          if (
            ragResult.customerId &&
            ragResult.customerId !== testCase.expected.ragCustomerId
          ) {
            otherCustomerDocumentsFound = true
          }
        }
      }
    }

    const customerIdPassed =
      testCase.expected.customerId === undefined ||
      context.conversationState.customerId === testCase.expected.customerId

    const topicPassed =
      testCase.expected.currentTopic === undefined ||
      context.conversationState.currentTopic === testCase.expected.currentTopic

    const globalRagUsed = ragCalls.some(
      (item) =>
        (
          item.input as {
            scope?: string
          }
        )?.scope === 'global',
    )

    const passed =
      missingRequiredAgents.length === 0 &&
      usedForbiddenAgents.length === 0 &&
      missingRequiredTools.length === 0 &&
      usedForbiddenTools.length === 0 &&
      customerIdPassed &&
      topicPassed &&
      ragScopePassed &&
      ragCustomerIdPassed &&
      !otherCustomerDocumentsFound &&
      !(testCase.expected.forbidGlobalRag && globalRagUsed)

    evaluationResults.push({
      caseId: testCase.id,

      passed,

      actualAgents: actualAgents.join(', '),

      missingRequiredAgents: missingRequiredAgents.join(', '),

      usedForbiddenAgents: usedForbiddenAgents.join(', '),

      actualTools: actualTools.join(', '),

      missingRequiredTools: missingRequiredTools.join(', '),

      usedForbiddenTools: usedForbiddenTools.join(', '),

      expectedCustomerId: testCase.expected.customerId,

      actualCustomerId: context.conversationState.customerId,

      expectedTopic: testCase.expected.currentTopic,

      actualTopic: context.conversationState.currentTopic,

      expectedRagScope: testCase.expected.ragScope,

      actualRagScopes: ragCalls
        .map(
          (item) =>
            (
              item.input as {
                scope?: string
              }
            )?.scope,
        )
        .filter(Boolean)
        .join(', '),

      expectedRagCustomerId: testCase.expected.ragCustomerId,

      actualRagCustomerIds: ragCalls
        .map(
          (item) =>
            (
              item.input as {
                customerId?: string
              }
            )?.customerId,
        )
        .filter(Boolean)
        .join(', '),

      otherCustomerDocumentsFound,

      answer: result.finalOutput?.message ?? '',
      forbidGlobalRag: testCase.expected.forbidGlobalRag ?? false,
    })

    console.log('[AGENTS]', actualAgents)
    console.log('[STATE]', context.conversationState)
  }

  console.table(
    evaluationResults.map((result) => ({
      caseId: result.caseId,
      passed: result.passed,
      actualAgents: result.actualAgents,
      actualTools: result.actualTools,
      expectedCustomerId: result.expectedCustomerId,
      actualCustomerId: result.actualCustomerId,
      expectedTopic: result.expectedTopic,
      actualTopic: result.actualTopic,
      expectedRagScope: result.expectedRagScope,
      actualRagScopes: result.actualRagScopes,
      expectedRagCustomerId: result.expectedRagCustomerId,
      actualRagCustomerIds: result.actualRagCustomerIds,
      otherCustomerDocumentsFound: result.otherCustomerDocumentsFound,
      forbidGlobalRag: result.forbidGlobalRag,
    })),
  )

  const failedResults = evaluationResults.filter((result) => !result.passed)

  if (failedResults.length > 0) {
    console.error('\nMulti-Agent evaluation failed')

    for (const result of failedResults) {
      console.error(`\n[${result.caseId}]`)

      if (result.missingRequiredAgents) {
        console.error(
          `Missing required agents: ${result.missingRequiredAgents}`,
        )
      }

      if (result.usedForbiddenAgents) {
        console.error(`Used forbidden agents: ${result.usedForbiddenAgents}`)
      }

      if (result.missingRequiredTools) {
        console.error(`Missing required tools: ${result.missingRequiredTools}`)
      }

      if (result.usedForbiddenTools) {
        console.error(`Used forbidden tools: ${result.usedForbiddenTools}`)
      }

      console.error(
        `CustomerId: expected=${result.expectedCustomerId}, actual=${result.actualCustomerId}`,
      )

      console.error(
        `Topic: expected=${result.expectedTopic}, actual=${result.actualTopic}`,
      )

      console.error(
        `RAG scope: expected=${result.expectedRagScope}, actual=${result.actualRagScopes}`,
      )

      console.error(
        `RAG customerId: expected=${result.expectedRagCustomerId}, actual=${result.actualRagCustomerIds}`,
      )

      console.error(
        `Other customer documents found: ${result.otherCustomerDocumentsFound}`,
      )

      console.error(`Answer: ${result.answer}`)
    }

    process.exit(1)
  }

  console.log('\nMulti-Agent evaluation passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
