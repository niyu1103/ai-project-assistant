# AI Project Assistant

OpenAI Agents SDK と Databricks AI Search を利用した、  
社内業務支援向けの AI Agent / RAG 学習プロジェクトです。

顧客・契約・プロジェクト・障害情報などの構造化データと、  
社内文書の非構造データを組み合わせ、  
質問内容に応じて Agent が適切な Tool を選択して回答します。

現在は、RAG の検索品質評価や Metadata Filter、Structured Output、Tracing などを実装しています。

---

## Features

- OpenAI Agents SDK を利用した AI Agent
- Tool Calling
- 複数 Tool の組み合わせ
- Databricks AI Search を利用した RAG
- Hybrid Search
- Metadata Filter
  - customerId
  - documentType
- Structured Output
- 回答の参照文書表示
- OpenAI Agents SDK Tracing
- Retrieval Evaluation
  - Recall
  - Precision

---

## Architecture

```text
User
  ↓
Next.js UI
  ↓
OpenAI Agents SDK
  ↓
Project Assistant
  ├─ get_customer
  ├─ get_project
  ├─ get_contract
  ├─ get_incidents
  └─ search_documents_semantic
         ↓
     Databricks AI Search
         ↓
     Metadata Filter
         ↓
     Hybrid Search
         ↓
     Top-K Retrieval
  ↓
Structured Output
  ├─ message
  └─ sources[]
  ↓
UI
```

---

## Tech Stack

### Application

- Next.js
- React
- TypeScript
- pnpm
- Zod
- react-markdown

### AI / LLM

- OpenAI API
- OpenAI Agents SDK

### RAG / Data

- Databricks
- Delta Table
- Databricks AI Search
- Hybrid Search
- Metadata Filter
- Embedding
- Vector Search

---

## Project Structure

```text
ai-project-assistant/

├─ agents/
│  └─ project-agent.ts
│
├─ app/
│  ├─ api/
│  │  └─ agent/
│  │     └─ route.ts
│  └─ page.tsx
│
├─ data/
│  ├─ documents/
│  ├─ customers.json
│  ├─ contracts.json
│  ├─ projects.json
│  ├─ incidents.json
│  ├─ document-metadata.json
│  └─ rag-evaluation-cases.json
│
├─ lib/
│  ├─ openai.ts
│  └─ databricks.ts
│
├─ rag/
│  ├─ chunk.ts
│  ├─ embedding.ts
│  └─ cosine-similarity.ts
│
├─ scripts/
│  ├─ build-vector-index.ts
│  ├─ build-rag-documents.ts
│  └─ evaluate-rag.ts
│
└─ tools/
   ├─ get-customer.ts
   ├─ get-project.ts
   ├─ get-contract.ts
   ├─ get-incidents.ts
   └─ search-documents-semantic.ts
```

---

## Agent Tools

現在の Agent では、質問内容に応じて以下の Tool を使用します。

### `get_customer`

顧客情報を取得します。

### `get_project`

プロジェクト情報を取得します。

### `get_contract`

契約情報を取得します。

### `get_incidents`

障害情報を取得します。

### `search_documents_semantic`

Databricks AI Search を利用して、社内文書を Semantic / Hybrid Search します。

必要に応じて、

- `customerId`
- `documentType`

による Metadata Filter を適用します。

---

## RAG

RAG は以下の流れで実装しています。

```text
Document
  ↓
Chunk
  ↓
Embedding
  ↓
Vector Index
  ↓

User Query
  ↓
Semantic / Hybrid Search
  ↓
Top-K Retrieval
  ↓
LLM Context
  ↓
Answer
```

初期実装ではローカルで Embedding と cosine similarity を利用した Semantic Search を実装しました。

その後、検索処理を Databricks AI Search に移行しています。

---

## Databricks

使用している Databricks オブジェクト:

```text
Catalog:
workspace

Schema:
ai_project_assistant

Delta Table:
workspace.ai_project_assistant.rag_documents

AI Search Endpoint:
ai-project-assistant-search

AI Search Index:
workspace.ai_project_assistant.rag_documents_index
```

AI Search では Hybrid Search を使用しています。

---

## Structured Output

Agent の最終出力は Zod を利用して構造化しています。

```ts
{
  message: string
  sources: string[]
}
```

`message` には回答本文、`sources` には実際に回答根拠として使用した文書を格納します。

これにより、回答本文と参照文書を UI 上で分離して表示しています。

---

## RAG Evaluation

Databricks AI Search の検索品質を Recall / Precision で評価しています。

### Evaluation Results

