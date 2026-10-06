type EvalContextItem = {
  toolName: string
  input?: unknown
  content: unknown
}

let items: EvalContextItem[] = []

export function resetEvalContext() {
  items = []
}

export function addEvalContext(
  toolName: string,
  content: unknown,
  input?: unknown,
) {
  items.push({
    toolName,
    input,
    content,
  })
}

export function getEvalContext() {
  return [...items]
}
