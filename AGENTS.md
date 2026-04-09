# AGENTS.md — Context for n8n-nodes-google-ads-conversion

> Single source of truth for AI coding agents working in this repository. Supersedes any previous `CLAUDE.md` or agent-specific files.

## Project Overview

This is an **n8n community node** (`@jaimeflneto/n8n-nodes-google-ads-conversion`) that provides a production-grade integration for uploading conversion events to the **Google Ads API v23**. It is published to npm and consumed by n8n's community node system.

### Key Capabilities
- **Multiple identification methods**: GCLID, Enhanced Conversions (with automatic SHA-256 hashing of PII), GBRAID, and WBRAID
- **Manager Account (MCC) support**: Upload conversions to managed accounts with proper `login-customer-id` headers
- **High-performance batch processing**: Up to 2000 conversions per API call with three processing modes (Partial Failure, Fail Fast, Continue on Error)
- **Privacy & GDPR compliance**: Automatic SHA-256 hashing, consent management, zero data retention
- **Enterprise reliability**: Intelligent retry with exponential backoff + jitter, custom error classes, rate-limit handling
- **Developer experience**: Validation mode (test without uploading), debug mode, full TypeScript

### Tech Stack
- **TypeScript** (ES2020 target, commonjs modules)
- **n8n workflow framework** (`n8n-workflow` peer dependency)
- **Google Ads REST API v23** (`:uploadClickConversions` endpoint)
- **Build tooling**: TypeScript compiler, Gulp (icon copying), ESLint, Prettier

---

## Project Structure

```
n8n-nodes-google-ads-conversion/
├── nodes/GoogleAdsConversion/
│   ├── GoogleAdsConversion.node.ts   # Main node implementation (~3100 lines)
│   └── googleAds.svg                 # Node icon
├── credentials/
│   ├── GoogleAdsOAuth2.credentials.ts # OAuth2 credential type definition
│   └── googleAds.svg                 # Credential icon
├── tests/
│   ├── run-tests.js                  # Custom test runner (no Jest/Mocha)
│   ├── test-data.json                # Test cases (valid/invalid/privacy/batch)
│   └── test-report.json              # Generated test report
├── docs/
│   ├── user-guide.md                 # End-user documentation
│   ├── developer-guide.md            # Architecture & dev details
│   ├── oauth-scopes.md               # OAuth2 scope documentation
│   └── testing-guide.md              # Testing procedures
├── dist/                             # Compiled output — GITIGNORED, never commit
├── package.json
├── tsconfig.json
├── gulpfile.js
├── .eslintrc.js
├── .prettierrc
├── index.ts                          # Package entry point
└── CHANGELOG.md
```

### Architecture Highlights

- **Single-file node**: The entire node lives in `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts`. Understanding this file is the bulk of understanding the project.
- **Custom error classes** (top of the node file): `GoogleAdsAuthenticationError`, `GoogleAdsValidationError`, `GoogleAdsApiError`, `GoogleAdsRateLimitError` — all extend `NodeOperationError`. New error paths should classify into one of these.
- **Credential type**: `credentials/GoogleAdsOAuth2.credentials.ts` extends `oAuth2Api` and handles OAuth2 flow, developer token, customer ID, and credential testing via a search query against the Google Ads API.
- **Entry points** (declared in `package.json` `n8n` block):
  - `dist/credentials/GoogleAdsOAuth2.credentials.js`
  - `dist/nodes/GoogleAdsConversion/GoogleAdsConversion.node.js`

---

## Building and Running

### Commands

