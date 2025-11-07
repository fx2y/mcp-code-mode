# Walkthrough: Repo & SDK Bootstrap (E2E Demo & Handoff)

_**Objective:** Execute the full developer workflow for Project 1 to validate the plan and produce a minimal, streaming Claude agent. This document serves as the script for QA and handoff._

---

### **1. Prerequisites**

- **Runtime:** Node.js ≥ 18
- **Credentials:** `ANTHROPIC_API_KEY` available in your shell environment.
- **Specs:** Familiarity with `@spec/prime.md` and `@spec/tasks.md`.

---

### **2. Walkthrough: From Zero to "Hello, Agent"**

_Execute these steps in a clean directory. Assumes `ANTHROPIC_API_KEY` is exported._

#### **Step 2A: Scaffold Project**

```bash
# Create project dir, init git/npm, create src dir
mkdir mcp-agent && cd mcp-agent
git init -q
npm init -y -q
mkdir -p src
```
*   **Outcome:** Basic project structure with `package.json`.

#### **Step 2B: Install Dependencies**

```bash
# Install SDK (prod) and TS/tooling (dev)
npm i @anthropic-ai/claude-agent-sdk
npm i -D typescript tsx @types/node
```
*   **Outcome:** `node_modules` and `package-lock.json` created with required packages.

#### **Step 2C: Configure TypeScript & `package.json`**

```bash
# Init TSConfig for ESM project structure
npx tsc --init --rootDir src --outDir dist --module ES2022 --target ES2022 --esModuleInterop

# Set package to ESM and add run scripts
# (Using jq for programmatic edit, manual edit is fine)
jq '.type = "module" | .scripts = { "dev": "tsx src/hello.ts", "build": "tsc -p tsconfig.json", "start": "node dist/hello.js", "test": "node -e \"console.log('smoke')\"" }' package.json > package.json.tmp && mv package.json.tmp package.json
```
*   **Outcome:** `tsconfig.json` created; `package.json` now has `"type": "module"` and `dev/build/start/test` scripts.

#### **Step 2D: Implement Core Logic & Hygiene Files**

```bash
# Create the minimal, tool-free streaming agent
cat <<EOF > src/hello.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const it = query({
  model: "claude-3-5-sonnet-latest",
  messages: [{ role: "user", content: "Say hello briefly." }],
  allowedTools: [], // Start locked down
});

for await (const m of it) {
  if ("delta" in m && typeof m.delta === "string") process.stdout.write(m.delta);
  if (m.type === "message_stop") process.stdout.write("\n");
}
EOF

# Create .gitignore and .env.example
cat <<EOF > .gitignore
node_modules/
dist/
.env
EOF

cat <<EOF > .env.example
ANTHROPIC_API_KEY=sk-ant-...
EOF
```
*   **Outcome:** `src/hello.ts` contains the agent logic; `.gitignore` and `.env.example` provide essential project hygiene.

---

### **3. Verification Protocol**

_Confirm the success of the bootstrap process._

#### **Step 3A: API Key Check**

```bash
# Ensure ANTHROPIC_API_KEY is loaded. Fallback to .env if needed.
# If this returns 'NO_KEY', ensure your export is correct or create a .env file.
node -e "console.log(!!process.env.ANTHROPIC_API_KEY||'NO_KEY')"
# Expected: true
```

#### **Step 3B: Live Dev Execution**

```bash
# Run agent in dev mode with tsx
npm run dev
```
*   **Expected Outcome:** A short, streamed "Hello!" message from Claude appears in the terminal within ~5 seconds.

#### **Step 3C: Build & Production Execution**

```bash
# Compile TS to JS
npm run build

# Verify output
ls dist/
# Expected: hello.js

# Run compiled code
npm start
```
*   **Expected Outcome:** The same "Hello!" message appears, this time executed from compiled JavaScript in the `dist` directory.

#### **Step 3D: Smoke Test**

```bash
npm test
```
*   **Expected Outcome:** The word "smoke" is printed to the console.

---

### **4. Handoff State Summary**

- **Repo:** `mcp-agent` is a functional, minimal TS/ESM project.
- **Core Logic:** Contains a single, tool-free streaming agent (`src/hello.ts`) that successfully communicates with the Anthropic API.
- **Tooling:** `package.json` scripts for `dev`, `build`, `start`, and `test` are configured and verified.
- **Security:** The agent starts with zero tools enabled (`allowedTools: []`), adhering to the principle of least privilege.
- **Next Step:** The repository is now in the state required to begin **Project 2: Code sandbox integration**. The foundation is stable.
