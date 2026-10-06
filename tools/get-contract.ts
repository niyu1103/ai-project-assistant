import { tool } from '@openai/agents'
import { z } from 'zod'

import customers from '@/data/customers.json'
import contracts from '@/data/contracts.json'

import { addEvalContext } from '@/lib/eval-context'

export const getContractTool = tool({
  name: 'get_contract',

  description:
    '顧客名から契約情報を取得します。契約期間、自動更新、解約通知期限、SLA、サポート条件、特約などを確認するときに使用してください。',

  parameters: z.object({
    customerName: z.string().describe('検索する顧客名'),
  }),

  async execute({ customerName }) {
    console.log('[get_contract]', { customerName })

    const customer = customers.find(
      (customer) =>
        customer.name.includes(customerName) ||
        customer.shortName.includes(customerName),
    )

    if (!customer) {
      return {
        found: false,
        message: `${customerName}に一致する顧客が見つかりませんでした。`,
      }
    }

    const contract = contracts.find(
      (contract) => contract.customerId === customer.id,
    )

    if (!contract) {
      return {
        found: false,
        message: `${customer.name}の契約情報が見つかりませんでした。`,
      }
    }

    const output = {
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
      },
      contract,
    }

    addEvalContext('get_contract', output, {
      customerName,
    })

    return output
  },
})
