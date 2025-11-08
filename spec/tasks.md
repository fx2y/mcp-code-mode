# Project 2: Code Sandbox Integration - Implementation Plan

> Based on: `@spec/spec.md §2`, `@spec/prime.md`, `@spec/cheatsheet.md`
> Goal: Safe, repeatable code-exec for Claude Agent SDK agents with strict FS/NET isolation and least-privilege defaults.

---

## ✅ Top-Level Checklist

- [ ] **Phase 1:** Core Sandbox Infrastructure & Interface
- [ ] **Phase 2:** Policy Engine & Configuration
- [x] **Phase 3:** Agent SDK Integration
- [d] **Phase 4:** Security Hardening & Verification
- [ ] **Phase 5:** Observability & Documentation

---

## Phase 1: Core Sandbox Infrastructure & Interface

> **Goal:** Establish a foundational, locally-runnable sandbox and define the abstract interface for executing code within it.

- [ ] **1.1. Define Sandbox Runner Abstract Interface**
  - [x] Define a `SandboxRunner` interface with an `exec` method.
    - `exec(code: string, policy: SandboxPolicy): Promise<SandboxResult>`
  - [x] Define `SandboxPolicy` type (FS, NET, PROC limits). Ref: `@spec/cheatsheet.md §48`
  - [x] Define `SandboxResult` type (stdout, stderr, exitCode, resourceUsage).

- [x] **1.2. Setup Local Sandbox Provider (Container-based)**
  - [x] Choose Docker CLI as the local runtime; wired via `LocalContainerRunner`. (2025-11-08)
  - [x] Create a minimal base image in `docker/sandbox.Dockerfile` (Node 20 + tini + non-root sandbox user with `/workspace` + `/deps` mounts).
  - [x] Develop the runnable wrapper that launches containers with mounts/limits (`src/sandbox/runner/local-container-runner.ts`).
  - [x] Verification (2025-11-08): `npm run build && npm run test` compile/run the new runner utilities.

- [x] **1.3. Implement Basic Sandbox Execution Wrapper**
  - [x] Ship `LocalContainerRunner` with logger hooks and output truncation safeguards.
  - [x] The `exec` method now:
    - [x] Starts a per-run container from `mcp-code-mode-sandbox:latest`.
    - [x] Applies FS mounts + temp script bind (`/sandbox/snippet.sh`).
    - [x] Executes code via `/bin/sh`, captures stdout/stderr, enforces timeout, returns `SandboxResult`.
  - [x] Verification (2025-11-08): `npm run test` runs `tests/docker-args.test.ts` to ensure policy → CLI translation; `npm run build` validates type-safety.

## Phase 2: Policy Engine & Configuration

> **Goal:** Implement a system to parse and enforce security policies (FS, NET, PROC) for the sandbox.

- [ ] **2.1. Design and Implement Policy Configuration**
  - [x] Create a `SandboxPolicy` schema based on the YAML concept. Ref: `@spec/cheatsheet.md §48`
  - [x] Write a loader to read and parse a policy file (e.g., `sandbox.policy.yaml`).
  - [x] Establish default "secure-by-default" policies.
    - `net.enabled: false`
    - Minimal FS mounts.
    - Strict resource limits.
  - [x] Verification (2025-11-08): `npm run build`, `npm run test` cover schema typing + loader import paths.

- [ ] **2.2. Implement Filesystem (FS) Policy Enforcement**
  - [x] Integrate policy mounts with `LocalContainerRunner.resolveMounts()` (auto-creates host dirs).
  - [x] Translate `fs.mounts` policy to Docker `--mount` flags via `buildDockerRunArgs`.
    - `/workspace` (RW, ephemeral)
    - `/deps` (RO)
    - `/tmp` (RW, tmpfs)
  - [ ] Verify `fs.deny_globs` are not accessible. This may require runtime checks or more advanced container features. Start with mount restrictions. Ref: `@spec/cheatsheet.md §27`
    - ❗ Gap: No runtime glob enforcement yet; need overlay/allowlist probe.

- [ ] **2.3. Implement Network (NET) Policy Enforcement**
  - [x] Translate `net.enabled` policy to container network flags (`bridge` vs `none`) inside `buildDockerRunArgs`.
    - `true` -> `--network=bridge` (or similar, to be refined in Phase 4)
    - `false` -> `--network=none`
  - [ ] **Verification:**
    - [ ] `net.enabled: false` blocks all outbound traffic.
    - ❗ Pending manual/automated probe; runner currently assumes Docker honors flag.

- [ ] **2.4. Implement Process (PROC) & Resource Limit Enforcement**
  - [x] Translate `proc` policies to container runtime flags via `buildDockerRunArgs` + runner timeout.
    - `cpu_quota` -> `--cpus`
    - `mem_mb` -> `--memory`
    - `timeout_ms` -> Implement via a `Promise.race` with a `setTimeout` that kills the container.
    - `uid` -> `--user`
  - [ ] **Verification:**
    - [ ] A script exceeding `mem_mb` is killed.
    - [ ] An infinite loop is killed by the `timeout_ms`.
    - ❗ Need e2e stress scripts once Docker execution is wired into CI/dev env.

## Phase 3: Agent SDK Integration

> **Goal:** Wire the sandboxed runner into the Claude Agent SDK to replace the default, non-isolated tool execution.

