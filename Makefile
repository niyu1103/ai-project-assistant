PHONY: check fmt lint test

fmt:
	pnpm fmt

lint:
	pnpm lint

test:
	pnpm test
	pnpm conversation:evaluate
	pnpm guardrail:evaluate
	pnpm multi-agent:evaluate
	pnpm rag:evaluate-monthly-report

check:
	pnpm fmt
	pnpm lint
	pnpm typecheck
	pnpm test