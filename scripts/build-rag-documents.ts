import fs from 'fs/promises'
import path from 'path'

import { chunkText } from '../rag/chunk'

type DocumentMetadata = {
  file: string
  documentType: string
  customerId?: string
  language?: string
  confidentiality?: string
}

type RagDocument = {
  id: string
  file: string
  chunk_index: number
  content: string
  customer_id?: string
  document_type: string
  language?: string
  confidentiality?: string
}

async function main() {
  const documentsDir = path.join(process.cwd(), 'data', 'documents')

  const metadataPath = path.join(
    process.cwd(),
    'data',
    'document-metadata.json',
  )

  const outputPath = path.join(process.cwd(), 'data', 'rag-documents.json')

  const files = await fs.readdir(documentsDir)

  const metadata = JSON.parse(
    await fs.readFile(metadataPath, 'utf-8'),
  ) as DocumentMetadata[]

  const ragDocuments: RagDocument[] = []

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    const documentMetadata = metadata.find(
      (item) => path.basename(item.file) === file,
    )

    if (!documentMetadata) {
      console.warn(`[metadata missing] ${file}`)
      continue
    }

    console.log(`[document] ${file}`)

    const content = await fs.readFile(path.join(documentsDir, file), 'utf-8')

    const chunks = chunkText(content)

    for (const [chunkIndex, chunk] of chunks.entries()) {
      const fileNameWithoutExtension = path.parse(file).name

      ragDocuments.push({
        id: `${fileNameWithoutExtension}_${chunkIndex}`,
        file,
        chunk_index: chunkIndex,
        content: chunk,
        customer_id: documentMetadata.customerId,
        document_type: documentMetadata.documentType,
        language: documentMetadata.language,
        confidentiality: documentMetadata.confidentiality,
      })
    }
  }

  await fs.writeFile(outputPath, JSON.stringify(ragDocuments, null, 2), 'utf-8')

  console.log('')
  console.log(`RAG documents created: ${outputPath}`)
  console.log(`Chunks: ${ragDocuments.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
