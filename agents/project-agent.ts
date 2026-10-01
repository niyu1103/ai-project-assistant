import { Agent } from '@openai/agents'

export const projectAgent = new Agent({
  name: 'Project Assistant',
  model: 'gpt-5.6-luna',
  instructions: `
    あなたはプロジェクト管理を支援するAIアシスタントです。
    ユーザーの質問に日本語で、簡潔かつ分かりやすく回答してください。
  `,
})
