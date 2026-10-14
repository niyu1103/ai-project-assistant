# Conversation State

Conversation State は、同じ会話の中で「誰について」「何について」話しているかを保持する仕組みです。

## State

```ts
export type ConversationState = {
  customerId: string | null
  customerName: string | null
  currentTopic: 'contract' | 'project' | 'incident' | 'api_usage' | null
}
```

`AgentContext` から Conversation State を参照・更新します。

```ts
export type AgentContext = {
  verifiedCustomerId: string | null
  conversationState: ConversationState

  eval?: {
    failTools?: string[]
  }
}
```

## conversationId

会話ごとに `conversationId` を持ち、同じ ID のリクエストでは前回の Conversation State を復元します。

現在は開発用としてサーバーメモリ上の `Map` を利用しています。

```ts
const conversationStates = new Map<string, ConversationState>()
```

初回は `conversationId` がないため API 側で UUID を発行し、レスポンスでフロントへ返します。

```text
First Request
  ↓
conversationId = null
  ↓
API creates UUID
  ↓
Frontend stores conversationId
  ↓
Next Request uses the same conversationId
```

> 現在の `Map` は開発用です。サーバー再起動・Hot Reload・複数インスタンスでは状態を保証できないため、本番では Redis / DB などの永続ストアへの置き換えを検討します。

## State Update by Tools

各 Tool は、取得対象に応じて Conversation State を更新します。

```text
get_customer
→ customerId / customerName

get_contract
→ currentTopic = contract

get_project
→ currentTopic = project

get_incidents
→ currentTopic = incident

get_api_usage
→ currentTopic = api_usage
```

`currentTopic` は「データが存在したか」ではなく、現在ユーザーが何について話しているかを表します。

## Follow-up Questions

### Same Customer

```text
User:
青空テックの契約内容を教えて

State:
customerId = cust-001
customerName = 青空テクノロジーズ株式会社
currentTopic = contract

User:
じゃあ更新期限は？

Agent:
青空テックの契約の続きとして get_contract を利用
```

顧客名を毎回入力しなくても、同じ Conversation State を使って続きの質問として処理できます。

## Customer Switching

ユーザーが別顧客名を明示した場合は、保存済み顧客をそのまま使いません。

```text
Current State:
cust-001 / 青空テック

User:
じゃあ北斗リテールは？

  ↓
get_customer
  ↓
cust-002 を確認
  ↓
Conversation State 更新
  ↓
get_contract
```

確認済みの実動作:

```text
青空テック
→ cust-001

じゃあ北斗リテールは？
→ get_customer
→ cust-002
→ 北斗リテール株式会社へ切り替え
```

## Topic Switching

顧客を維持したまま話題を変更できます。

```text
北斗リテールのプロジェクト状況は？
→ get_project
→ topic = project

じゃあ障害は？
→ get_incidents
→ topic = incident

じゃあAPI利用状況は？
→ get_api_usage
→ topic = api_usage
```

その後、

```text
じゃあ青空テックのAPI利用状況は？
```

のように別顧客を明示すると、

```text
get_customer
→ cust-001 に切り替え
→ get_api_usage
```

となります。

さらに、

```text
じゃあ障害は？
```

と続けると、青空テックを維持したまま `get_incidents` を実行します。

## New Conversation

UI に「新しい会話」ボタンを追加しています。

```ts
setConversationId(null)
```

新しい会話を開始すると、以前の顧客・Topicを引き継ぎません。

```text
Previous Conversation:
北斗リテール / api_usage

↓ New Conversation

User:
プロジェクトは？

Agent:
どの顧客のプロジェクトについて確認しますか？
```

## Conversation State and Guardrails

Conversation State は認可情報そのものではありません。

```text
Conversation State
→ 会話上の Context

Hard Guardrail
→ 実際にアクセスしてよいか
```

顧客固有 Tool を実行する際は、Conversation State に customerId が保存されていても引き続き `assertCustomerAccess()` を通します。

```text
verifiedCustomerId = cust-001
requestedCustomerId = cust-002
→ Customer access denied
```

そのため、Conversation State を導入しても Customer Isolation の境界はコード側で維持されます。

## Current Status

```text
顧客の継続                  ✅
顧客の切り替え              ✅
Topic の切り替え             ✅
省略表現への対応             ✅
conversationId による状態維持 ✅
新しい会話でのリセット       ✅
Hard Guardrail との併用       ✅
```

## Next Steps

次回候補:

1. Conversation State Eval の追加
2. 顧客継続 / 顧客切り替え / Topic切り替えの自動テスト
3. 新しい会話で State がリセットされることの Eval
4. `Map` から Redis / DB などへの永続化検討
5. State の TTL / 有効期限
6. 複数ブラウザ・複数サーバーインスタンスへの対応
