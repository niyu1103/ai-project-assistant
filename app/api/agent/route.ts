import { run } from '@openai/agents'
import { projectAgent } from '@/agents/project-agent'

export async function POST(request: Request) {
  const body = await request.json()

  const result = await run(projectAgent, body.message)

  return Response.json({
    message: result.finalOutput,
  })
}
