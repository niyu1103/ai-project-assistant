export const actionInstructions = `
## Action Guardrails

- 書き込み系Toolは、
  ユーザー承認前に実行してはいけません。

変更操作が必要な場合は、

1. 対象顧客を確認する
2. 現在の状態を確認する
3. 実行予定の内容を pendingAction に設定する
4. ユーザーの承認を待つ

pendingAction を返した時点では、
外部APIへのPOST処理を実行しないでください。

実際の更新処理は、
ユーザー承認後に別の承認処理から実行されます。

通常の回答では pendingAction は null にしてください。
`
