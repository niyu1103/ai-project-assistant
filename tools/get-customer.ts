import { tool } from '@openai/agents'
import { z } from 'zod'

import customers from '@/data/customers.json'

export const getCustomerTool = tool({
  name: 'get_customer',

  description: `顧客名から顧客情報を取得します。顧客の契約プラン、契約状態、担当者、更新日、リスクレベルなどを確認するときに使用してください。`,

  parameters: z.object({
    customerName: z.string().describe('検索する顧客名'),
  }),

  async execute({ customerName }) {
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

    return {
      found: true,
      customer,
    }
  },
})
