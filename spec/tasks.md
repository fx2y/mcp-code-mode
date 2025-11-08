# Project 2: Code Sandbox Integration - Implementation Plan

> Based on: `@spec/spec.md §2`, `@spec/prime.md`, `@spec/cheatsheet.md`
> Goal: Safe, repeatable code-exec for Claude Agent SDK agents with strict FS/NET isolation and least-privilege defaults.

---

## ✅ Top-Level Checklist

- [ ] **Phase 1:** Core Sandbox Infrastructure & Interface
- [ ] **Phase 2:** Policy Engine & Configuration
- [ ] **Phase 3:** Agent SDK Integration
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

- [ ] **1.2. Setup Local Sandbox Provider (Container-based)**
  - [ ] Choose local container runtime (e.g., Docker/Podman). Ref: `@spec/cheatsheet.md §70`
  - [ ] Create a minimal base image Dockerfile for the execution environment.
    - Include Node.js runtime.
    - Pre-install any necessary dependencies (`/deps`).
  - [ ] Develop a script to run a container with specified resource limits and mounts.

- [ ] **1.3. Implement Basic Sandbox Execution Wrapper**
  - [ ] Create a concrete `LocalContainerRunner` that implements `SandboxRunner`.
  - [ ] The `exec` method should:
    - [ ] Start a new container from the base image.
    - [ ] Apply basic FS mounts (e.g., mount a temporary script file).
    - [ ] Execute the code inside the container.
    - [ ] Capture stdout/stderr and kill the container.
    - [ ] Return the `SandboxResult`.

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
  - [ ] Integrate policy with the `LocalContainerRunner`.
  - [ ] Translate `fs.mounts` policy to container volume mount commands (`-v` or `--mount`).
    - `/workspace` (RW, ephemeral)
    - `/deps` (RO)
    - `/tmp` (RW, tmpfs)
  - [ ] Verify `fs.deny_globs` are not accessible. This may require runtime checks or more advanced container features. Start with mount restrictions. Ref: `@spec/cheatsheet.md §27`

- [ ] **2.3. Implement Network (NET) Policy Enforcement**
  - [ ] Translate `net.enabled` policy to container network flags.
    - `true` -> `--network=bridge` (or similar, to be refined in Phase 4)
    - `false` -> `--network=none`
  - [ ] **Verification:**
    - [ ] `net.enabled: false` blocks all outbound traffic.

- [ ] **2.4. Implement Process (PROC) & Resource Limit Enforcement**
  - [ ] Translate `proc` policies to container runtime flags. Ref: `@spec/cheatsheet.md §28, §40`
    - `cpu_quota` -> `--cpus`
    - `mem_mb` -> `--memory`
    - `timeout_ms` -> Implement via a `Promise.race` with a `setTimeout` that kills the container.
    - `uid` -> `--user`
  - [ ] **Verification:**
    - [ ] A script exceeding `mem_mb` is killed.
    - [ ] An infinite loop is killed by the `timeout_ms`.

## Phase 3: Agent SDK Integration

> **Goal:** Wire the sandboxed runner into the Claude Agent SDK to replace the default, non-isolated tool execution.

- [ ] **3.1. Create Sandbox-aware Tool Runner**
  - [ ] Adapt the `bash.run` tool logic from `@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts`.
  - [ ] Create a new tool, e.g., `sandboxed_code.run`, that accepts code and an optional policy override.
  - [ ] This tool will use the `SandboxRunner` from Phase 1.
  - [ ] Disable the default `bash.run` tool or ensure its `dangerouslyDisableSandbox` flag is never used. Ref: `@spec/prime.md §12`

- [ ] **3.2. Integrate Runner with Agent SDK Hooks**
  - [ ] Use `sdk.configure` to register the new `sandboxed_code.run` tool.
  - [ ] Use the `onToolRequest` hook to gate tool usage. Ref: `@spec/cheatsheet.md §56`
  - [ ] Deny unknown tools by default.
  - [ ] **Initial state:** Update `src/hello.ts` to use the new sandboxed tool.

- [ ] **3.3. Expose Sandbox Configuration in `query()`**
  - [ ] Extend the `query()` options to accept a `sandboxPolicy` object. Ref: `@spec/prime.md §41`
  - [ ] This policy will be the default for all `sandboxed_code.run` calls within that query.

- [ ] **34. Handle Sandbox-specific Errors**
  - [ ] Catch errors from the sandbox runner (e.g., timeout, OOM kill).
  - [ ] Format them into a clear, concise error message to be returned to the agent model.

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
