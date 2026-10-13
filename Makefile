PHONY: check fmt lint test

fmt:
	pnpm fmt

lint:
	pnpm lint

test:
	pnpm test

check:
	pnpm fmt
	pnpm lint
	pnpm test