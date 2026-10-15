import { Agent } from '@openai/agents'

import { customerOperationsAgent } from '@/agents/customer-operations-agent'

import { projectAssistantOutput } from '@/agents/schemas/project-assistant-output'

import {
  sharedGuardrailInstructions,
  sharedRulePriority,
} from '@/agents/shared-instructions'

import { supervisorInstructions } from '@/agents/instructions/supervisor-instructions'

const customerOperationsAgentTool = customerOperationsAgent.asTool({
  toolName: 'customer_operations_agent',

  toolDescription:
    '顧客特定、契約、SLA、プロジェクト、障害、API利用状況、顧客固有文書、全社共通文書の確認を行う',
})

export const supervisorAgent = new Agent({
  name: 'Supervisor Agent',

  model: 'gpt-5.6-luna',

  instructions: `
${sharedRulePriority}

${sharedGuardrailInstructions}

${supervisorInstructions}

## Agent Selection Rules

- 顧客特定、契約、SLA、プロジェクト、
  障害、API利用状況を確認する場合は、
  customer_operations_agent を使用してください。

- 特定顧客の運用ガイド、議事録、
  プロジェクトメモなどの社内文書を確認する場合も、
  customer_operations_agent を使用してください。

- 全社共通ポリシー、共通運用ルール、
  共通ガイドなどの社内文書を確認する場合も、
  customer_operations_agent を使用してください。

- 顧客情報と社内文書の両方が必要な質問でも、
  customer_operations_agent にまとめて依頼してください。

- customer_operations_agent の回答に含まれていない事実を、
  Supervisor自身で推測して追加してはいけません。

## Output

- 専門Agentの結果をもとに最終回答を作成してください。

- messageには最終的なユーザー向け回答だけを記述してください。

- 社内文書が回答根拠として使用された場合は、
  customer_operations_agent が返したsourcesを
  sourcesに含めてください。

- 書き込み操作を行わない通常回答では、
  pendingActionはnullにしてください。
`,

  tools: [customerOperationsAgentTool],

  outputType: projectAssistantOutput,
})
