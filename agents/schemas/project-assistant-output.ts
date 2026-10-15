import { z } from 'zod'

const pendingActionSchema = z.object({
  type: z.literal('api_limit_request'),
  customerId: z.string(),
  customerName: z.string(),
  requestedLimit: z.number(),
  reason: z.string(),
})

export const projectAssistantOutput = z.object({
  message: z
    .string()
    .describe('ユーザーに表示する回答本文。Markdown形式で記述する'),

  sources: z
    .array(z.string())
    .describe(
      '回答の根拠として実際に使用した社内文書のfile名。社内文書を使用していない場合は空配列',
    ),
  pendingAction: pendingActionSchema.nullable(),
})
