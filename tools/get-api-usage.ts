import { tool } from '@openai/agents'
import { z } from 'zod'
import { addEvalContext } from '@/lib/eval-context'

export const getApiUsage = tool({
  name: 'get_api_usage',
  description:
    '顧客の現在のAPI利用状況、前月利用量、利用率、プラン上限、ステータスを外部APIから取得します。',

  parameters: z.object({
    customerId: z.string(),
  }),

  execute: async ({ customerId }) => {
    const response = await fetch(
      `http://127.0.0.1:8001/customers/${customerId}/api-usage`,
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch API usage: ${response.status}`)
    }

    const output = await response.json()

    addEvalContext('get_api_usage', output, { customerId })

    return output
  },
})
