import fs from 'fs/promises'
import path from 'path'

import { chunkText } from '../rag/chunk'
import { createEmbedding } from '../rag/embedding'

type DocumentMetadata = {
  file: string
  customerId?: string
  documentType: string
  date?: string
}

type VectorIndexItem = {
  file: string
  chunkIndex: number
  content: string
  embedding: number[]
  customerId?: string
  documentType: string
  date?: string
}

async function main() {
  const documentsDir = path.join(process.cwd(), 'data', 'documents')

  const metadataPath = path.join(
    process.cwd(),
    'data',
    'document-metadata.json',
  )

  const outputPath = path.join(process.cwd(), 'data', 'vector-index.json')

  const files = await fs.readdir(documentsDir)

  const metadata = JSON.parse(
    await fs.readFile(metadataPath, 'utf-8'),
  ) as DocumentMetadata[]

  const index: VectorIndexItem[] = []

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    const documentMetadata = metadata.find(
      (item) => path.basename(item.file) === file,
    )

    if (!documentMetadata) {
      console.warn(`[metadata missing] ${file}`)
      continue
    }

    console.log(`[index] ${file}`)

    const content = await fs.readFile(path.join(documentsDir, file), 'utf-8')

    const chunks = chunkText(content)

    for (const [chunkIndex, chunk] of chunks.entries()) {
      const embedding = await createEmbedding(chunk)

      index.push({
        file,
        chunkIndex,
        content: chunk,
        embedding,
        customerId: documentMetadata.customerId,
        documentType: documentMetadata.documentType,
        date: documentMetadata.date,
      })
    }
  }

  await fs.writeFile(outputPath, JSON.stringify(index), 'utf-8')

  console.log(`Vector index created: ${outputPath}`)
  console.log(`Chunks: ${index.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
