import { RunContext, tool } from '@openai/agents'
import { z } from 'zod'

import customers from '@/data/customers.json'
import type { AgentContext } from '@/lib/agent-context'

export const getCustomerTool = tool({
  name: 'get_customer',

  description:
    'ユーザーが指定した顧客名を顧客マスタと照合し、正式な顧客情報とcustomerIdを特定します。顧客名、略称、別名の解決に使用してください。',

  parameters: z.object({
    customerName: z.string().describe('検索する顧客名'),
  }),

  async execute({ customerName }, runContext?: RunContext<AgentContext>) {
    function normalizeCustomerName(value: string) {
      return value.trim().replace(/\s+/g, '')
    }

    const normalizedInput = normalizeCustomerName(customerName)

    const customer = customers.find((customer) => {
      const candidateNames = [
        customer.name,
        customer.shortName,
        ...(customer.aliases ?? []),
      ]

      return candidateNames.some(
        (name) => normalizeCustomerName(name) === normalizedInput,
      )
    })

    if (!customer) {
      return {
        found: false,
        message: `${customerName}に一致する顧客が見つかりませんでした。`,
      }
    }
    if (!runContext) {
      throw new Error('RunContext is not available')
    }

    runContext.context.verifiedCustomerId = customer.id

    runContext.context.conversationState.customerId = customer.id
    runContext.context.conversationState.customerName = customer.name

    console.log('[get_customer] verifiedCustomerId set', {
      verifiedCustomerId: customer.id,
    })

    return {
      found: true,
      customer,
    }
  },
})
