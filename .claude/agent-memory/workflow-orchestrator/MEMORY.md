# Agent Memory — workflow-orchestrator

## Padrões do Projeto
- n8n community node: TypeScript source in `nodes/` and `credentials/`, built to `dist/`. Never edit `dist/` by hand.
- Package manager is **npm** only. `packageManager` field is `npm@9.0.0`.
- Indentation: tabs (package.json and package-lock.json both use tabs).
- Scripts of record: `npm run lint`, `npm run build:force`, `npm test` — the three-gate validation.
- Test runner is a plain Node script (`tests/run-tests.js`) that writes `tests/test-report.json`. Regenerated file is normal side effect; commit it.
- Docs folder: `docs/developer-guide.md`, `docs/user-guide.md`, `docs/testing-guide.md`, `docs/oauth-scopes.md`. Top-level docs: `README.md`, `TROUBLESHOOTING.md`, `CHANGELOG.md`.

## Decisões Arquiteturais
- Google Ads API version is centralised in a single `GOOGLE_ADS_API_VERSION` constant (plus derived `GOOGLE_ADS_API_BASE_URL`) in both `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts` and `credentials/GoogleAdsOAuth2.credentials.ts`. Upgrades touch one constant per file.
- Current target version: **v23** (released 2026-01-28, sunset Feb 2027). Bumped from v17 (sunset June 2025) on 2026-04-09.
- Custom error classes (`GoogleAdsAuthenticationError`, `GoogleAdsValidationError`, `GoogleAdsApiError`, `GoogleAdsRateLimitError`) are load-bearing for retry logic — do not remove.
- `// @ts-ignore` on the node's `inputs`/`outputs` fields is intentional for n8n version compatibility — do not touch.
- SHA-256 hashing of PII happens inside the node before the HTTP payload leaves — never bypass.
- Version bumps for pure API URL upgrades (no public-interface changes) are **minor** bumps, not major.

## Erros Recorrentes & Soluções
- package-lock.json can end up with stale indentation (2-space) or stale version string from a prior npm install. If the diff is a huge reformat, it's the lockfile being re-synced to current package.json — commit it, don't revert.
- Commit messages MUST NEVER mention Claude / AI / LLM / any AI tool. Global rule.
- Never use `git add -A` — add specific files.

## Aprendizados de QA
- (none yet)

## Dependências & Integrações
- Google Ads REST API: `https://googleads.googleapis.com/v23`. Endpoints used by this node: `customers/{id}/googleAds:search`, `customers/{id}:uploadClickConversions`, `customers/{id}/conversionActions`.
- OAuth2 scope: `https://www.googleapis.com/auth/adwords` (no granular scopes available in v23).
- n8n-workflow peer dep: `>=1.0.0`.

## Observações
- Worktree workflow: `.worktrees/<task-name>` created from main. Do NOT merge back until user explicitly approves.
- SDD pipeline: orchestrator must delegate code/content edits to @software-engineer, tests to @test-engineer, QA to @qa-reviewer, all via the Agent tool. Orchestrator may itself run shell validation (lint/build/test) and make git commits on behalf of the pipeline.
- Historical CHANGELOG lines mentioning old API versions (v14, v17) are preserved as history — do not rewrite past releases.
