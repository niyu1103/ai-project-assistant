import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

import { chunkText } from '@/rag/chunk'

export const searchDocumentsTool = tool({
  name: 'search_documents',

  description:
    '社内文書を検索します。契約書、議事録、社内ルール、プロジェクトメモなどから関連情報を調べるときに使用してください。',

  parameters: z.object({
    query: z.string().describe('検索したい内容'),
  }),

  async execute({ query }) {
    console.log('[search_documents]', { query })

    const documentsDir = path.join(process.cwd(), 'data', 'documents')

    const files = await fs.readdir(documentsDir)

    const results = []

    const keywords = query
      .toLowerCase()
      .replace(/[（）()、。,.]/g, ' ')
      .split(/\s+/)
      .filter((keyword) => keyword.length >= 2)

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const content = await fs.readFile(path.join(documentsDir, file), 'utf-8')

      const chunks = chunkText(content)

      chunks.forEach((chunk, index) => {
        const matchedKeywords = keywords.filter((keyword) =>
          chunk.toLowerCase().includes(keyword),
        )

        console.log('[search_documents_matchedKeywords]', {
          query,
          matchedKeywords,
        })
        const score = matchedKeywords.length
        if (matchedKeywords.length > 0) {
          results.push({
            file,
            chunkIndex: index,
            matchedKeywords,
            score,
            content: chunk,
          })
        }
      })
    }
    console.log('[search_documents_results]', {
      query,
      results: results.sort((a, b) => b.score - a.score).slice(0, 5),
    })
    return {
      query,
      results: results.sort((a, b) => b.score - a.score).slice(0, 5),
    }
  },
})
