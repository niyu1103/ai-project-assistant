'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

type ReportResult = {
  customerId: string | null
  customerName: string
  reportMonth: string
  apiUsageRate: number | null
  slaRate: number | null
  incidentCount: number | null
  criticalIncidentCount: number | null
  ssoCertificateExpirationDate: string | null
  risks: string[]
  nextActions: string[]
}

type ApiError = {
  error: string
  extracted?: unknown
  master?: unknown
}

export default function ReportExtractorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [toolCalls, setToolCalls] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])

  async function handleAnalyze() {
    if (!result) return

    setAnalyzing(true)
    setAnalysis('')

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'この月次報告書から、今月注意すべき点を教えてください。',
          reportContext: result,
        }),
      })

      if (!response.ok) {
        throw new Error('Agent分析に失敗しました')
      }

      const data = await response.json()

      setAnalysis(data.message)
      setToolCalls(data.toolCalls ?? [])
      setSources(data.sources ?? [])
    } catch (error) {
      console.error(error)
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleExtract() {
    if (!file) return

    setLoading(true)
    setResult(null)
    setError('')
    setAnalysis('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/extract-report', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        const apiError = data as ApiError
        setError(apiError.error || 'PDF解析に失敗しました')
        return
      }

      setResult(data)
    } catch (error) {
      console.error(error)
      setError('PDF解析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='mx-auto w-full max-w-3xl px-6 py-8'>
      <h1 className='mb-6 text-2xl font-bold'>Monthly Report Extractor</h1>

      <div className='space-y-4'>
        <div className='space-y-3'>
          <div className='flex items-center gap-3'>
            <label
              htmlFor='pdf-file'
              className='cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50'
            >
              ファイルを選択
            </label>

            <input
              id='pdf-file'
              type='file'
              accept='application/pdf,image/png,image/jpeg,image/webp'
              className='hidden'
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setResult(null)
                setError('')
                setAnalysis('')
              }}
            />

            <button
              type='button'
              onClick={handleExtract}
              disabled={!file || loading}
              className='rounded bg-black px-4 py-2 text-white disabled:opacity-50'
            >
              {loading ? '解析中...' : 'ファイルを解析'}
            </button>
          </div>

          {file && (
            <div className='rounded-lg border bg-gray-50 px-4 py-3'>
              <p className='text-xs text-gray-500'>選択中のファイル</p>

              <p className='mt-1 break-all text-sm font-medium'>{file.name}</p>
            </div>
          )}
        </div>
      </div>
      {result && (
        <section className='mt-8'>
          <h2 className='mb-4 text-lg font-bold'>抽出結果</h2>

          <pre className='overflow-auto rounded bg-gray-100 p-4 text-sm'>
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}

      {result && (
        <button
          type='button'
          onClick={handleAnalyze}
          disabled={analyzing}
          className='mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50'
        >
          {analyzing ? '分析中...' : 'Agentに分析してもらう'}
        </button>
      )}
      {analysis && (
        <section className='mt-8'>
          <h2 className='mb-4 text-lg font-bold'>Agent分析</h2>

          <div className='rounded bg-gray-100 p-4 whitespace-pre-wrap'>
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>

          <div>
            <h3 className='mt-4 text-md font-bold'>使用されたツール</h3>
            <ul className='list-disc list-inside'>
              {toolCalls.map((call, index) => (
                <li key={index}>{call}</li>
              ))}
            </ul>

            <h3 className='mt-4 mb-2 text-md font-bold'>参照元</h3>
            <ul className='list-disc list-inside'>
              {sources.map((source, index) => (
                <li key={index}>{source}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {error && (
        <div className='mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700'>
          <p className='font-bold'>解析できませんでした</p>
          <p className='mt-1'>{error}</p>
        </div>
      )}
    </main>
  )
}
