# Repo & SDK bootstrap — cheat sheet (TS/Node, Nov 2025)

## 0) Outcome

* Fresh TS repo running a minimal Claude Agent SDK “hello” with sane scripts & env.
* Uses **`@anthropic-ai/claude-agent-sdk`** and **`ANTHROPIC_API_KEY`**. ([npm][1])

## 1) Prereqs

* **Node ≥ 18** (SDK TS path). ([Claude Docs][2])
* **Anthropic API key** → export **`ANTHROPIC_API_KEY`**. ([Claude Help Center][3])
* Optional: read SDK overview & migration notes. ([Claude Docs][4])

## 2) Scaffold (ESM + TS)

```bash
mkdir mcp-agent && cd mcp-agent
git init -q
npm init -y
npm i @anthropic-ai/claude-agent-sdk
npm i -D typescript tsx @types/node
npx tsc --init --rootDir src --outDir dist --module ES2022 --target ES2022 --esModuleInterop
mkdir -p src
```

* Why this pkg: official TS SDK for agents. ([npm][1])

## 3) Secrets

* **.env (local only)**
  `ANTHROPIC_API_KEY=sk-ant-…`
* **Shell (alt):** `export ANTHROPIC_API_KEY=…` (Win: setx). ([Claude Help Center][3])

## 4) Minimal agent (streaming, no tools)

```ts
// src/hello.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const it = query({
  model: "claude-sonnet-4-5",
  messages: [{ role: "user", content: "Say hello briefly." }],
  // keep tools closed for bootstrap
  allowedTools: [],
});

for await (const m of it) {
  // print assistant deltas or final text
  if ("delta" in m && typeof m.delta === "string") process.stdout.write(m.delta);
  if (m.type === "message_stop") process.stdout.write("\n");
}
```

* `query()` is the SDK’s minimal entry; streaming mode is recommended for interactive agents. ([Claude Docs][5])

## 5) Scripts

```json
// package.json (snippets)
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

## 6) First run

```bash
# ensure key present
node -e "console.log(!!process.env.ANTHROPIC_API_KEY||'NO_KEY')"
npm run dev
npm run build && npm start
```

## 7) Opt-in capabilities (tight, later)

* **Permissions**: start locked; open only what you need via **`allowedTools` / `disallowedTools`** or callbacks. ([Claude Docs][6])
* **Built-in tools menu** (when you’re ready): Bash, code exec, web fetch/search, FS, etc. Keep least-privilege. ([Claude Docs][7])

## 8) Project hygiene (1-liners)

* **.gitignore**: `node_modules/ dist/ .env`
* **README**: install, env var, run.
* **CI smoke**: `npm -v && node -v && npm run build`.

## 9) Sanity checklist

* Node ≥ 18? SDK installed? **Yes**. ([Claude Docs][2])
* API key exported? **Yes**. ([Claude Help Center][3])
* Streaming output prints text? **Yes** (streaming mode default/rec). ([Claude Docs][8])

## 10) Useful refs (pin for later)

* **Agent SDK overview** (concepts, modes). ([Claude Docs][4])
* **Migration guide** (import path → `@anthropic-ai/claude-agent-sdk`). ([Claude Docs][5])
* **NPM package page** (latest version). ([npm][1])
* **Permissions** (approve/deny patterns). ([Claude Docs][6])

---

### Notes for experts (terse)

* Keep bootstrap **tool-free** (lower risk); add tools behind explicit allowlists later. ([Claude Docs][6])
* Prefer **streaming input** for real agents; single-call is fine for batch. ([Claude Docs][8])
* If migrating from “Claude Code SDK”, only the **import/package name** changes for this step. ([Claude Docs][5])

[1]: https://www.npmjs.com/package/%40anthropic-ai%2Fclaude-agent-sdk "anthropic-ai/claude-agent-sdk"
[2]: https://docs.claude.com/en/api/agent-sdk/hosting "Hosting the Agent SDK"
[3]: https://support.claude.com/en/articles/12304248-managing-api-key-environment-variables-in-claude-code "Managing API Key Environment Variables in Claude Code"
[4]: https://docs.claude.com/en/api/agent-sdk/overview "Agent SDK overview"
[5]: https://docs.claude.com/en/docs/claude-code/sdk/migration-guide "Migrate to Claude Agent SDK"
[6]: https://docs.claude.com/en/api/agent-sdk/permissions "Handling Permissions"
[7]: https://docs.claude.com/en/docs/claude-code/sdk/sdk-permissions "Handling Permissions"
[8]: https://docs.claude.com/en/api/agent-sdk/streaming-vs-single-mode "Streaming Input"
