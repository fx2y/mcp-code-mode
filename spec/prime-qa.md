# QA Priming: E2E Validation for Project 1 (Nov 2025)

_**Objective:** Provide a dense, self-contained priming document for a technical user (QA, planner, engineer) to execute and understand the E2E validation script in `@spec/walkthroughs.md`. It synthesizes all relevant context, architectural decisions, and historical spec drift from the `@spec/` directory._

---

### **1. Executive Summary: The As-Built State**

*   **Project:** Project 1: Repo & SDK Bootstrap
*   **Status:** ✅ **COMPLETE**. The deliverable is a `mcp-code-mode-starter` template.
*   **Source of Truth:** `@spec/prime.md` documents the final, successful state.
*   **Core Achievement:** A "zero-config" agent that works out-of-the-box for existing Claude users, a significant improvement over initial specs.

---

### **2. Architectural Blueprint (The "What")**

*This is the precise architecture to be validated by `@spec/walkthroughs.md`.*

#### **`src/hello.ts` - Core Agent Logic**
*The agent's code reflects critical API corrections and architectural improvements.*
```typescript
// Source: @spec/prime.md, @spec/tasks.md (1B-1)
import { query } from "@anthropic-ai/claude-agent-sdk";

const it = query({
  prompt: "Say hello briefly.", // Correct API for SDK v0.1.30 (was `messages` array)
  options: {
    model: "claude-sonnet-4-5",
    allowedTools: [], // CRITICAL: Security-first principle, start locked.
    settingSources: ['user'], // 🚀 ARCHITECTURAL SHIFT: Enables zero-config via ~/.anthropic/settings.json
  },
});

for await (const m of it) {
  // Correct streaming logic for SDK v0.1.30
  if (m.type === "stream_event" && m.event.type === "content_block_delta" && m.event.delta?.type === "text_delta") {
    process.stdout.write(m.event.delta.text);
  }
  // Correct stop condition for SDK v0.1.30 (was `message_stop`)
  if (m.type === "result") {
    process.stdout.write("\n");
  }
}
```

#### **`package.json` - Project Manifest**
*Defines dependencies, scripts, and ESM context.*
```json
// Source: @spec/prime.md, @spec/tasks.md (1A-2, 1B-2)
{
  "type": "module", // Enables ES Modules
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.30" // Pinned version
  },
  "devDependencies": {
    "typescript": "...",
    "tsx": "...",
    "@types/node": "..."
  },
  "scripts": {
    "dev": "tsx src/hello.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/hello.js",
    "test": "node -e \"console.log('smoke')\""
  }
}
```

#### **`tsconfig.json` - TypeScript Configuration**
*Configured for a modern Node.js ESM project.*
```json
// Source: @spec/tasks.md (1A-3)
{
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "moduleResolution": "node" // Key for ESM compatibility
  }
}
```

---

### **3. Historical Context & Spec Drift (The "Why")**

*Understanding this context is key to the validation.*

*   **Initial Spec (`@spec/cheatsheet.md`) vs. Reality:** The initial `cheatsheet.md` was based on an older, incompatible version of the SDK.
*   **API Corrections:** During implementation (`@spec/tasks.md: 1B-1`), the API was discovered to be different. The full list of corrections is documented in `@spec/learnings.md`.
    *   `messages` array → `prompt` string
    *   `m.delta` → `m.event.delta.text`
    *   `message_stop` → `result`
*   **The Architectural Leap (`settingSources`):**
    *   The initial plan relied on `.env` files and `ANTHROPIC_API_KEY` exports (`@spec/cheatsheet.md: 3, 6`).
    *   A deliberate architectural improvement was made to use `settingSources: ['user']` (`@spec/tasks.md: 1B-1`).
    *   This pivot is the **single most important context**. It eliminated the need for manual API key setup, making the template "zero-config" for existing users. This is celebrated in `@spec/prime.md` and `@spec/learnings.md`.

---

### **4. Validation Traceability Matrix**

*This maps each step in `@spec/walkthroughs.md` to its origin and purpose.*

| Walkthrough Step | Action | Rationale & Priming Context |
| :--- | :--- | :--- |
| **2.1: Node.js Runtime** | `node -v` | **Requirement:** Node.js ≥ 18. **Source:** `@spec/prime.md` (Platform), `@spec/cheatsheet.md:11`. |
| **2.2: Claude Config** | `ls ~/.claude/settings.json` | **Requirement:** Global Claude config must exist. **Rationale:** This is the dependency for the `settingSources: ['user']` feature in `src/hello.ts:10`. Without it, the zero-config auth fails. |
| **2.3: Dependencies** | `npm install` | **Requirement:** Install packages from `package.json`. **Rationale:** Validates dependencies are resolvable. |
| **3.1: Foundation Verify** | Inspect `.json`, `.gitignore` | **Requirement:** Check project config files. **Rationale:** Confirms the output of scaffolding tasks in `@spec/tasks.md` (1A, 1C). |
| **3.2: Agent Logic Verify** | Inspect `src/hello.ts` | **Requirement:** Check source code for security and correctness. **Rationale:** This is the manual verification that the **API corrections** and the **`settingSources` architecture** were implemented correctly as per `@spec/tasks.md: 1B-1`. |
| **3.3: Execution Pipeline** | `npm run dev/build/start/test` | **Requirement:** Run all `package.json` scripts. **Rationale:** This is the live E2E test of the entire system, from TSX dev mode to compiled JS prod mode. Success confirms the project is fully functional as documented in `@spec/prime.md` (Validation Results). |
| **4.1: Final Sign-off** | Accept deliverable | **Requirement:** All checks pass. **Rationale:** Confirms the project meets the goals of `@spec/plan.md` and is ready for handoff to Project 2. |
