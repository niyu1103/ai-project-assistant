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
