# Priming: Repo & SDK Bootstrap (Nov 2025)

## Current State
- **Repo**: `/Users/abdullah/git/fx2y/mcp-code-mode` - git repo, single commit `75b7842 initial commit`
- **Structure**: Only `/spec/` dir exists with `spec.md`, `cheatsheet.md`
- **Deleted**: `spec/tasks.md` contained detailed implementation tasklists (see git history)
- **Platform**: Node v25.1.0, npm v11.6.2 (≥18 requirement met)
- **Target**: `mcp-code-mode-starter` template repo using Claude Agent SDK

## Mission Objective
Deliver **Project 1**: Repo & SDK bootstrap (1d) - "hello, world" agent in <5 min
- **Deliverable**: Template repo (`create-mcp-agent`), Node 20+, pnpm, Claude Agent SDK
- **Entry point**: `npm create mcp-agent@latest` yields working agent
- **Key constraint**: Tool-free bootstrap, streaming agent, ESM + TS

## Technical Architecture (from specs)

### Core Stack
- **Runtime**: Node ≥18, ESM modules, TypeScript
- **SDK**: `@anthropic-ai/claude-agent-sdk` (latest Nov 2025)
- **Build**: TypeScript compiler + `tsx` for dev execution
- **Env**: `ANTHROPIC_API_KEY` via shell or `.env`

### Agent Configuration (from cheatsheet.md:36-52)
```ts
// Core query pattern - tool-free bootstrap
import { query } from "@anthropic-ai/claude-agent-sdk";

const it = query({
  model: "claude-3-5-sonnet-latest",
  messages: [{ role: "user", content: "Say hello briefly." }],
  allowedTools: [], // CRITICAL: start locked
});
```

### Required Scripts (cheatsheet.md:58-69)
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx src/hello.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/hello.js",
    "test": "node -e \"console.log('smoke')\""
  }
}
```

## Implementation Blueprint (Pareto 80/20)

### Phase 1: Scaffolding (30% effort, 80% impact)
1. **Repo init**: `mkdir mcp-agent && cd mcp-agent && npm init -y`
2. **Deps install**: `npm i @anthropic-ai/claude-agent-sdk`
3. **Dev deps**: `npm i -D typescript tsx @types/node`
4. **TS config**: `npx tsc --init --rootDir src --outDir dist --module ES2022 --target ES2022 --esModuleInterop`

### Phase 2: Core Implementation (50% effort, 20% polish)
1. **Hello agent**: `src/hello.ts` with streaming query (cheatsheet.md:36-52)
2. **Package scripts**: dev/build/start/test matrix
3. **Env setup**: `.env` + shell export patterns
4. **Git hygiene**: `.gitignore` for node_modules/, dist/, .env

### Phase 3: Validation (20% effort, 0% risk)
1. **API key check**: `node -e "console.log(!!process.env.ANTHROPIC_API_KEY||'NO_KEY')"`
2. **Run pipeline**: `npm run dev` → stream, `npm run build && npm start` → compile
3. **Permission lock**: Verify `allowedTools: []` enforced

## Critical Success Factors

### Security First
- **Least privilege**: `allowedTools: []` until explicit tool review (deleted tasks.md:8A)
- **Secret isolation**: API key never in git, local `.env` only (cheatsheet.md:28-33)
- **Sandbox default**: No implicit tool enablement (cheatsheet.md:82)

### Developer Experience
- **Streaming output**: Real-time agent response (cheatsheet.md:47-51)
- **Zero-config**: Works with just `ANTHROPIC_API_KEY` export
- **Modern stack**: ESM + TS, no CommonJS baggage

### Handoff Readiness
- **Self-documenting**: Descriptive names, no comments needed
- **Modular**: Single entry point, clear separation of concerns
- **Testable**: Smoke test validates entire pipeline

## Reference Points (for maintainers)
- **SDK overview**: Claude Docs hosting/overview/migration/permissions
- **Streaming mode**: Recommended for interactive agents (cheatsheet.md:54)
- **Migration path**: Only import/package name changes from legacy (cheatsheet.md:110)

## Risk Mitigation
- **Node version lock**: Document exact tested versions (currently 25.1.0)
- **SDK pinning**: Record specific package version in README
- **Fallback patterns**: Shell export vs `.env` for CI/Windows (cheatsheet.md:32)

## Next Handoff Targets
1. **Project 2**: Code sandbox integration (1-2d) - requires working agent from this phase
2. **Project 3**: MCP client + servers (1d) - builds on SDK foundation
3. **Project 4**: Code-mode wrapper generator (2d) - needs tool discovery patterns

## Validation Criteria
- [ ] `npm create mcp-agent@latest` creates working template
- [ ] `npm run dev` streams "hello" response within 5s
- [ ] `npm run build && npm start` executes compiled JS
- [ ] API key validation passes before SDK calls
- [ ] Zero tools enabled (`allowedTools: []`)