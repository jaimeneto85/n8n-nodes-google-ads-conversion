# AGENTS.md

Operational guide for AI coding agents working in this repository. Human contributors should read `README.md` and `docs/developer-guide.md` instead.

## What this project is

An n8n community node (`@jaimeflneto/n8n-nodes-google-ads-conversion`) that uploads conversions to the Google Ads REST API. It is published to npm and installed inside n8n via the `n8n` key in `package.json`, which points at the compiled entry files under `dist/`.

Current Google Ads API version: **v23** (see `requestDefaults.baseURL` in `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts`). When upgrading, grep for the version string and update all references — code, docs, and examples.

## Commands you will use

| Command | Purpose |
|---|---|
| `npm run build` | `tsc` + `gulp build:icons`. Fails on type errors. |
| `npm run build:force` | Same, with `--skipLibCheck`. Use when `n8n-workflow` typings drift. |
| `npm run dev` / `build:watch` | `tsc --watch` for iterative development. |
| `npm run lint` / `lint:fix` | ESLint over `nodes/` and `credentials/` using `eslint-plugin-n8n-nodes-base`. |
| `npm run format` | Prettier over `nodes/`, `credentials/`, `docs/`. |
| `npm test` | Runs `node tests/run-tests.js`, a custom structural validator (not Jest/Mocha). Loads `tests/test-data.json`. No single-test mode — scope by editing the runner. |
| `npm run validate` | `test` + `build:force`. The gate before publishing. |
| `npm run prepublishOnly` | Runs automatically on `npm publish`: clean + validate. |
| `npm run package` | Clean, build, and `npm pack` for local verification. |

Node engines: Node >=18, npm >=8. **Package manager is npm** (locked via the `packageManager` field). Do not introduce pnpm/yarn lockfiles.

## Repository layout

```
nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts   # THE node — single large file
credentials/GoogleAdsOAuth2.credentials.ts              # OAuth2 credential type
index.ts                                                # Package barrel
tests/run-tests.js                                      # Custom test runner
tests/test-data.json                                    # Fixtures the runner validates against
docs/                                                   # User-facing docs
dist/                                                   # Build output — GITIGNORED, do not commit
```

The entire node (node description, properties, execution logic, error classes) lives in the single `.node.ts` file. Understanding that file is ~90% of understanding the project.

## Architecture essentials

- **Custom error classes** at the top of the node file: `GoogleAdsAuthenticationError`, `GoogleAdsValidationError`, `GoogleAdsApiError`, `GoogleAdsRateLimitError`. All extend `NodeOperationError`. Retry and rate-limit handling branch on the concrete class — new failure paths must classify into one of these instead of throwing generic errors.
- **Google Ads API target**: REST `v23`. Endpoint used most is `customers/{customerId}:uploadClickConversions`. See https://developers.google.com/google-ads/api/rest/overview and release notes at https://developers.google.com/google-ads/api/docs/release-notes.
- **MCC (Manager Account) support**: the node detects whether the selected customer is a manager account and sets the `login-customer-id` header accordingly. Account pickers use dynamic `loadOptions` / `listSearch` methods (`ILoadOptionsFunctions`).
- **Identification methods**: GCLID, Enhanced Conversions (PII hashed with SHA-256 via `crypto.createHash` *before* the payload leaves the node), GBRAID, WBRAID. Never log unhashed PII.
- **Batch processing**: up to 2000 conversions per request. Three modes: Partial Failure, Fail Fast, Continue on Error. Retries use exponential backoff with jitter and honor `Retry-After` from rate-limit responses.
- **Validation mode** and **Debug mode** are first-class node parameters. Preserve them when adding new operations.

## Hard rules

1. **Never commit `dist/`.** It is gitignored. The build artifact is generated on demand and shipped via the `files` field in `package.json` at publish time (`prepublishOnly` enforces this). If you see `dist/` changes in `git status`, something is wrong.
2. **Never edit files inside `dist/` by hand.** Edit the `.ts` source and rebuild.
3. **Do not remove `// @ts-ignore` on the `inputs`/`outputs` fields** of the node description. They exist for compatibility across n8n versions and removing them breaks installs on older hosts.
4. **Do not introduce secrets** (API keys, OAuth tokens, customer IDs) into code, tests, fixtures, or commit messages.
5. **Do not switch package manager.** Use npm.
6. **Commit messages must be written from the developer's perspective.** They must never mention AI, Claude, Copilot, or any AI tooling. Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
7. **Commit incrementally.** One logical change per commit; never batch unrelated work.
8. **All node parameters live inline in `description.properties`.** There is no separate descriptions file — keep related parameter groups together and use `displayOptions` for conditional visibility.

## Workflow expectations

- **Work in a git worktree.** Before starting any non-trivial task, create a worktree: `git worktree add .worktrees/<task-name> -b <task-name>` and work inside it. Skip only for trivial fixes (typos, doc-only tweaks) or when already inside a worktree.
- **Spec before code** for non-trivial work: scope → requirements → design → tasks → implementation → tests → QA. Rejections route back to the correct phase, not back to square one.
- **Validation gate** before handing work off: `npm run lint`, `npm run build:force`, and `npm test` must all pass. Do not mark a task complete until the three are green.
- **Do not merge worktree branches without explicit user approval.** Deliver the branch ready for review; the user merges.

## Google Ads API upgrades

When the Google Ads REST API ships a new version:

1. Check https://developers.google.com/google-ads/api/docs/release-notes and sunset dates.
2. Update `requestDefaults.baseURL` in `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts` (this is the canonical location — grep `googleads.googleapis.com` to sanity-check there are no stragglers).
3. Review the request/response shapes for every endpoint this node touches — today that is `uploadClickConversions`, `googleAds:search`, and customer listing. Look for deprecated fields or enum changes.
4. Update `docs/developer-guide.md`, `docs/oauth-scopes.md`, `README.md`, and `TROUBLESHOOTING.md` wherever the old version appears.
5. Bump `package.json` version: minor bump if the upgrade is internal-only, major bump if any public node parameter changes.
6. Add a `CHANGELOG.md` entry with the date, old version, new version, and a breaking-changes section (even if empty, state it explicitly).
7. Run the validation gate (`lint` + `build:force` + `test`) before committing the version bump.

## Docs that must stay in sync

`README.md`, `TROUBLESHOOTING.md`, and everything under `docs/` is user-facing. Update them whenever you change behavior, OAuth scopes, supported parameters, or the target API version.
