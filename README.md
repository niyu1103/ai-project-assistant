# AI Project Assistant

OpenAI Agents SDK と Databricks AI Search を利用した、  
社内業務支援向けの AI Agent / RAG 学習プロジェクトです。

顧客・契約・プロジェクト・障害情報などの構造化データと、  
社内文書の非構造データを組み合わせ、  
質問内容に応じて Agent が適切な Tool / RAG を利用して回答します。

現在は RAG 検索だけでなく、

- External API
- Write Tool
- Human-in-the-loop
- Event-driven RAG Update
- PDF / Image Structured Extraction
- Evaluation

まで含めた AI Application 全体の構成を実装しています。

---

## Features

### AI Agent

- OpenAI Agents SDK
- Tool Calling
- Multiple Tool Calling
- Structured Output
- OpenAI Agents SDK Tracing
- Tool Selection Control
- Grounded Answer Rules

### RAG

- Databricks AI Search
- Hybrid Search
- Metadata Filter
  - `customerId`
  - `documentType`
- Top-K Retrieval
- Chunking
- Source Display

### External API / Action

- External REST API Integration
- API usage retrieval
- Write Tool
- Human-in-the-loop
- `pendingAction` による承認フロー

### Document Extraction

- PDF 月次報告書解析
- PNG / Image 月次報告書解析
- Structured Output
- Customer Master Validation
- PDF / Image 共通スキーマへの正規化

### Evaluation

- Retrieval Recall
- Retrieval Precision
- Extraction Eval
- Tool Selection Eval
- Answer Eval
- Groundedness Eval
- LLM-as-a-Judge

### AI Ops

- S3 Document Upload
- EventBridge
- Lambda
- Databricks Job
- Automatic RAG Data Update
- AI Search Index Sync
- Automatic Evaluation
- Failure Notification
- DynamoDB によるイベント重複実行防止

---

## Architecture

```text
                        ┌─────────────────────┐
                        │       User          │
                        └──────────┬──────────┘
                                   ↓
                        ┌─────────────────────┐
                        │      Next.js UI     │
                        └──────────┬──────────┘
                                   ↓
                        ┌─────────────────────┐
                        │ OpenAI Agents SDK   │
                        └──────────┬──────────┘
                                   ↓
                        ┌─────────────────────┐
                        │ Project Assistant   │
                        └──────────┬──────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             ↓                     ↓                     ↓

        Structured Tools         RAG                External API

        get_customer      search_documents_        get_api_usage
        get_project       semantic
        get_contract             ↓                 Write Tool
        get_incidents     Databricks AI Search            ↓
                                 ↓                 Human Approval
                          Metadata Filter
                                 ↓
                           Hybrid Search
                                 ↓
                           Top-K Retrieval

                                   ↓
                        Structured Output
                        ├─ message
                        ├─ sources[]
                        └─ pendingAction
                                   ↓
                                  UI
```

---

## Monthly Report Flow

PDF / Image の月次報告書を Structured Output に変換し、  
Agent の Context として利用します。

```text
PDF / PNG
   ↓
extractMonthlyReport()
   ↓
Structured Output
   ↓
Customer Master Validation
   ↓
customerVerified=true
   ↓
Agent
   ↓
Tool / RAG
   ↓
Analysis
```

抽出する主な情報:

```text
customerId
customerName
reportMonth
apiUsageRate
slaRate
incidentCount
criticalIncidentCount
ssoCertificateExpirationDate
risks
nextActions
```

`risks` は以下の形式に構造化しています。

```ts
{
  name: string
  level: string | null
  status: string | null
}
```

PDF / Image で同じ意味の情報が同じ Structured Output になるよう、  
抽出ルールと日付形式を正規化しています。

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

### AWS / AI Ops

- Amazon S3
- Amazon EventBridge
- AWS Lambda
- Amazon DynamoDB

---

## Project Structure

