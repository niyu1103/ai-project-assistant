import { Agent } from '@openai/agents'
import { z } from 'zod'

import { getCustomerTool } from '@/tools/get-customer'
import { getProjectTool } from '@/tools/get-project'
import { getContractTool } from '@/tools/get-contract'
import { getIncidentsTool } from '@/tools/get-incidents'
import { searchDocumentsTool } from '@/tools/search-documents'
import { searchDocumentsSemanticTool } from '@/tools/search-documents-semantic'

export const projectAssistantOutput = z.object({
  message: z
    .string()
    .describe('ユーザーに表示する回答本文。Markdown形式で記述する'),

  sources: z
    .array(z.string())
    .describe(
      '回答の根拠として実際に使用した社内文書のfile名。社内文書を使用していない場合は空配列',
    ),
})

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

  社内文書、契約書、議事録、社内ルール、
  プロジェクトメモなどの内容を確認する必要がある場合は、
  search_documents_semantic を使用してください。

  特定顧客の社内文書を検索する場合は、
  search_documents_semantic の customerName に顧客名を指定してください。

  文書種別が明確な場合は、
  必要に応じて documentType を指定してください。

  特定顧客の質問では、
  他の顧客の文書を回答根拠として使用しないでください。

  社内文書を回答の根拠として使用した場合は、
  実際に回答の根拠として使用した文書の file 名だけを
  sources に含めてください。

  検索結果に含まれていても、
  回答の根拠として使用していない文書は
  sources に含めないでください。

  社内文書を使用しなかった場合は、
  sources は空配列にしてください。

  message には参照文書名、出典一覧、
  「参照文書」セクションを含めないでください。
  参照文書は必ず sources にのみ格納してください。

  文書に記載されていない内容を、
  文書に書かれているかのように回答しないでください。

  ユーザーの質問には日本語で、
  簡潔かつ分かりやすく回答してください。

   ユーザーの質問に複数の論点が含まれる場合、
  1つのTool結果だけで十分と判断しないでください。
  回答前に、質問の各論点に必要な根拠が揃っているか確認してください。

  顧客固有の条件は契約情報を確認し、
  一般運用ルールや共通手順は社内ポリシーや運用ガイドも確認してください。

  SSO証明書の運用、更新、期限管理に関する質問では、
  operation_guide を優先して検索してください。

  検索結果が0件の場合は、
  同じdocumentTypeに固定して繰り返し検索せず、
  documentTypeを外すか、別の適切な文書種別で再検索してください。

  取得したContextにない具体的な手順、推奨、制約を
  一般論として補わないでください。
`,

  tools: [
    getCustomerTool,
    getProjectTool,
    getContractTool,
    getIncidentsTool,
    searchDocumentsTool,
    searchDocumentsSemanticTool,
  ],

  outputType: projectAssistantOutput,
})
