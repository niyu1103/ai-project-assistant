import { RunContext, tool } from '@openai/agents'
import { z } from 'zod'

import { assertCustomerAccess } from '@/lib/assert-customer-access'
import { addEvalContext } from '@/lib/eval-context'
import type { AgentContext } from '@/lib/agent-context'

import customers from '@/data/customers.json'
import projects from '@/data/projects.json'

export const getProjectTool = tool({
  name: 'get_project',

  description:
    '特定済みのcustomerIdから、その顧客に紐づくプロジェクト情報を取得します。進捗、ステータス、担当者、予算、次回マイルストーンなどを確認するときに使用してください。',

  parameters: z.object({
    customerId: z.string().describe('get_customer で特定済みの顧客ID'),
  }),

  async execute({ customerId }, runContext?: RunContext<AgentContext>) {
    console.log('[get_project]', { customerId })

    assertCustomerAccess(customerId, runContext)

    const customer = customers.find((customer) => customer.id === customerId)

    if (!customer) {
      const output = {
        found: false,
        message: `customerId=${customerId} に一致する顧客が見つかりませんでした。`,
      }

      addEvalContext('get_project', output, {
        customerId,
      })

      return output
    }

    const customerProjects = projects.filter(
      (project) => project.customerId === customer.id,
    )

    if (runContext) {
      runContext.context.conversationState.currentTopic = 'project'
    }

    const output = {
      found: customerProjects.length > 0,
      customer: {
        id: customer.id,
        name: customer.name,
      },
      projects: customerProjects,
    }

    addEvalContext('get_project', output, {
      customerId,
    })

    return output
  },
})
