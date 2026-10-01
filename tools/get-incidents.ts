import { tool } from '@openai/agents'
import { z } from 'zod'

import customers from '@/data/customers.json'
import incidents from '@/data/incidents.json'

export const getIncidentsTool = tool({
  name: 'get_incidents',

  description:
    '顧客名から、その顧客に関連する障害履歴を取得します。重大障害、原因、影響、再発防止策などを確認するときに使用してください。',

  parameters: z.object({
    customerName: z.string().describe('検索する顧客名'),
  }),

  async execute({ customerName }) {
    console.log('[get_incidents]', { customerName })

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

    const customerIncidents = incidents.filter(
      (incident) => incident.customerId === customer.id,
    )

    return {
      found: customerIncidents.length > 0,
      customer: {
        id: customer.id,
        name: customer.name,
      },
      incidents: customerIncidents,
    }
  },
})
