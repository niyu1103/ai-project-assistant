'use client'

import { FormEvent, useState } from 'react'
import ReactMarkdown from 'react-markdown'

type PendingAction = {
  type: 'api_limit_request'
  customerId: string
  customerName: string
  requestedLimit: number
  reason: string
}

type ApprovalResult = {
  requestId: string
  customerId: string
  requestedLimit: number
  reason: string
  status: string
}

export default function Home() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolCalls, setToolCalls] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(
    null,
  )

  const statusLabel = {
    pending: '申請受付済み',
    approved: '承認済み',
    rejected: '却下',
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim()) return

    setLoading(true)
    setAnswer('')
    setToolCalls([])
    setSources([])
    setPendingAction(null)
    setApprovalResult(null)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
        }),
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()

      setAnswer(data.message)
      setSources(data.sources ?? [])
      setToolCalls(data.toolCalls ?? [])
      setPendingAction(data.pendingAction ?? null)
    } catch (error) {
      console.error(error)
      setAnswer('エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!pendingAction) return

    const response = await fetch('/api/agent/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pendingAction),
    })

    if (!response.ok) {
      throw new Error('申請に失敗しました')
    }

    const result = await response.json()

    console.log('agent response', result)
    setApprovalResult(result)
    setPendingAction(null)
  }

  return (
    <main className='mx-auto w-full max-w-3xl px-6 py-8'>
      <h1 className='mb-6 text-2xl font-bold'>AI Project Assistant</h1>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder='質問を入力してください'
          className='min-h-32 w-full rounded border p-3'
        />

        <button
          type='submit'
          disabled={loading}
          className='rounded bg-black px-4 py-2 text-white disabled:opacity-50'
        >
          {loading ? '考え中...' : '送信'}
        </button>
      </form>

      {toolCalls.length > 0 && (
        <section className='mt-8'>
          <h2 className='mb-2 font-bold'>Agent activity</h2>

          <ul className='space-y-2'>
            {toolCalls.map((toolName, index) => (
              <li key={`${toolName}-${index}`} className='rounded border p-3'>
                ✓ {toolName}
              </li>
            ))}
          </ul>
        </section>
      )}

      {answer && (
        <section className='mt-8'>
          <h2 className='mb-2 font-bold'>回答</h2>

          <div className='answer'>
            <ReactMarkdown
              components={{
                code({ children }) {
                  return <code className='source-file'>{children}</code>
                },
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>

          {sources.length > 0 && (
            <div className='sources'>
              <h3>参照文書</h3>

              <ul>
                {sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {approvalResult && (
        <div className='mt-6 rounded-xl border bg-green-50 p-5'>
          <h3 className='font-bold'>申請を受け付けました</h3>

          <div className='mt-3 space-y-2 text-sm'>
            <p>
              <span className='font-semibold'>申請ID:</span>{' '}
              {approvalResult.requestId}
            </p>

            <p>
              <span className='font-semibold'>申請上限:</span>{' '}
              {approvalResult.requestedLimit.toLocaleString()}件
            </p>

            <p>
              <span className='font-semibold'>ステータス:</span>{' '}
              <span>
                {statusLabel[
                  approvalResult.status as keyof typeof statusLabel
                ] ?? approvalResult.status}
              </span>
            </p>

            <p>
              <span className='font-semibold'>理由:</span>{' '}
              {approvalResult.reason}
            </p>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl'>
            <h3 className='text-lg font-bold'>実行確認</h3>

            <p className='mt-4'>
              {pendingAction.customerName} のAPI上限を{' '}
              {pendingAction.requestedLimit.toLocaleString()}
              件に変更申請します。
            </p>

            <div className='mt-4 rounded-lg bg-gray-50 p-4 text-sm'>
              <p>
                <span className='font-semibold'>顧客:</span>{' '}
                {pendingAction.customerName}
              </p>

              <p className='mt-2'>
                <span className='font-semibold'>申請上限:</span>{' '}
                {pendingAction.requestedLimit.toLocaleString()}件
              </p>

              <p className='mt-2'>
                <span className='font-semibold'>理由:</span>{' '}
                {pendingAction.reason}
              </p>
            </div>

            <p className='mt-4 text-sm text-gray-600'>
              承認すると、外部システムへ変更申請を送信します。
            </p>

            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setPendingAction(null)}
                className='rounded border px-4 py-2'
              >
                キャンセル
              </button>

              <button
                type='button'
                onClick={handleApprove}
                className='rounded bg-black px-4 py-2 text-white'
              >
                承認して実行
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