| 設定                              | Recall | Precision |
| --------------------------------- | -----: | --------: |
| Top-K = 5                         |   1.00 |      0.59 |
| Top-K = 3                         |   1.00 |      0.67 |
| Top-K = 3 + `documentType` filter |   1.00 |      0.76 |

### Result

Top-K を `5 → 3` に変更することで、Recall を維持したまま Precision が改善しました。

さらに、ユーザーの検索意図が明確なケースで `documentType` Metadata Filter を適用することで、

```text
Precision
0.59 → 0.76
```

まで改善しました。

現在の評価ケース数はまだ少ないため、Top-K = 3 が常に最適であるとは限りません。

今後は評価ケースを増やし、

- Chunk 設計
- Metadata Filter
- Retrieval quality
- Answer quality

を継続的に評価します。

---

## Evaluation

RAG Evaluation は以下で実行できます。

```bash
pnpm rag:evaluate
```

現在は以下を評価しています。

- Retrieval Recall
- Retrieval Precision

今後追加予定:

- Correctness
- Groundedness
- Relevance
- Citation accuracy
- Tool selection accuracy
- LLM-as-a-judge

---

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Environment Variables

`.env.local` を作成します。

```env
OPENAI_API_KEY=

DATABRICKS_HOST=
DATABRICKS_TOKEN=
DATABRICKS_INDEX_NAME=
```

秘密情報を Git にコミットしないでください。

### Run development server

```bash
pnpm dev
```

ブラウザで以下を開きます。

```text
http://localhost:3000
```

---

## Current Status

```text
LLM Basics                ✅
Tool Calling              ✅
Multiple Tools            ✅
Tracing                   ✅

Local RAG                  ✅
Embedding                  ✅
Vector Search              ✅
Metadata Filter            ✅

Databricks Delta Table     ✅
Databricks AI Search       ✅
Hybrid Search              ✅

Structured Output          ✅
Source Display             ✅

Retrieval Evaluation       ✅

Answer Evaluation          🚧
PDF / OCR RAG              🚧
External API Integration   🚧
Write Tools                🚧
Human-in-the-loop          🚧
Guardrails                 🚧
Conversation State         🚧
Multi-Agent                🚧
```

---

## Roadmap

### 1. RAG Quality Improvement

- Top-K tuning
- Metadata Filter
- Chunk size comparison
- Retrieval Evaluation

### 2. Evaluation

- Evaluation cases expansion
- Correctness
- Groundedness
- Citation accuracy
- LLM-as-a-judge

### 3. PDF / OCR RAG

```text
PDF
↓
OCR / Text Extraction
↓
Preprocessing
↓
Chunk
↓
Metadata
↓
Databricks AI Search
↓
Evaluation
```

### 4. External API Integration

Agent から外部 REST API を Tool として利用します。

### 5. Write Tools

- `create_task`
- `update_project`
- `add_customer_note`

### 6. Human-in-the-loop

変更系 Tool の実行前にユーザー承認を行います。

```text
Agent
↓
Action Proposal
↓
Human Approval
↓
Write Tool
```

### 7. Guardrails

- Customer isolation
- Confidentiality control
- Write permission
- Hallucination prevention

### 8. Conversation State

複数ターンの会話で顧客やプロジェクトの文脈を維持します。

### 9. Multi-Agent

```text
Supervisor Agent
├─ Customer Agent
├─ Project Agent
├─ Knowledge Agent
└─ Task Agent
```

以下を学習予定です。

- handoff
- agent-as-tool
- supervisor pattern

### 10. Production / Harness

- Retry
- Timeout
- Error handling
- Logging
- Token usage
- Latency
- Cost monitoring
- Evaluation pipeline

---

## Learning Goal

このプロジェクトでは、単に LLM API を呼び出すだけではなく、

```text
Data
↓
Retrieval
↓
Context
↓
Agent
↓
Tools
↓
LLM
↓
Evaluation
↓
Improvement
```

という AI Application / Agent 全体の設計・実装を学ぶことを目的としています。

### Chunk Size Comparison

| Chunk Size | Overlap | Recall | Precision |
| ---------: | ------: | -----: | --------: |
|        500 |     100 |   0.97 |      0.78 |
|       1000 |     200 |   0.92 |      0.72 |

現在の評価データセットでは、
`chunkSize=500 / overlap=100` の方が Recall / Precision ともに高かった。

大きいChunkでは複数トピックが1Chunkに混在し、
検索時の意味的な焦点がぼやけるケースが見られた。

### Python Evaluation

TypeScript版に加えて、
同じEvaluation Dataset / Ground Truthを利用した
Python版のRAG Evaluationも実装。

- Databricks AI Search API
- pandas
- Recall
- Precision

TypeScript版と同じ評価結果になることを確認。
