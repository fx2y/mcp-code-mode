# Project 1: Repo & SDK Bootstrap Tasklist (Nov 2025)

_**Objective:** Create a `mcp-code-mode-starter` template that scaffolds a working, tool-free Claude agent in <5 min. Based on `@spec/prime.md` & `@spec/cheatsheet.md`._

---

## 1A. Scaffolding & Dependencies (80% Impact)

- [ ] **1A-1: Initialize Project Structure**
  - [ ] `mkdir mcp-agent && cd mcp-agent`
  - [ ] `git init -q`
  - [ ] `npm init -y`
  - [ ] `mkdir -p src`

- [ ] **1A-2: Install Dependencies**
  - [ ] **Production:** `npm i @anthropic-ai/claude-agent-sdk`
  - [ ] **Development:** `npm i -D typescript tsx @types/node`

- [ ] **1A-3: Configure TypeScript**
  - [ ] Generate `tsconfig.json`: `npx tsc --init --rootDir src --outDir dist --module ES2022 --target ES2022 --esModuleInterop`
  - [ ] **Verification:**
    - [ ] `tsconfig.json` exists.
    - [ ] `rootDir` is `./src`.
    - [ ] `outDir` is `./dist`.
    - [ ] `module` and `target` are `ES2022`.

## 1B. Core Agent Implementation

- [ ] **1B-1: Create Minimal Agent**
  - [ ] Create `src/hello.ts`.
  - [ ] Add streaming, tool-free agent code. (Ref: `cheatsheet.md:36-52`)
    - [ ] Import `query` from `@anthropic-ai/claude-agent-sdk`.
    - [ ] Use model `claude-3-5-sonnet-latest`.
    - [ ] Set `allowedTools: []`.
    - [ ] Implement `for await` loop to stream `delta` to `process.stdout`.

- [ ] **1B-2: Configure `package.json`**
  - [ ] Set `"type": "module"` for ESM support.
  - [ ] Add `scripts` block. (Ref: `cheatsheet.md:58-69`)
    - [ ] `"dev": "tsx src/hello.ts"`
    - [ ] `"build": "tsc -p tsconfig.json"`
    - [ ] `"start": "node dist/hello.js"`
    - [ ] `"test": "node -e \"console.log('smoke')\""`

## 1C. Project Hygiene & Documentation

- [ ] **1C-1: Git & Environment**
  - [ ] Create `.gitignore`.
    - [ ] Add `node_modules/`
    - [ ] Add `dist/`
    - [ ] Add `.env`
  - [ ] Create `.env.example` with `ANTHROPIC_API_KEY=sk-ant-...`.

- [ ] **1C-2: Create Minimal README**
  - [ ] `README.md` with:
    - [ ] Project title.
    - [ ] Prereq: Node ≥18.
    - [ ] Env setup: `export ANTHROPIC_API_KEY` or use `.env`.
    - [ ] Install: `npm install`.
    - [ ] Run commands: `npm run dev`, `npm start`.

## 1D. Validation & Handoff Checklist

- [ ] **1D-1: Prerequisite Checks**
  - [ ] Node version is ≥18.
  - [ ] `ANTHROPIC_API_KEY` is present in environment (`node -e "console.log(!!process.env.ANTHROPIC_API_KEY||'NO_KEY')"` returns `true`).

- [ ] **1D-2: Execution Pipeline Verification**
  - [ ] `npm run dev` streams "Hello!" (or similar) to the console.
  - [ ] `npm run build` completes without errors.
  - [ ] `dist/hello.js` is created.
  - [ ] `npm start` runs the compiled output and prints the message.
  - [ ] `npm test` prints "smoke".

- [ ] **1D-3: Security & Constraint Validation**
  - [ ] `src/hello.ts` explicitly uses `allowedTools: []`.
  - [ ] `.env` file is correctly listed in `.gitignore`.
  - [ ] No secrets are hardcoded.

- [ ] **1D-4: Final Deliverable Check**
  - [ ] The entire setup from `mkdir` to `npm run dev` takes < 5 minutes.
  - [ ] The repository is ready to be used as a template for `create-mcp-agent`.