- [x] **3.1. Create Sandbox-aware Tool Runner**
  - [x] Adapted the CLI tool contract into `createSandboxedCodeToolDefinition()` / `createSandboxedCodeServer()` (`src/tools/sandboxed-code.ts`) backed by `SandboxRunner`.
  - [x] `sandboxed_code.run` accepts shell snippets + policy overrides and returns structured stdout/stderr/policy snapshots for auditing.
  - [x] Defaulted the tool to `LocalContainerRunner` and ensured newline-safe script uploads to `/sandbox/snippet.sh`.
  - [x] Output text is truncated to 2k chars while the structured payload retains full stdout/stderr for downstream tools.

- [x] **3.2. Integrate Runner with Agent SDK Hooks**
  - [x] Introduced `sandboxQuery()` helper (`src/sandboxed-query.ts`) that wraps `query()`, registers the MCP server, and threads the runner/tool wiring in one place.
  - [x] Added a default `canUseTool` guard that auto-approves `sandboxed_code.run` and denies every other tool to keep `bash.run` dormant.
  - [x] `sandboxQuery()` auto-appends the tool to `allowedTools` + `mcpServers`, so callers no longer modify SDK plumbing manually.
  - [x] Updated `src/hello.ts` to call `sandboxQuery()` and instruct the model to use `sandboxed_code.run` for the demo flow.

- [x] **3.3. Expose Sandbox Configuration in `query()`**
  - [x] `sandboxQuery()` accepts `sandboxPolicy`, `sandboxRunner`, and policy file overrides; these defaults are merged into every `sandboxed_code.run` call.
  - [x] The helper keeps user-supplied SDK options intact (model, hooks, etc.) while injecting sandbox defaults.

- [x] **34. Handle Sandbox-specific Errors**
  - [x] Tool handler catches runner failures and returns `CallToolResult` with `isError: true` plus serialized error details for the model log.
  - [x] Success payloads always include exit code, runtime, stdout/stderr excerpts, and the effective policy snapshot for audits.

- [x] **Verification (2025-11-08):** `npm run build && npm run test` now cover `tests/sandboxed-code-tool.test.ts`, exercising policy merges + error surfacing without Docker.

> ❗ **Gap:** Need an end-to-end walkthrough (e.g., scripted `sandboxQuery` session) that proves the SDK actually invokes the tool against Anthropic's live backend once API access is configured.

## Phase 4: Security Hardening & Verification

> **Goal:** Implement production-grade security controls, including a network proxy and a comprehensive test suite.

- [ ] **4.1. Implement Egress Allowlist Proxy**
  - [ ] Set up a simple proxy server (e.g., Node.js with `http-proxy`).
  - [ ] The proxy reads a `net.allowlist` from the policy.
  - [ ] When `net.enabled: true`, configure the sandbox container to route all traffic through this proxy.
  - [ ] The proxy must:
    - [ ] Deny requests to non-allowlisted domains.
    - [ ] Strip sensitive headers.
    - [ ] (Optional) Sign requests to internal MCP servers.
  - [ ] Block access to Anthropic's own APIs to prevent exfil. Ref: `@spec/cheatsheet.md §38`

- [ ] **4.2. Implement Secrets Management/Isolation**
  - [ ] Ensure no secrets (`.env`, etc.) are ever mounted into the sandbox.
  - [ ] The MCP client, which holds secrets, must remain outside the sandbox. Ref: `@spec/cheatsheet.md §33`
  - [ ] **Verification:** Add a test that proves secrets are not accessible from within a sandboxed script.

- [ ] **4.3. Create Security Verification Test Suite**
  - [ ] Implement the test cases from `@spec/cheatsheet.md §73`.
  - [ ] **FS Escape:** `read /root/.ssh/id_rsa` -> **MUST FAIL**
  - [ ] **Dotfile Probe:** `read /workspace/.env` -> **MUST FAIL**
  - [ ] **NET Off:** `curl example.com` -> **MUST FAIL**
  - [ ] **NET On (Allowlist):**
    - `GET <allowlisted_mcp_server>` -> **MUST PASS**
    - `GET google.com` -> **MUST FAIL**
  - [ ] **Exfil Sim:** Attempt to use Anthropic File API -> **MUST BE BLOCKED** by proxy.
  - [ ] **Resource Cap:** Infinite loop -> **MUST BE KILLED** by timeout.

## Phase 5: Observability & Documentation

> **Goal:** Add basic logging/metrics and document the sandbox's behavior for developers.

- [ ] **5.1. Implement Basic Observability**
  - [ ] In the `SandboxRunner` wrapper, log key events and metrics. Ref: `@spec/cheatsheet.md §71`
    - `run_start`, `run_complete` (with exit code, duration).
    - Resources used (if available from container runtime).
    - Network egress: log every request (URL, status) made through the proxy.
  - [ ] Bind logs to a unique `run_id`.

- [ ] **5.2. Create Developer Documentation**
  - [ ] Create `SANDBOX.md`. Ref: `@spec/cheatsheet.md §78`
    - Explain the default FS/NET/PROC policies.
    - Document the available mounts (`/workspace`, `/deps`).
    - List the default network allowlist (initially empty).
    - Explain how to override policies for a specific task.
  - [ ] Create/update `SECURITY.md` with the sandbox threat model.
    - Explain exfiltration risks and the proxy control.
    - Link to the security test suite.
