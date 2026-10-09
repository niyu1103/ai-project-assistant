import { run } from '@openai/agents'
import { projectAgent } from '@/agents/project-agent'

export async function POST(request: Request) {
  const body = await request.json()

  const agentInput = body.reportContext
    ? `
      ユーザーの質問:
      ${body.message}

      以下はPDF月次報告書から抽出し、
      顧客マスタとの照合まで完了したデータです。

      <monthly_report>
      ${JSON.stringify(body.reportContext, null, 2)}
      </monthly_report>

      この月次報告書の情報を事実として使用してください。

      必要に応じてToolや社内文書検索を使用し、
      月次報告書だけでは判断できない運用ルール・契約条件などを確認してください。

      取得したContextにない条件は推測しないでください。
      `
    : body.message

  const result = await run(projectAgent, agentInput)

  const toolCalls = result.newItems
    .filter((item) => item.type === 'tool_call_item')
    .map((item) => {
      return item.rawItem.name
    })
  console.log('finalOutput', result.finalOutput)
  return Response.json({
    message: result.finalOutput?.message ?? '',
    sources: result.finalOutput?.sources ?? [],
    pendingAction: result.finalOutput?.pendingAction,
    toolCalls,
  })
}
