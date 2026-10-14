import { RunContext, tool } from '@openai/agents'
import { assertCustomerAccess } from '@/lib/assert-customer-access'
import { z } from 'zod'

import customers from '@/data/customers.json'
import incidents from '@/data/incidents.json'

import { addEvalContext } from '@/lib/eval-context'
import type { AgentContext } from '@/lib/agent-context'

export const getIncidentsTool = tool({
  name: 'get_incidents',

  description:
    '特定済みのcustomerIdから、その顧客に関連する障害履歴を取得します。重大障害、原因、影響、再発防止策などを確認するときに使用してください。',

  parameters: z.object({
    customerId: z.string().describe('get_customer で特定済みの顧客ID'),
  }),

  async execute({ customerId }, runContext?: RunContext<AgentContext>) {
    console.log('[get_incidents]', { customerId })

    assertCustomerAccess(customerId, runContext)

    const customer = customers.find((customer) => customer.id === customerId)

    if (!customer) {
      return {
        found: false,
        message: `customerId=${customerId} に一致する顧客が見つかりませんでした。`,
      }
    }

    const customerIncidents = incidents.filter(
      (incident) => incident.customerId === customer.id,
    )

    const output = {
      found: customerIncidents.length > 0,
      customer: {
        id: customer.id,
        name: customer.name,
      },
      incidents: customerIncidents,
    }
    if (runContext) {
      runContext.context.conversationState.currentTopic = 'incident'
    }

    addEvalContext('get_incidents', output)

    return output
  },
})
