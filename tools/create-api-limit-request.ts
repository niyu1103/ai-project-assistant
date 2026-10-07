import { tool } from '@openai/agents'
import { z } from 'zod'
import { addEvalContext } from '@/lib/eval-context'

export const createApiLimitRequest = tool({
  name: 'create_api_limit_request',

  description:
    '顧客のAPI利用上限変更申請を外部システムへ作成します。実行系のToolです。',

  parameters: z.object({
    customerId: z.string(),
    requestedLimit: z.number().int().positive(),
    reason: z.string(),
    approved: z.boolean(),
  }),

  execute: async ({ customerId, requestedLimit, reason, approved }) => {
    if (!approved) {
      return {
        status: 'approval_required',
        message: '人間の承認が必要です。',
        request: {
          customerId,
          requestedLimit,
          reason,
        },
      }
    }

    const response = await fetch('http://127.0.0.1:8001/api-limit-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        requestedLimit,
        reason,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create API limit request: ${response.status}`)
    }

    const output = await response.json()

    addEvalContext('create_api_limit_request', output, {
      customerId,
      requestedLimit,
      reason,
      approved,
    })

    return output
  },
})
