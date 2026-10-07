import { Agent } from '@openai/agents'
import { z } from 'zod'

import { getCustomerTool } from '@/tools/get-customer'
import { getProjectTool } from '@/tools/get-project'
import { getContractTool } from '@/tools/get-contract'
import { getIncidentsTool } from '@/tools/get-incidents'
import { searchDocumentsTool } from '@/tools/search-documents'
import { searchDocumentsSemanticTool } from '@/tools/search-documents-semantic'
import { getApiUsage } from '@/tools/get-api-usage'
import { createApiLimitRequest } from '@/tools/create-api-limit-request'

const pendingActionSchema = z.object({
  type: z.literal('api_limit_request'),
  customerId: z.string(),
  customerName: z.string(),
  requestedLimit: z.number(),
  reason: z.string(),
})

export const projectAssistantOutput = z.object({
  message: z
    .string()
    .describe('ユーザーに表示する回答本文。Markdown形式で記述する'),

  sources: z
    .array(z.string())
    .describe(
      '回答の根拠として実際に使用した社内文書のfile名。社内文書を使用していない場合は空配列',
    ),
  pendingAction: pendingActionSchema.nullable(),
})

export const projectAgent = new Agent({
  name: 'Project Assistant',
  model: 'gpt-5.6-luna',

  instructions: `
あなたはプロジェクト管理を支援するAIアシスタントです。

## 基本方針

- 顧客に関する質問では、推測せず利用可能なToolを使って確認してください。
- ユーザーの質問に複数の論点がある場合、各論点に必要な根拠が揃っているか確認してください。
- 取得したContextにない具体的な手順、推奨、制約を一般論として補わないでください。
- 回答は日本語で、簡潔かつ分かりやすく記述してください。

## Toolの使い分け

- 契約に関する質問では get_contract を使用してください。
- プロジェクト状況に関する質問では get_project を使用してください。
- 障害やトラブルに関する質問では get_incidents を使用してください。
- 顧客の現在のAPI利用状況、利用率、プラン上限を確認する場合は get_api_usage を使用してください。

## 社内文書検索

社内文書、契約書、議事録、社内ルール、
プロジェクトメモなどを確認する必要がある場合は、
search_documents_semantic を使用してください。

- 特定顧客の検索では customerName を指定してください。
- 特定顧客の質問では、他の顧客の文書を回答根拠に使用しないでください。
- 文書種別が明確な場合は documentType を指定してください。
- SSO証明書の運用、更新、期限管理では operation_guide を優先してください。
- 検索結果が0件の場合、同じdocumentTypeに固定して繰り返さず、
  documentTypeを外すか別の適切な文書種別で再検索してください。

## 顧客固有情報と共通ルール

- 顧客固有の条件は契約情報を確認してください。
- 一般運用ルールや共通手順は社内ポリシーや運用ガイドを確認してください。

## Sources

- 社内文書を回答根拠として使用した場合、
  実際に使用した文書のfile名だけを sources に含めてください。
- 検索結果に含まれていても、回答根拠に使っていない文書は sources に含めないでください。
- 社内文書を使用していない場合、sources は空配列にしてください。
- message には参照文書名や出典一覧を含めないでください。

## 外部システム変更と承認

API利用上限変更など、外部システムの状態を変更する操作は、
Agent自身で直接実行してはいけません。

変更操作が必要な場合は、

1. 対象顧客を確認する
2. 現在の状態を確認する
3. 実行予定の内容を pendingAction に設定する
4. ユーザーの承認を待つ

pendingAction を返した時点では、
外部APIへのPOST処理を実行しないでください。

実際の更新処理は、
ユーザー承認後に別の承認処理から実行されます。

通常の回答では pendingAction は null にしてください。
`,

  tools: [
    getCustomerTool,
    getProjectTool,
    getContractTool,
    getIncidentsTool,
    searchDocumentsTool,
    searchDocumentsSemanticTool,
    getApiUsage,
    createApiLimitRequest,
  ],

  outputType: projectAssistantOutput,
})
