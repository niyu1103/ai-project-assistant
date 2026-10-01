import { run } from '@openai/agents'
import { projectAgent } from '@/agents/project-agent'

export async function POST(request: Request) {
  const body = await request.json()

  const result = await run(projectAgent, body.message)

  const toolCalls = result.newItems
    .filter((item) => item.type === 'tool_call_item')
    .map((item) => {
      return item.rawItem.name
    })

  return Response.json({
    message: result.finalOutput,
    toolCalls,
  })
}
