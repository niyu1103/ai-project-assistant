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