| Command | Description |
|---------|-------------|
| `npm run build` | TypeScript compile + `gulp build:icons` (copies SVG assets) |
| `npm run build:force` | Same, with `--skipLibCheck` (use when n8n-workflow type drift blocks build) |
| `npm run build:watch` / `npm run dev` | `tsc --watch` for development |
| `npm run clean` | Remove `dist/` directory |
| `npm run lint` / `lint:fix` | ESLint over `nodes/` and `credentials/` |
| `npm run format` / `format:check` | Prettier over `nodes/`, `credentials/`, `docs/` |
| `npm test` | Custom validator via `tests/run-tests.js` (validates structure, not runtime) |
| `npm run validate` | `test` + `build:force` — run before publishing |
| `npm run package` | Clean + force build + `npm pack` |
| `npm run prepublishOnly` | Runs automatically on `npm publish`: `clean` + `validate` |

**Requirements**: Node >= 18, npm >= 8. Use **npm** (not pnpm/yarn) — locked via the `packageManager` field.

### Development Workflow

1. **Install dependencies**: `npm install`
2. **Start development watch**: `npm run dev`
3. **Make changes** to `.ts` files in `nodes/` or `credentials/`
4. **Test in n8n environment** with real Google Ads credentials
5. **Run validation** before publishing: `npm run validate`

### Installation (for end users)

```bash
npm install @jaimeflneto/n8n-nodes-google-ads-conversion
```

Or via n8n Community Nodes: `@jaimeflneto/n8n-nodes-google-ads-conversion`

---

## Development Conventions

### Code Style
- TypeScript with `strict: false` (intentional — some `@ts-ignore` comments exist for n8n version compatibility)
- ESLint with `eslint-plugin-n8n-nodes-base` for n8n-specific rules
- Prettier for formatting
- SOLID principles and DRY implementation
- **Do not remove `// @ts-ignore` on the `inputs`/`outputs` fields** of the node description. They exist for compatibility across n8n versions and removing them breaks installs on older hosts.

### Node Parameter Design
- All node parameters live inline in `description.properties` array of the node class
- Use `displayOptions` for conditional visibility
- `displayName` and subtitle values are user-facing UX strings — changing them is a UX change
- Group related parameters together with descriptive hints

### Error Handling
- Always use the custom error classes (`GoogleAdsAuthenticationError`, `GoogleAdsValidationError`, `GoogleAdsApiError`, `GoogleAdsRateLimitError`) instead of generic errors
- Retry/rate-limit logic depends on error class classification
- Never log unhashed user data (PII is hashed via `crypto.createHash('sha256')`)

### API Target
- Google Ads REST API **v23** (`requestDefaults.baseURL` in `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts`)
- When bumping API versions, grep for the version string (`v23`, `googleads.googleapis.com`) to update every reference in code, docs, and examples
- Check request/response shapes for `:uploadClickConversions`, `googleAds:search`, and customer listing on each upgrade
- MCC support requires proper `login-customer-id` header handling

### Build Artifacts
- **`dist/` is gitignored.** It is generated by `npm run build` and shipped via the `files` field in `package.json` at publish time.
- `prepublishOnly` enforces a clean rebuild before every `npm publish`.
- **Never edit files inside `dist/` by hand.** Edit the `.ts` source and rebuild.
- If `git status` shows changes under `dist/`, something is wrong — check the `.gitignore`.

### Testing
- Tests are **structural validation only** (no Jest/Mocha, no API calls)
- `tests/run-tests.js` validates that required functions/classes exist in source files
- `tests/test-data.json` contains example payloads for all identification methods
- Real integration testing requires an n8n environment with Google Ads credentials
- There is no single-test runner; edit `tests/run-tests.js` or `tests/test-data.json` to scope a check

