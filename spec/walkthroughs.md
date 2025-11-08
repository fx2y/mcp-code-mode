# Project 2: Code Sandbox - E2E Walkthroughs & Handoff

> **Audience:** Product, QA, Engineering.
> **Purpose:** Review and approve the implementation plan by demonstrating key e2e behaviors. This document serves as a handoff guide for using and verifying the finished sandbox integration.
> **Context:** Assumes implementation of `@spec/tasks.md` is complete.

---

## Scenario 1: Happy Path - Basic Safe Execution

- **Objective:** Verify a benign script runs successfully in isolation, returning its output.
- **Setup:**
  - **Agent Code (`src/demos/run-basic.ts`):**
    ```ts
    import { sdk } from '../sdk'; // Assuming configured SDK
    
    const result = await sdk.query({
      prompt: 'Run a hello world script.',
      tools: ['sandboxed_code.run'],
      tool_code: `sandboxed_code.run({ code: 'console.log("hello from sandbox");' })`,
    });
    console.log(result.tool_output);
    ```
  - **Sandbox Policy (`sandbox.policy.yaml`):** Default (no network, minimal FS, strict limits).
- **Steps:**
  1. Execute `node src/demos/run-basic.ts`.
- **Expected Outcome:**
  - **STDOUT:** `hello from sandbox`
  - **Exit Code:** 0
  - **Observability Log:** Entry shows `run_complete`, `exitCode: 0`, and a short duration.
- **Rationale:** The script is non-malicious and requires no special permissions, so it runs to completion within the default secure policy.

---

## Scenario 2: FS Policy - Workspace & Boundary Enforcement

- **Objective:** Prove the sandbox enforces FS read/write boundaries defined in the policy.
- **Setup:**
  - **Agent Code (`src/demos/run-fs-test.ts`):**
    ```ts
    // ...
    const code = `
      const fs = require('fs');
      // 1. Allowed: Write to ephemeral workspace
      fs.writeFileSync('/workspace/test.txt', 'data');
      const data = fs.readFileSync('/workspace/test.txt', 'utf8');
      console.log('Wrote: ' + data);
      
      // 2. Denied: Attempt to read a sensitive host file
      try {
        fs.readFileSync('/etc/passwd');
      } catch (e) {
        console.error('Failed to read /etc/passwd');
      }
    `;
    await sdk.query({ /* ... */ tool_code: `sandboxed_code.run({ code })` });
    ```
- **Steps:**
  1. Execute `node src/demos/run-fs-test.ts`.
- **Expected Outcome:**
  - **STDOUT:** `Wrote: data`
  - **STDERR:** `Failed to read /etc/passwd` (or similar error from the `fs` module).
  - **Observability Log:** Shows a successful run, as the script's `try/catch` handles the permission error. The underlying container runtime would have blocked the read syscall.
- **Rationale:** The policy provides an ephemeral `/workspace` (RW) but denies access to host paths. This demonstrates successful FS isolation as per `@spec/cheatsheet.md §27`.

---

## Scenario 3: NET Policy - Deny by Default

- **Objective:** Verify the default policy blocks all outbound network traffic.
- **Setup:**
  - **Agent Code (`src/demos/run-net-deny.ts`):**
    ```ts
    // ...
    const code = `
      require('http').get('http://example.com', (res) => {
        console.log('Connection succeeded');
      }).on('error', (e) => {
        console.error('Connection failed: ' + e.message);
      });
    `;
    await sdk.query({ /* ... */ tool_code: `sandboxed_code.run({ code })` });
    ```
- **Steps:**
  1. Execute `node src/demos/run-net-deny.ts`.
- **Expected Outcome:**
  - **STDERR:** `Connection failed: ...` (e.g., `getaddrinfo ENOTFOUND example.com` or a timeout).
  - **Observability Log:** Shows the sandbox execution failed due to a network error, consistent with the `--network=none` container flag.
- **Rationale:** The default `net.enabled: false` policy prevents all network access, a core principle of least-privilege security. Ref: `@spec/cheatsheet.md §28`.

---

## Scenario 4: NET Policy - Controlled Egress via Allowlist

- **Objective:** Verify that a task-specific policy can enable network access to an allowlisted domain via the egress proxy.
- **Setup:**
  - **Agent Code (`src/demos/run-net-allow.ts`):**
    ```ts
    // ...
    const policyOverride = {
      net: {
        enabled: true,
        allowlist: ['mcp-files.internal:8080'] 
      }
    };
    const code = `
      // 1. Allowed call
      require('http').get('http://mcp-files.internal:8080/health', ...);
      // 2. Denied call
      require('http').get('http://google.com', ...);
    `;
    await sdk.query({
      prompt: 'Check health of files service.',
      // Policy is overridden for this specific query
      sandboxPolicy: policyOverride,
      tool_code: `sandboxed_code.run({ code })`
    });
    ```
- **Steps:**
  1. Ensure the egress proxy and a mock `mcp-files.internal` service are running.
  2. Execute `node src/demos/run-net-allow.ts`.
- **Expected Outcome:**
  - **STDOUT:** Contains the `/health` response.
  - **STDERR:** Contains the connection error for `google.com`.
  - **Proxy Logs:** Show a `200 OK` for the allowlisted URL and a `403 Forbidden` (or similar) for `google.com`.
- **Rationale:** The per-task policy enables networking, but the egress proxy enforces the domain allowlist, demonstrating fine-grained, auditable network control.

---

## Scenario 5: Resource Limit Enforcement

- **Objective:** Prove the sandbox automatically terminates processes that exceed resource quotas (CPU/time).
- **Setup:**
  - **Agent Code (`src/demos/run-resource-limit.ts`):**
    ```ts
    // ...
    const policyOverride = { proc: { timeout_ms: 500 } };
    const code = 'while(true) {}'; // Infinite loop
    await sdk.query({
      sandboxPolicy: policyOverride,
      tool_code: `sandboxed_code.run({ code })`
    });
    ```
- **Steps:**
  1. Execute `node src/demos/run-resource-limit.ts`.
- **Expected Outcome:**
  - **Tool Output:** An error message indicating the process was terminated.
  - **Exit Code:** A non-zero exit code (e.g., 137 for SIGKILL).
  - **Observability Log:** `run_complete` event with `status: killed`, `reason: timeout`.
- **Rationale:** The sandbox runner enforces the `timeout_ms` from the policy, preventing denial-of-service and runaway processes. Ref: `@spec/cheatsheet.md §28`.

---

## Scenario 6: Secrets Isolation Verification

- **Objective:** Prove that host environment variables and secrets are not exposed inside the sandbox.
- **Setup:**
  - **Host Environment:** `export CLAUDE_API_KEY="sk-..."`
  - **Agent Code (`src/demos/run-secrets-test.ts`):**
    ```ts
    // ...
    const code = 'console.log("API Key: " + process.env.CLAUDE_API_KEY);';
    await sdk.query({ /* ... */ tool_code: `sandboxed_code.run({ code })` });
    ```
- **Steps:**
  1. Execute `node src/demos/run-secrets-test.ts`.
- **Expected Outcome:**
  - **STDOUT:** `API Key: undefined`
- **Rationale:** The sandbox is a clean environment. Secrets are held by the MCP client *outside* the sandbox and never passed in, preventing exfiltration by sandboxed code. This is the core of the "code-mode" pattern. Ref: `@spec/cheatsheet.md §33`.
