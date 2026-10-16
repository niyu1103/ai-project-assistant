import { run } from '@openai/agents'

import { monthlyReportAgent } from '@/agents/monthly-report-agent'
import type { AgentContext, ConversationState } from '@/lib/agent-context'
import { runRoutedAgent } from '@/lib/run-routed-agent'

const conversationStates = new Map<string, ConversationState>()

export async function POST(request: Request) {
  const body = await request.json()

  const conversationId = body.conversationId ?? crypto.randomUUID()

  const previousState = conversationStates.get(conversationId) ?? {
    customerId: null,
    customerName: null,
    currentTopic: null,
  }

  const reportCustomerId =
    body.reportContext?.customerVerified === true
      ? body.reportContext.customerId
      : null

  const reportCustomerName =
    body.reportContext?.customerVerified === true
      ? (body.reportContext.customerName ?? null)
      : null

  const context: AgentContext = {
    verifiedCustomerId: reportCustomerId ?? previousState.customerId,

    conversationState: {
      customerId: reportCustomerId ?? previousState.customerId,

      customerName: reportCustomerName ?? previousState.customerName,

      currentTopic: previousState.currentTopic,
    },

    eval: {
      failTools: [],
    },
  }

  const conversationContext = `
現在の会話状態:
- customerId: ${context.conversationState.customerId ?? '未設定'}
- customerName: ${context.conversationState.customerName ?? '未設定'}
- currentTopic: ${context.conversationState.currentTopic ?? '未設定'}

会話状態に顧客が設定されていて、
ユーザーが新しい顧客名を明示していない場合は、
その顧客についての続きの質問として扱ってください。

ユーザーが別の顧客名を明示した場合は、
保存済みの顧客をそのまま使わず、
get_customer で新しい顧客を確認してください。
`

  const agentInput = body.reportContext
    ? `
${conversationContext}

ユーザーの質問:
${body.message}

以下はPDF月次報告書から抽出し、
顧客マスタとの照合まで完了したデータです。

<monthly_report>
${JSON.stringify(body.reportContext, null, 2)}
</monthly_report>

この月次報告書の情報を事実として使用してください。

必要に応じてToolや社内文書検索を使用し、
月次報告書だけでは判断できない
運用ルール・契約条件などを確認してください。

取得したContextにない条件は推測しないでください。
`
    : `
${conversationContext}

ユーザーの質問:
${body.message}
`

  const execution = body.reportContext
    ? {
        route: 'monthly_report' as const,
        result: await run(monthlyReportAgent, agentInput, {
          context,
        }),
      }
    : await runRoutedAgent(agentInput, context)

  const { route, result } = execution

  const toolCalls = result.newItems
    .filter((item) => item.type === 'tool_call_item')
    .map((item) => {
      const rawItem = item.rawItem

      if (rawItem.type === 'function_call') {
        return rawItem.name
      }

      return null
    })
    .filter((name): name is string => name !== null)

  conversationStates.set(conversationId, context.conversationState)

  console.log('[route]', route)

  console.log('[conversation:saved]', {
    conversationId,
    state: context.conversationState,
  })

  console.log('[toolCalls]', toolCalls)

  console.log('[finalOutput]', result.finalOutput)

  return Response.json({
    conversationId,
    route,

    message: result.finalOutput?.message ?? '',

    sources: result.finalOutput?.sources ?? [],

    pendingAction: result.finalOutput?.pendingAction ?? null,

    toolCalls,
  })
}
