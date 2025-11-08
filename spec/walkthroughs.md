# E2E Demo & Sign-off Walkthrough: Project 1 Bootstrap (Nov 2025)

_**Objective:** Provide a self-contained script for QA, product owners, and engineers to perform an end-to-end demonstration and sign-off for the `mcp-code-mode-starter` template. This walkthrough validates the final, implemented architecture as defined in `@spec/prime.md` and `@spec/tasks.md`._

---

### **1. Core Architectural Principle: Zero-Config Execution**

Before starting, understand the key innovation of this template:

*   **Zero-Config Credentials:** The agent uses `settingSources: ['user']`. This tells the SDK to automatically find and use credentials from the user's global Claude configuration file (`~/.anthropic/settings.json`).
*   **No More `.env` Files:** This approach is superior to and replaces the old method of managing `ANTHROPIC_API_KEY` in `.env` files or shell exports for local development. It provides a frictionless "it just works" experience for any developer already using Claude tools.
*   **Security by Default:** The agent is locked down with `allowedTools: []`, adhering to the principle of least privilege.

---

### **2. Pre-flight Checklist: Environment Verification**

*This checklist ensures the demo environment is correctly set up.*

*   **[ ] 2.1: Node.js Runtime**
    *   **Action:** Verify Node.js version is 18 or higher.
    *   **Command:** `node -v`
    *   **Expected:** `v18.x.x` or higher (e.g., `v25.1.0`).

*   **[ ] 2.2: Claude User Configuration**
    *   **Action:** Confirm that a global Claude settings file exists. This is the foundation for zero-config execution.
    *   **Command:** `ls ~/.claude/settings.json`
    *   **Expected:** The command succeeds, printing the file path. An error indicates the user has not logged in via a compatible tool before.

*   **[ ] 2.3: Project Dependencies**
    *   **Action:** Install all required project packages.
    *   **Command:** `npm install`
    *   **Expected:** The command completes without errors.

---

### **3. E2E Validation Protocol & Demo Script**

*This hierarchical checklist validates the entire deliverable, from code structure to live execution.*

*   **[ ] 3.1: M1 - Foundation & Scaffolding Verification**
    *   **Goal:** Ensure the project structure and configurations are correct.
    *   **[x] 3.1.1: `package.json` Sanity Check**
        *   **Action:** Inspect the `package.json` file.
        *   **Verify:**
            *   `"type": "module"` is present.
            *   `@anthropic-ai/claude-agent-sdk` is in `dependencies`.
            *   `typescript`, `tsx`, `@types/node` are in `devDependencies`.
    *   **[x] 3.1.2: `tsconfig.json` Sanity Check**
        *   **Action:** Inspect the `tsconfig.json` file.
        *   **Verify:** `module` and `target` are `ES2022`, `rootDir` is `./src`, and `outDir` is `./dist`.
    *   **[x] 3.1.3: `.gitignore` Verification**
        *   **Action:** Inspect the `.gitignore` file.
        *   **Verify:** It contains entries for `node_modules/`, `dist/`, and `.env`.

*   **[ ] 3.2: M2 - Core Executable Agent Verification**
    *   **Goal:** Ensure the agent's code is secure, correct, and uses the modern architecture.
    *   **[x] 3.2.1: Agent Source Code Inspection (`src/hello.ts`)**
        *   **Action:** Open and review `src/hello.ts`.
        *   **Verify (SDK v0.1.30 API):**
            *   It imports `query` from the SDK.
            *   It uses a `prompt` string, not a `messages` array.
            *   It correctly handles streaming via `m.event.type === "content_block_delta"`.
        *   **Verify (Security & Architecture):**
            *   `allowedTools: []` is explicitly set.
            *   `settingSources: ['user']` is present to enable zero-config.

*   **[ ] 3.3: M4 - End-to-End Validation**
    *   **Goal:** Execute all run modes to confirm the agent is fully functional.
    *   **[✅] 3.3.1: Development Mode Execution**
        *   **Action:** Run the agent using the `dev` script.
        *   **Command:** `npm run dev`
        *   **Expected:** A brief "Hello" message is streamed to the console from the agent.
        *   **Actual:** "Hello! How can I help you today?" ✅
    *   **[✅] 3.3.2: Build Process**
        *   **Action:** Compile the TypeScript source into JavaScript.
        *   **Command:** `npm run build`
        *   **Expected:** The command completes without errors and a `dist` directory is created.
    *   **[✅] 3.3.3: Production Mode Execution**
        *   **Action:** Run the compiled JavaScript output from the `dist` directory.
        *   **Command:** `npm start`
        *   **Expected:** The same "Hello" message is streamed to the console.
        *   **Actual:** "Hello!" ✅
    *   **[✅] 3.3.4: Smoke Test**
        *   **Action:** Run the simple validation test.
        *   **Command:** `npm test`
        *   **Expected:** The word `smoke` is printed to the console.

---

### **4. Final Sign-off**

*   **[✅] 4.1: Project 1 Acceptance**
    *   **Statement:** The `mcp-code-mode-starter` template has been successfully demonstrated and validated against all criteria. It is a secure, functional, and developer-friendly foundation.
    *   **Outcome:** **ACCEPTED** - All validation criteria met. Handoff for **Project 2: Code sandbox integration** is approved.