import { run } from '@openai/agents'

import { customerAgent } from '@/agents/customer-agent'
import { knowledgeAgent } from '@/agents/knowledge-agent'
import type { AgentContext } from '@/lib/agent-context'
import { supervisorAgent } from '@/agents/supervisor-agent'

async function main() {
  const customerContext: AgentContext = {
    verifiedCustomerId: null,
    conversationState: {
      customerId: null,
      customerName: null,
      currentTopic: null,
    },
    eval: {
      failTools: [],
    },
  }

  console.log('\n=== Customer Agent ===')

  const customerResult = await run(
    customerAgent,
    '青空テックの契約内容を教えて',
    {
      context: customerContext,
    },
  )

  console.log(customerResult.finalOutput)
  console.log(customerContext.conversationState)

  const knowledgeContext: AgentContext = {
    verifiedCustomerId: null,
    conversationState: {
      customerId: null,
      customerName: null,
      currentTopic: null,
    },
    eval: {
      failTools: [],
    },
  }

  console.log('\n=== Knowledge Agent ===')

  const knowledgeResult = await run(
    knowledgeAgent,
    '全社共通のセキュリティポリシーを教えて',
    {
      context: knowledgeContext,
    },
  )

  console.log(knowledgeResult.finalOutput)

  console.log('\n=== Supervisor Agent / Customer ===')

  const supervisorCustomerContext: AgentContext = {
    verifiedCustomerId: null,
    conversationState: {
      customerId: null,
      customerName: null,
      currentTopic: null,
    },
    eval: {
      failTools: [],
    },
  }

  const supervisorCustomerResult = await run(
    supervisorAgent,
    '青空テックの契約内容を教えて',
    {
      context: supervisorCustomerContext,
    },
  )

  console.log(supervisorCustomerResult.finalOutput)
  console.log(supervisorCustomerContext.conversationState)

  console.log('\n=== Supervisor Agent / Knowledge ===')

  const supervisorKnowledgeContext: AgentContext = {
    verifiedCustomerId: null,
    conversationState: {
      customerId: null,
      customerName: null,
      currentTopic: null,
    },
    eval: {
      failTools: [],
    },
  }

  const supervisorKnowledgeResult = await run(
    supervisorAgent,
    '全社共通のセキュリティポリシーを教えて',
    {
      context: supervisorKnowledgeContext,
    },
  )

  console.log(supervisorKnowledgeResult.finalOutput)

  console.log('\n=== Supervisor Agent / Multiple Agents ===')

  const supervisorMultipleContext: AgentContext = {
    verifiedCustomerId: null,
    conversationState: {
      customerId: null,
      customerName: null,
      currentTopic: null,
    },
    eval: {
      failTools: [],
    },
  }

  const supervisorMultipleResult = await run(
    supervisorAgent,
    '青空テックのSSO更新手順と契約上のSLAを教えて',
    {
      context: supervisorMultipleContext,
    },
  )

  console.log(supervisorMultipleResult.finalOutput)
  console.log(supervisorMultipleContext.conversationState)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
