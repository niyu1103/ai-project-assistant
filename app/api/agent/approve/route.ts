import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  type: z.literal('api_limit_request'),
  customerId: z.string(),
  customerName: z.string(),
  requestedLimit: z.number().int().positive(),
  reason: z.string(),
})

export async function POST(request: Request) {
  const body = await request.json()

  const action = schema.parse(body)

  const response = await fetch('http://127.0.0.1:8001/api-limit-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId: action.customerId,
      requestedLimit: action.requestedLimit,
      reason: action.reason,
    }),
  })

  if (!response.ok) {
    return NextResponse.json(
      {
        error: 'API上限変更申請に失敗しました',
      },
      {
        status: response.status,
      },
    )
  }

  const result = await response.json()

  return NextResponse.json(result)
}
