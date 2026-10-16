import { customerOperationsAgent } from '@/agents/customer-operations-agent'
import { supervisorRouterAgent } from '@/agents/supervisor-router-agent'
import { actionAgent } from '@/agents/action-agent'
import type { AgentContext } from '@/lib/agent-context'
import { run } from '@openai/agents'

export async function runRoutedAgent(input: string, context: AgentContext) {
  const routingResult = await run(supervisorRouterAgent, input, {
    context,
  })

  const route = routingResult.finalOutput?.route

  switch (route) {
    case 'customer_operations': {
      const result = await run(customerOperationsAgent, input, {
        context,
      })

      return {
        route,
        result,
      }
    }

    case 'action': {
      const result = await run(actionAgent, input, {
        context,
      })

      return {
        route,
        result,
      }
    }

    default:
      throw new Error(`Unsupported route: ${route}`)
  }
}
