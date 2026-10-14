import { RunContext, tool } from '@openai/agents'
import { assertCustomerAccess } from '@/lib/assert-customer-access'
import { z } from 'zod'

import customers from '@/data/customers.json'
import contracts from '@/data/contracts.json'

import { addEvalContext } from '@/lib/eval-context'
import type { AgentContext } from '@/lib/agent-context'

export const getContractTool = tool({
  name: 'get_contract',

  description:
    '特定済みのcustomerIdから契約情報を取得します。契約期間、自動更新、解約通知期限、SLA、サポート条件、特約などを確認するときに使用してください。',

  parameters: z.object({
    customerId: z.string().describe('get_customer で特定済みの顧客ID'),
  }),

  async execute({ customerId }, runContext?: RunContext<AgentContext>) {
    console.log('[get_contract]', { customerId })

    assertCustomerAccess(customerId, runContext)

    if (runContext?.context.eval?.failTools?.includes('get_contract')) {
      throw new Error('Injected tool failure: get_contract')
    }

    const customer = customers.find((customer) => customer.id === customerId)

    if (!customer) {
      return {
        found: false,
        message: `customerId=${customerId} に一致する顧客が見つかりませんでした。`,
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

    if (runContext) {
      runContext.context.conversationState.currentTopic = 'contract'
    }

    addEvalContext('get_contract', output, {
      customerId,
    })

    return output
  },
})