### Documentation
- `README.md` — primary user-facing documentation
- `docs/` folder — detailed guides (user, developer, OAuth scopes, testing)
- Update docs when changing behavior, OAuth scopes, supported parameters, or the target API version

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts` | Main node logic — all operations, API calls, error handling, batch processing |
| `credentials/GoogleAdsOAuth2.credentials.ts` | OAuth2 credential definition, authentication headers, credential test |
| `package.json` | n8n node registration, scripts, dependencies |
| `tests/run-tests.js` | Structural validation test runner |
| `docs/user-guide.md` | End-user setup and usage instructions |
| `docs/developer-guide.md` | Architecture and contribution guidelines |

---

## Important Implementation Details

### Main Node Structure (`GoogleAdsConversion.node.ts`)

Key functions to understand:
- `getAuthenticatedHeaders()` — builds auth headers for API calls
- `validateCredentials()` — tests connectivity before execution
- `buildConversionPayload()` — constructs the API request body based on identification method
- `uploadConversion()` — makes the actual API call
- `executeWithRetry()` — handles retry logic with exponential backoff
- `parseApiError()` — extracts and classifies errors from API responses

### Privacy & Data Handling

- User identifiers (email, phone, names, addresses) are **automatically SHA-256 hashed** before transmission
- The node implements **zero data retention** — no conversion data is stored
- Consent fields (`adUserDataConsent`, `adPersonalizationConsent`) are passed through for GDPR compliance

### Batch Processing

- Batch sizes range from **1 to 2000** conversions per API call
- Three modes available:
  - **Partial Failure** (recommended): processes all, reports individual failures
  - **Fail Fast**: stops on first error
  - **Continue on Error**: processes all regardless of individual failures

---

## Workflow Expectations for Agents

- **Work in a git worktree** for any non-trivial task:
  ```bash
  git worktree add .worktrees/<task-name> -b <task-name>
  cd .worktrees/<task-name>
  ```
  Skip only for trivial fixes (typos, doc-only tweaks) or when already inside a worktree.
- **Spec before code** for non-trivial work: scope → requirements → design → tasks → implementation → tests → QA. Rejections route back to the correct phase, not back to square one.
- **Validation gate** before handing work off: `npm run lint`, `npm run build:force`, and `npm test` must all pass. Do not mark a task complete until the three are green.
- **Commit incrementally** — one logical change per commit; never batch unrelated work.
- **Commit messages must be written from the developer's perspective.** They must never mention AI, Claude, Copilot, or any AI tooling. Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- **Do not merge worktree branches without explicit user approval.** Deliver the branch ready for review; the user merges.

---

## Google Ads API Upgrade Playbook

When the Google Ads REST API ships a new version:

1. Check https://developers.google.com/google-ads/api/docs/release-notes and sunset dates.
2. Update `requestDefaults.baseURL` in `nodes/GoogleAdsConversion/GoogleAdsConversion.node.ts` — grep `googleads.googleapis.com` to sanity-check no stragglers.
3. Review request/response shapes for every endpoint this node touches (`uploadClickConversions`, `googleAds:search`, customer listing). Look for deprecated fields or enum changes.
4. Update `docs/developer-guide.md`, `docs/oauth-scopes.md`, `README.md`, and `TROUBLESHOOTING.md` wherever the old version appears.
5. Bump `package.json` version: minor bump if internal-only, major bump if any public node parameter changes.
6. Add a `CHANGELOG.md` entry with date, old version, new version, and a breaking-changes section (state explicitly even when empty).
7. Run the validation gate (`lint` + `build:force` + `test`) before committing the version bump.

---

## Hard Rules

1. **Never commit `dist/`.** It is gitignored.
2. **Never edit files inside `dist/` by hand.** Always rebuild from source.
3. **Never remove the `// @ts-ignore` on `inputs`/`outputs`** of the node description.
4. **Never introduce secrets** (API keys, OAuth tokens, customer IDs) into code, tests, fixtures, or commit messages.
5. **Never switch package manager.** Use npm.
6. **Never mention AI/Claude/Copilot in commit messages.**
7. **Never merge worktree branches without explicit user approval.**

---

## Current Version

**v0.9.0** — Google Ads API v23 upgrade (from v17). Minor bump: no breaking changes to the public node interface. MCC support, batch processing, enhanced conversions, and all existing workflows continue to function without reconfiguration.