```text
ai-project-assistant/

├─ agents/
│  └─ project-agent.ts
│
├─ app/
│  ├─ api/
│  │  ├─ agent/
│  │  │  ├─ route.ts
│  │  │  └─ approve/
│  │  │     └─ route.ts
│  │  │
│  │  └─ extract-report/
│  │     └─ route.ts
│  │
│  ├─ report-extractor/
│  │  └─ page.tsx
│  │
│  └─ page.tsx
│
├─ data/
│  ├─ documents/
│  ├─ customers.json
│  ├─ contracts.json
│  ├─ projects.json
│  ├─ incidents.json
│  ├─ document-metadata.json
│  ├─ rag-evaluation-cases.json
│  └─ monthly-report-evaluation-cases.json
│
├─ lib/
│  ├─ databricks.ts
│  └─ extract-monthly-report.ts
│
├─ rag/
│  ├─ chunk.ts
│  ├─ embedding.ts
│  └─ cosine-similarity.ts
│
├─ scripts/
│  ├─ build-vector-index.ts
│  ├─ build-rag-documents.ts
│  ├─ evaluate-rag.ts
│  └─ evaluate-monthly-report.ts
│
└─ tools/
   ├─ get-customer.ts
   ├─ get-project.ts
   ├─ get-contract.ts
   ├─ get-incidents.ts
   ├─ get-api-usage.ts
   ├─ create-api-limit-request.ts
   └─ search-documents-semantic.ts
```

---

## Agent Tools

### `get_customer`

顧客情報を取得します。

### `get_project`

プロジェクト情報を取得します。

### `get_contract`

契約期間、SLA、サポート条件などの契約情報を取得します。

### `get_incidents`

障害履歴、原因、影響、再発防止策などを取得します。

### `get_api_usage`

外部 API から現在の API 利用状況を取得します。

### `search_documents_semantic`

Databricks AI Search を利用して社内文書を Semantic / Hybrid Search します。

必要に応じて、

- `customerId`
- `documentType`

による Metadata Filter を適用します。

### `create_api_limit_request`

API 利用上限変更申請を作成する実行系 Tool です。

直接実行せず、  
Human-in-the-loop の承認フローを経由して実行します。

---

## RAG

```text
Document
   ↓
Chunk
   ↓
Embedding
   ↓
Databricks
   ↓
AI Search Index

User Query
   ↓
Metadata Filter
   ↓
Hybrid Search
   ↓
Top-K Retrieval
   ↓
LLM Context
   ↓
Answer
```

初期実装ではローカルで Embedding と cosine similarity を利用した  
Semantic Search を実装しました。

その後、検索処理を Databricks AI Search に移行しています。

---

## Databricks

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

AI Search では Hybrid Search と Metadata Filter を利用しています。

---

## Event-driven RAG Update

S3 の文書更新を起点として、  
Databricks 側の RAG データと AI Search Index を自動更新します。

```text
S3
 ↓
EventBridge
 ↓
Lambda
 ↓
Databricks Job
 ├─ ingest_s3_rag_documents
 ├─ sync_rag_documents_index
 └─ evaluate_rag
```

Evaluation が失敗した場合は Databricks Job を失敗させ、  
通知を行います。

また DynamoDB に Event ID を保存し、  
同一イベントによる Databricks Job の重複実行を防止しています。

---

## Structured Output

Agent の最終出力は Zod を利用して構造化しています。

```ts
{
  message: string
  sources: string[]
  pendingAction: {
    type: 'api_limit_request'
    customerId: string
    customerName: string
    requestedLimit: number
    reason: string
  } | null
}
```

`message` には回答本文、  
`sources` には実際に回答根拠として使用した社内文書を格納します。

更新操作が必要な場合は `pendingAction` を返し、  
ユーザー承認後に実行します。

---

## Human-in-the-loop

外部システムを書き換える Tool は、  
Agent が直接実行しないようにしています。

```text
Agent
 ↓
Action Proposal
 ↓
pendingAction
 ↓
Human Approval
 ↓
Write Tool
 ↓
External API
```

---

## Evaluation

### Retrieval Evaluation

Databricks AI Search の検索品質を Recall / Precision で評価しています。

| 設定                              | Recall | Precision |
| --------------------------------- | -----: | --------: |
| Top-K = 5                         |   1.00 |      0.59 |
| Top-K = 3                         |   1.00 |      0.67 |
| Top-K = 3 + `documentType` filter |   1.00 |      0.76 |

Metadata Filter によって、  
Recall を維持しながら Precision が改善することを確認しました。

### Chunk Size Comparison

| Chunk Size | Overlap | Recall | Precision |
| ---------: | ------: | -----: | --------: |
|        500 |     100 |   0.97 |      0.78 |
|       1000 |     200 |   0.92 |      0.72 |

現在の評価データでは、

```text
chunkSize = 500
overlap = 100
```

の方が Recall / Precision ともに高い結果となりました。

