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

  name: string;

  level: string | null;

  status: string | null;

}

```


PDF / Image で同じ意味の情報が同じ Structured Output になるよう、

抽出ルールと日付形式を正規化しています。


---

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
