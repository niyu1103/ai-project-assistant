import { tool } from '@openai/agents'
import { z } from 'zod'

import customers from '@/data/customers.json'
import projects from '@/data/projects.json'

export const getProjectTool = tool({
  name: 'get_project',

  description:
    '顧客名から、その顧客に紐づくプロジェクト情報を取得します。進捗、ステータス、担当者、予算、次回マイルストーンなどを確認するときに使用してください。',

  parameters: z.object({
    customerName: z.string().describe('検索する顧客名'),
  }),

  async execute({ customerName }) {
    console.log('[get_project]', { customerName })

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

    const customerProjects = projects.filter(
      (project) => project.customerId === customer.id,
    )

    return {
      found: customerProjects.length > 0,
      customer: {
        id: customer.id,
        name: customer.name,
      },
      projects: customerProjects,
    }
  },
})
