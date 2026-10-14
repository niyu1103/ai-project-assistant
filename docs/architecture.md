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


        get_customer      search_documents\_        get_api_usage

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
