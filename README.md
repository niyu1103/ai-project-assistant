# AI Project Assistant

顧客・契約・プロジェクト・障害情報などの構造化データと社内文書の非構造データを組み合わせ、質問内容に応じて Agent が Tool / RAG / External API を利用して回答します。

現在は RAG、External API、Write Tool、Human-in-the-loop、Event-driven RAG Update、PDF / Image Structured Extraction、Evaluation、Guardrails、Conversation State まで実装しています。

## Documentation

- [Features / Agent Tools](docs/agent-and-tools.md)
- [Architecture / Tech Stack](docs/architecture.md)
- [RAG / Databricks / AI Ops](docs/rag-databricks.md)
- [Monthly Report / Document Extraction](docs/monthly-report.md)
- [Evaluation](docs/evaluation.md)
- [Guardrails / Safety Evaluation](docs/guardrails.md)
- [Conversation State](docs/conversation-state.md)
- [Getting Started / Status / Roadmap](docs/project-status.md)

## Quick Start

### Install dependencies

```bash
pnpm install
```

### Start Next.js

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)

### Start External API

```bash
python -m uvicorn external-api.main:app --reload --port 8001
```

[http://127.0.0.1:8001](http://127.0.0.1:8001)

## Main Evaluation Commands

```bash
pnpm rag:evaluate
pnpm rag:evaluate-monthly-report
pnpm guardrail:evaluate
```

## Current Focus

Conversation State の基本実装まで完了しています。

- 同一顧客の会話継続
- 顧客の切り替え
- Topic の切り替え
- `conversationId` による状態維持
- 「新しい会話」によるリセット
- Customer Isolation Hard Guardrail との併用
