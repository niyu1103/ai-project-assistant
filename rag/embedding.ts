import { openai } from '@/lib/openai'

export async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replaceAll('\n', ' '),
    encoding_format: 'float',
  })
  // console.log('[createEmbedding]', response.data[0])
  return response.data[0].embedding
}
