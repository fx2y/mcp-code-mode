# Project 1: Bootstrap Plan (Milestones)

_**Objective:** Define logical epics for delivering the `mcp-code-mode-starter` template. This plan clusters tasks from `@spec/tasks.md` into strategic milestones for phased implementation and review._

---

### **M1: Foundation & Scaffolding**

*   **Goal:** Establish the project's file structure, version control, and core dependencies.
*   **Deliverable:** A non-runnable but correctly structured project folder with all necessary packages installed.
*   **Clusters:**
    *   **1.1. Environment Init:** Basic repo and package setup.
        *   Tasks: `mkdir`, `git init`, `npm init`. (Ref: `1A-1`)
    *   **1.2. Dependency Installation:** Pull SDK and dev tools.
        *   Tasks: `npm i @anthropic-ai/claude-agent-sdk`, `npm i -D typescript tsx @types/node`. (Ref: `1A-2`)

---

### **M2: Core Executable Agent**

*   **Goal:** Make the agent runnable in both development and production modes.
*   **Deliverable:** A functional `npm run dev` and `npm start` pipeline that executes the agent.
*   **Clusters:**
    *   **2.1. TS Compilation Setup:** Configure the TypeScript-to-JavaScript build.
        *   Tasks: `npx tsc --init` with specified ESM-friendly flags. (Ref: `1A-3`)
    *   **2.2. Agent Implementation:** Write the minimal, tool-free agent logic.
        *   Tasks: Create and populate `src/hello.ts` with corrected SDK v0.1.30 API. (Ref: `1B-1`)
        *   **🚀 Bonus**: Implement zero-config credentials via `settingSources: ['user']`
    *   **2.3. Scripting & Execution:** Wire up `package.json` to run the agent.
        *   Tasks: Set `"type": "module"`, add `dev/build/start/test` scripts. (Ref: `1B-2`)

---

### **M3: Repository Readiness & DX**

*   **Goal:** Make the repository safe, understandable, and ready for other developers.
*   **Deliverable:** A clean repository with clear instructions and environment guards.
*   **Clusters:**
    *   **3.1. Secret & Build Hygiene:** Prevent secrets and build artifacts from entering Git.
        *   Tasks: Create `.gitignore`, provide `.env.example`. (Ref: `1C-1`)
    *   **3.2. Developer Onboarding:** Document the setup and run process.
        *   Tasks: Create a minimal `README.md`. (Ref: `1C-2`)

---

### **M4: End-to-End Validation**

*   **Goal:** Verify all components work together and meet the project's success criteria.
*   **Deliverable:** A fully validated bootstrap template, ready for handoff.
*   **Clusters:**
    *   **4.1. Runtime Verification:** Confirm all execution paths work.
        *   Tasks: `npm run dev`, `npm run build && npm start`, `npm test`. (Ref: `1D-2`)
    *   **4.2. Prerequisite & Security Checks:** Ensure environment and security constraints are met.
        *   Tasks: API key check, `allowedTools: []` confirmation. (Ref: `1D-1`, `1D-3`)
    *   **4.3. Final Acceptance:** The "5-minute" test.
        *   Tasks: Full walkthrough from `mkdir` to a running agent. (Ref: `1D-4`)
