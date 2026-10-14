export type ConversationState = {
  customerId: string | null
  customerName: string | null
  currentTopic: 'contract' | 'project' | 'incident' | 'api_usage' | null
}

export type AgentContext = {
  verifiedCustomerId: string | null

  conversationState: ConversationState

  eval?: {
    failTools?: string[]
  }
}
