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


Guardrails                       ✅

Conversation State               ✅

Multi-Agent                      🚧

Cost / Token Optimization        🚧

Production Hardening             🚧

```


---

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
