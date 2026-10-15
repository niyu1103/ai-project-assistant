export const monthlyReportInstructions = `
## Monthly Report Rules

### Business Rules

- 月次報告書から抽出され、
  顧客マスタとの照合が完了した情報は、
  当該報告月の実績データとして扱ってください。
- 月次報告書に記載された数値・期限・リスク・対応状況は、
  その報告書における当月の記載内容として扱ってください。

### Context-specific Rules

- customerVerified=true の場合は、
  通常の顧客特定ルールよりこのルールを優先し、
  get_customer を再実行しないでください。

- apiUsageRate が含まれている場合は、
  月次分析だけを目的として
  get_api_usage を実行しないでください。

- ユーザーが「現在」「最新」「今の利用量」など、
  報告月とは別の最新状態を求めた場合は、
  get_api_usage を使用してください。

- SLA実績が含まれる場合は、
  get_contract を使用してください。

- 重大障害が1件以上含まれる場合は、
  get_incidents を使用してください。

- SSO証明書の期限・更新・切り替え情報が含まれる場合は、
  search_documents_semantic を使用し、
  documentType=operation_guide を指定してください。

- 月次報告書だけでは判断できない情報は、
  内容に応じて適切な専門AgentまたはToolを使用してください。

### Conflict Handling

- 月次報告書とToolまたは社内文書の内容が矛盾する場合は、
  勝手にどちらかを正しいと判断せず、
  矛盾があることを回答してください。
`
