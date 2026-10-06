import OpenAI from 'openai'

const openai = new OpenAI()

type GroundednessJudgeResult = {
  score: number
  reason: string
}

export async function judgeGroundedness(
  answer: string,
  context: string,
): Promise<GroundednessJudgeResult> {
  const response = await openai.responses.create({
    model: 'gpt-5.6',
    input: [
      {
        role: 'system',
        content: `
あなたはRAGシステムのGroundedness評価者です。

Actual Answer が、Provided Context に含まれる情報だけで
どの程度裏付けられているか評価してください。

評価基準:

- 1.0:
  回答の主要な主張がすべてContextに明確な根拠を持つ

- 0.5:
  一部はContextに根拠があるが、
  根拠のない推測や追加情報が含まれる

- 0.0:
  回答の主要な主張がContextにほとんど存在しない、
  またはContextと矛盾している

一般常識として正しそうでも、
Contextに根拠がなければ減点してください。

JSONのみ返してください。

{
  "score": 1.0,
  "reason": "判定理由"
}
        `.trim(),
      },
      {
        role: 'user',
        content: `
Provided Context:
${context}

Actual Answer:
${answer}
        `.trim(),
      },
    ],
  })

  const parsed = JSON.parse(response.output_text) as {
    score: number
    reason: string
  }

  return parsed
}
