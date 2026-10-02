type DatabricksSearchOptions = {
  customerId?: string
  documentType?: string
}

export async function searchDatabricksDocuments(
  query: string,
  numResults = 5,
  options: DatabricksSearchOptions = {},
): Promise<DatabricksSearchResult[]> {
  const host = process.env.DATABRICKS_HOST
  const token = process.env.DATABRICKS_TOKEN
  const indexName = process.env.DATABRICKS_INDEX_NAME

  if (!host || !token || !indexName) {
    throw new Error('Databricks environment variables are missing')
  }

  const url =
    `${host}/api/2.0/vector-search/indexes/` +
    `${encodeURIComponent(indexName)}/query`

  const filters: Record<string, string> = {}

  if (options.customerId) {
    filters.customer_id = options.customerId
  }

  if (options.documentType) {
    filters.document_type = options.documentType
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query_text: query,
      query_type: 'HYBRID',
      num_results: numResults,
      columns: ['content', 'file', 'customer_id', 'document_type'],

      ...(Object.keys(filters).length > 0 && {
        filters_json: JSON.stringify(filters),
      }),
    }),
  })

  if (!response.ok) {
    const text = await response.text()

    throw new Error(`Databricks AI Search failed: ${response.status} ${text}`)
  }

  const data = (await response.json()) as DatabricksSearchResponse

  const columns = data.manifest?.columns?.map((column) => column.name) ?? []

  const rows = data.result?.data_array ?? []

  return rows.map((row) => {
    const record = Object.fromEntries(
      columns.map((column, index) => [column, row[index]]),
    )

    return {
      content: String(record.content ?? ''),
      file: String(record.file ?? ''),
      customerId:
        record.customer_id == null ? null : String(record.customer_id),
      documentType: String(record.document_type ?? ''),
      score: Number(record.score ?? 0),
    }
  })
}
