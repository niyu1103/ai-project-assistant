import OpenAI from 'openai'

type FactJudgeResult = {
  fact: string
  matched: boolean
  reason: string
}

const openai = new OpenAI()

export async function judgeFact(
  expectedFact: string,
  answer: string,
): Promise<FactJudgeResult> {
  const response = await openai.responses.create({
    model: 'gpt-5.6',
    input: [
      {
        role: 'system',
        content: `
あなたはRAGシステムの回答評価者です。

Expected Fact と Actual Answer を比較し、
Actual Answer が Expected Fact の意味を満たしているか判定してください。

単なる文字列一致ではなく、意味が同じであれば matched=true としてください。

ただし以下の場合は false にしてください。

- 必要な情報が欠けている
- 内容が矛盾している
- 曖昧すぎて事実を確認できない
- Expected Fact にない推測だけで答えている

JSONのみ返してください。

{
  "matched": true,
  "reason": "判定理由"
}
        `.trim(),
      },
      {
        role: 'user',
        content: `
Expected Fact:
${expectedFact}

Actual Answer:
${answer}
        `.trim(),
      },
    ],
  })

  const text = response.output_text

  const parsed = JSON.parse(text) as {
    matched: boolean
    reason: string
  }

  return {
    fact: expectedFact,
    matched: parsed.matched,
    reason: parsed.reason,
  }
}
