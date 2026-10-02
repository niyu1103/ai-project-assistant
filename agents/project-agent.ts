import { Agent } from '@openai/agents'

import { getCustomerTool } from '@/tools/get-customer'
import { getProjectTool } from '@/tools/get-project'
import { getContractTool } from '@/tools/get-contract'
import { getIncidentsTool } from '@/tools/get-incidents'
import { searchDocumentsTool } from '@/tools/search-documents'
import { searchDocumentsSemanticTool } from '@/tools/search-documents-semantic'

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

    社内文書、契約書、議事録、ルールなどの内容を確認する必要がある場合は、
    search_documents を使用してください。

    社内文書に関する質問では
    search_documents_semantic を使用してください。

    顧客名が含まれる社内文書検索では、
    必要に応じて get_customer を使って customerId を取得し、
    search_documents_semantic の customerId に指定してください。

    特定顧客の質問では、
    他の顧客の文書を混在させないでください。
  `,

  tools: [
    getCustomerTool,
    getProjectTool,
    getContractTool,
    getIncidentsTool,
    searchDocumentsTool,
    searchDocumentsSemanticTool,
  ],
})
