import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

import { createEmbedding } from '@/rag/embedding'
import { cosineSimilarity } from '@/rag/cosine-similarity'
import customers from '@/data/customers.json'

type VectorIndexItem = {
  file: string
  chunkIndex: number
  content: string
  embedding: number[]
  customerId?: string
  documentType: string
}

export const searchDocumentsSemanticTool = tool({
  name: 'search_documents_semantic',

  description:
    '社内文書を意味検索します。質問と意味的に関連する契約書、議事録、社内ルール、プロジェクトメモを探すときに使用してください。',

  parameters: z.object({
    query: z.string().describe('検索したい内容'),

    customerName: z
      .string()
      .optional()
      .describe('特定顧客に絞り込む場合の顧客名'),

    documentType: z
      .string()
      .optional()
      .describe('contract, meeting, project_note などの文書種別'),
  }),

  async execute({ query, customerName, documentType }) {
    const indexPath = path.join(process.cwd(), 'data', 'vector-index.json')

    const rawIndex = await fs.readFile(indexPath, 'utf-8')

    let customerId: string | undefined

    if (customerName) {
      const customer = customers.find(
        (customer) =>
          customer.name.includes(customerName) ||
          customer.shortName.includes(customerName),
      )

      customerId = customer?.id
    }

    const index = JSON.parse(rawIndex) as VectorIndexItem[]

    let filteredIndex = index

    if (customerId) {
      filteredIndex = filteredIndex.filter(
        (item) => item.customerId === customerId,
      )
    }

    if (documentType) {
      filteredIndex = filteredIndex.filter(
        (item) => item.documentType === documentType,
      )
    }

    console.log('[search_documents_semantic]', {
      query,
      customerName,
      customerId,
      documentType,
      totalChunks: index.length,
      filteredChunks: filteredIndex.length,
    })

    // ★ 質問だけEmbeddingする
    const queryEmbedding = await createEmbedding(query)

    const results = filteredIndex.map((item) => ({
      file: item.file,
      chunkIndex: item.chunkIndex,
      content: item.content,
      customerId: item.customerId,
      documentType: item.documentType,
      similarity: cosineSimilarity(queryEmbedding, item.embedding),
    }))

    const topResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)

    console.log('===== FINAL TOP RESULTS =====')

    console.table(
      topResults.map((result) => ({
        file: result.file,
        chunkIndex: result.chunkIndex,
        similarity: result.similarity,
      })),
    )

    console.log('===== SEMANTIC SEARCH END =====')

    return {
      query,
      results: topResults,
    }
  },
})
