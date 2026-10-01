import { Agent } from '@openai/agents'

import { getCustomerTool } from '@/tools/get-customer'
import { getProjectTool } from '@/tools/get-project'
import { getContractTool } from '@/tools/get-contract'
import { getIncidentsTool } from '@/tools/get-incidents'

export const projectAgent = new Agent({
  name: 'Project Assistant',
  model: 'gpt-5.6-luna',

  instructions: `
    あなたはプロジェクト管理を支援するAIアシスタントです。

    顧客に関する質問を受けた場合は、
    推測せず、利用可能なツールを使って必要な情報を確認してください。

    契約に関する質問では契約情報を、
    プロジェクト状況に関する質問ではプロジェクト情報を、
    障害やトラブルに関する質問では障害履歴を確認してください。

    複数の情報が必要な質問では、
    必要に応じて複数のツールを使用してください。

    ユーザーの質問には日本語で、
    簡潔かつ分かりやすく回答してください。
  `,

  tools: [getCustomerTool, getProjectTool, getContractTool, getIncidentsTool],
})
