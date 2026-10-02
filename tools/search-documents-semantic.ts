import { tool } from '@openai/agents'
import { z } from 'zod'

import customers from '@/data/customers.json'
import { searchDatabricksDocuments } from '@/lib/databricks'

export const searchDocumentsSemanticTool = tool({
  name: 'search_documents_semantic',

  description:
    'Databricks AI Searchを使って社内文書を意味検索します。契約書、議事録、社内ルール、プロジェクトメモなどを検索するときに使用してください。',

  parameters: z.object({
    query: z.string().describe('検索したい内容'),

    customerName: z
      .string()
      .optional()
      .describe('特定顧客に絞り込む場合の顧客名'),

    documentType: z
      .string()
      .optional()
      .describe('contract, meeting, project, policy, faq などの文書種別'),
  }),

  async execute({ query, customerName, documentType }) {
    let customerId: string | undefined

    if (customerName) {
      const customer = customers.find(
        (customer) =>
          customer.name.includes(customerName) ||
          customer.shortName.includes(customerName),
      )

      customerId = customer?.id
    }

    console.log('[search_documents_semantic]', {
      query,
      customerName,
      customerId,
      documentType,
    })

    const results = await searchDatabricksDocuments(query, 5, {
      customerId,
      documentType,
    })

    console.table(
      results.map((result) => ({
        file: result.file,
        documentType: result.documentType,
        customerId: result.customerId,
        score: result.score,
      })),
    )

    return {
      results,
    }
  },
})
