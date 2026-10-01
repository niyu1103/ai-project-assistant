'use client'

import { FormEvent, useState } from 'react'

export default function Home() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [toolCalls, setToolCalls] = useState<string[]>([])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim()) return

    setLoading(true)
    setAnswer('')
    setToolCalls([])

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
      setToolCalls(data.toolCalls)
    } catch (error) {
      console.error(error)
      setAnswer('エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='mx-auto max-w-2xl p-8'>
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

          <div className='whitespace-pre-wrap rounded border p-4'>{answer}</div>
        </section>
      )}
    </main>
  )
}