---

## Monthly Report Evaluation

PDF / Image の月次報告書について、  
以下の4段階で評価しています。

```text
PDF / Image
   ↓
Extraction Eval
   ↓
Tool Selection Eval
   ↓
Answer Eval
   ↓
Groundedness Eval
```

### Extraction Eval

PDF / Image から抽出した Structured Output を  
Expected Data と比較します。

確認内容:

- customerId
- customerName
- reportMonth
- API Usage
- SLA
- Incident Count
- SSO Certificate
- Risks
- Next Actions

### Tool Selection Eval

Agent が必要な Tool を正しく選択できるかを評価します。

例:

```text
SLA
→ get_contract

Critical Incident
→ get_incidents

SSO Certificate
→ search_documents_semantic
```

### Answer Eval

最終回答に必要な情報が含まれているかを評価します。

### Groundedness Eval

月次報告書・Tool Output・RAG Context を Grounding Context とし、  
LLM-as-a-Judge で回答内の未根拠な主張を検出します。

評価対象:

- Hallucination
- Unsupported Claims
- Incorrect Dates
- Unsupported Conditions
- Overstatement

意図的に未根拠な期限・断定を追加したケースで  
FAIL になることも確認しています。

---

## Evaluation Commands

### RAG Evaluation

```bash
pnpm rag:evaluate
```

### Monthly Report Evaluation

```bash
pnpm rag:evaluate-monthly-report
```

Monthly Report Evaluation では現在、

```text
Extraction Eval
Tool Selection Eval
Answer Eval
Groundedness Eval
```

を実行します。

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

```text
http://localhost:3000
```

---

## Current Status

```text
LLM Basics                       ✅
Tool Calling                     ✅
Multiple Tools                   ✅
Tracing                          ✅

Local RAG                        ✅
Embedding                        ✅
Vector Search                    ✅
Metadata Filter                  ✅

Databricks Delta Table           ✅
Databricks AI Search             ✅
Hybrid Search                    ✅

Structured Output                ✅
Source Display                   ✅

Retrieval Evaluation             ✅
Tool Selection Evaluation        ✅
Answer Evaluation                ✅
Groundedness Evaluation          ✅
LLM-as-a-Judge                   ✅

External API Integration         ✅
Write Tool                       ✅
Human-in-the-loop                ✅

PDF Structured Extraction        ✅
Image Structured Extraction      ✅
Customer Master Validation       ✅

S3 → Databricks RAG Update       ✅
Databricks Job Evaluation        ✅
Failure Notification             ✅
Event Idempotency                ✅

Guardrails                       🚧
Conversation State               🚧
Multi-Agent                      🚧
Cost / Token Optimization        🚧
Production Hardening             🚧
```

---

## Roadmap

### 1. Evaluation Expansion

- Evaluation Case Expansion
- Different PDF Layouts
- Multi-page PDF
- Scanned Documents
- Low-resolution Images
- Missing Fields
- Different Report Formats

### 2. File Format Expansion

共通 Structured Output への正規化対象を増やします。

```text
PDF
Image
Word
CSV
Excel
 ↓
Common Structured Output
```

### 3. Guardrails

- Customer Isolation
- Confidentiality Control
- Write Permission
- Hallucination Prevention
- Input / Output Validation

### 4. Conversation State

複数ターンの会話で顧客やプロジェクトの Context を維持します。

### 5. Multi-Agent

```text
Supervisor Agent
├─ Customer Agent
├─ Project Agent
├─ Knowledge Agent
└─ Task Agent
```

検討対象:

- handoff
- agent-as-tool
- supervisor pattern

### 6. Production Hardening

- Retry
- Timeout
- Error Handling
- SQS / DLQ
- Service Principal
- Secret Management
- Logging
- Monitoring
- Token Usage
- Latency
- Cost Monitoring

---

## Learning Goal

このプロジェクトでは単に LLM API を呼び出すだけではなく、

```text
Data
 ↓
Ingestion
 ↓
Retrieval
 ↓
Context
 ↓
Agent
 ↓
Tools
 ↓
External API
 ↓
Human Approval
 ↓
Evaluation
 ↓
Improvement
```

という AI Application / Agent 全体の設計・実装を学ぶことを目的としています。

RAG、Agent、Tool、External API、Evaluation、AI Ops を  
個別の機能ではなく、一連の AI Application Architecture として扱います。
