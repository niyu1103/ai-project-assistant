import { z } from 'zod'

const pendingActionSchema = z.object({
  type: z.literal('api_limit_request'),
  customerId: z.string(),
  customerName: z.string(),
  requestedLimit: z.number(),
  reason: z.string(),
})

export const actionAgentOutput = z.object({
  status: z.enum(['ready_for_approval', 'needs_clarification']),

  message: z.string(),

  sources: z.array(z.string()),

  pendingAction: pendingActionSchema.nullable(),
})
