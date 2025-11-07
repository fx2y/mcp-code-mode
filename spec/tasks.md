# Tasks & Checks — Claude Agent SDK Bootstrap (Nov 2025)

## Implementation Tasklists (High ➝ Low granularity)
1. Mission & Guardrails
   - [ ] Restate outcome: fresh TS repo running @anthropic-ai/claude-agent-sdk "hello" stream + no tools, Node ≥18, ANTHROPIC_API_KEY env, Nov 2025 context.
   - [ ] Align team on Pareto intent: deliver minimal hello loop before optional tooling; defer nice-to-haves.
   - [ ] Record official refs for onboarding (Claude Docs: hosting, overview, migration, permissions; npm pkg page).

2. Platform & Access Prep
   - [ ] Verify Node ≥18 (`node -v`) + npm availability; capture exact versions in README for traceability.
   - [ ] Fetch ANTHROPIC_API_KEY from org secrets vault; store securely for dev only.
   - [ ] Export key in shell (`export ANTHROPIC_API_KEY=sk-…` or Windows `setx`); document scope + revocation steps.
   - [ ] Skim Claude Agent SDK overview + migration notes to spot breaking changes before coding.

3. Repo Scaffolding (ESM + TS)
   - [x] Create `mcp-agent` dir, `git init -q`, `npm init -y`; commit baseline.
   - [x] Install runtime deps `npm i @anthropic-ai/claude-agent-sdk` (pins latest Nov 2025); log semver.
   - [x] Install dev deps `npm i -D typescript tsx @types/node` for TS compile + ESM runner.
   - [x] Generate `tsconfig` via `npx tsc --init --rootDir src --outDir dist --module ES2022 --target ES2022 --esModuleInterop`.
   - [x] Create `src/` tree; ensure editor/formatter configs respect ESM + TS defaults.

4. Secrets & Config Hardening
   - [ ] Create local `.env` with single line `ANTHROPIC_API_KEY=sk-ant-...`; note storage policy (never commit).
   - [ ] Document alt shell export snippet in README for CI/Windows.
   - [x] Update `.gitignore` to include `node_modules/`, `dist/`, `.env` (order for readability).
   - [ ] Optionally script secret validation to fail fast if key missing before runtime.

5. Minimal Agent Implementation (`src/hello.ts`)
   - [x] Import `{ query }` from SDK; instantiate `query({ model: "claude-3-5-sonnet-latest", messages:[{role:"user",content:"Say hello briefly."}], allowedTools: [] })`.
   - [x] Implement `for await (const m of it)` loop printing string deltas and newline on `message_stop` to stdout.
   - [x] Keep code tool-free, no custom tool registry; add terse comment explaining streaming delta handling.
   - [x] Ensure TypeScript types satisfied without suppressions; rely on `@types/node` for `process.stdout` typings.

6. package.json Scripts & Module Flag
   - [x] Set `"type": "module"` in `package.json` to keep ESM consistent with TS config.
   - [x] Add scripts: `"dev": "tsx src/hello.ts"`, `"build": "tsc -p tsconfig.json"`, `"start": "node dist/hello.js"`, `"test": "node -e \"console.log('smoke')\""`; mirror spec names for supportability.
   - [ ] Confirm build emits `dist/hello.js` so `npm start` never fails post-build.

7. Run Pipeline
   - [ ] Execute `node -e "console.log(!!process.env.ANTHROPIC_API_KEY||'NO_KEY')"`; halt if it prints `NO_KEY`.
   - [ ] `npm run dev` to stream hello; capture sample output + troubleshooting notes for README.
   - [ ] `npm run build && npm start` to validate TS→JS flow; record timing + exit codes.
   - [ ] Note rollback/fix steps (rerun `npm i`, regen tsconfig) if failures recur.

8. Permissions & Tool Strategy
   - [ ] Keep `allowedTools: []` and mention `disallowedTools` fallback; document rationale (least privilege until tool review).
   - [ ] Outline process to add built-in tools (bash, code, web, fs) only after threat assessment + approvals.
   - [ ] Link Claude permissions docs for future maintainers; log open questions in backlog.

9. Project Hygiene & CI
   - [ ] Ensure `.gitignore` covers `node_modules/`, `dist/`, `.env`; verify via `git status` before commits.
   - [ ] Draft README covering install, env export (`export`/`setx`), dev/build/start usage, doc refs (hosting, overview, migration, permissions, streaming, npm).
   - [ ] Add CI smoke (e.g., GitHub Actions) running `npm -v && node -v && npm run build`.
   - [ ] Capture future enhancements (tool opt-in, migrations) as backlog entries outside MVP scope.

## Verification Checklists (Mirror Implementation)
A. Platform & Dependencies
   - [ ] `node -v` ≥ 18.x logged; npm present.
   - [ ] `package.json` lists `@anthropic-ai/claude-agent-sdk`, `typescript`, `tsx`, `@types/node` with expected versions.
   - [ ] `tsconfig.json` has `rootDir: src`, `outDir: dist`, ES2022 module + target, `esModuleInterop: true`.

B. Secrets & Config
   - [ ] `.env` exists locally, owned by developer, excluded from git.
   - [ ] `process.env.ANTHROPIC_API_KEY` resolves in shell/CI contexts; command check returns `true`.
   - [ ] README documents env setup + revocation instructions.

C. Agent Behavior
   - [ ] `npm run dev` streams hello text with newline on `message_stop`.
   - [ ] `allowedTools` array empty; no implicit tool enablement logged.
   - [ ] Query uses `claude-3-5-sonnet-latest`; messages payload matches spec prompt.

D. Build & Scripts
   - [ ] `npm run dev`, `npm run build`, `npm start`, `npm test` succeed without manual tweaks.
   - [ ] `dist/hello.js` matches TS output timestamp ≥ build time.
   - [ ] CI smoke job exits 0 and reports Node/npm versions.

E. Hygiene & Documentation
   - [ ] `.gitignore` properly blocks `node_modules`, `dist`, `.env`; repo clean after install/build.
   - [ ] README includes install/env/run steps + links to hosting, overview, migration, permissions, streaming, npm refs.
   - [ ] Backlog tracks pending tool enablement + doc refresh cadence (quarterly or per SDK release).
