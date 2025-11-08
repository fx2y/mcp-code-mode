# Project Plan: Code Sandbox Integration

> **Objective:** Group the implementation plan (`@spec/tasks.md`) into logical milestones for delivery. Each milestone represents a distinct, verifiable chunk of value.

---

### Milestone 1: Sandbox Core & Policy Engine

- **Goal:** Deliver a standalone, policy-driven local sandbox runner, fully functional but not yet integrated with the Agent SDK.
- **Key Deliverables:**
  - **1.1. Abstract Sandbox Interface:**
    - Defines the core contract (`SandboxRunner`) for executing code with a given policy.
    - Decouples the agent from the specific sandbox implementation (e.g., local container vs. cloud service).
    - *Ref: `@spec/tasks.md §1.1`*
  - **1.2. Local Container Runner:**
    - Implements `SandboxRunner` using a container backend (Docker/Podman).
    - Manages container lifecycle, code injection, and result retrieval.
    - *Ref: `@spec/tasks.md §1.2, §1.3`*
  - **1.3. Policy Engine:**
    - Parses and enforces security policies from a configuration file (`sandbox.policy.yaml`).
    - **FS:** Enforces filesystem isolation and mount points (`/workspace`, `/deps`).
    - **NET:** Enforces network disable (`--network=none`).
    - **PROC:** Enforces resource limits (CPU, memory, timeout).
    - *Ref: `@spec/tasks.md §2`*
- **Definition of Done:**
  - A script can directly invoke the `LocalContainerRunner` to execute code.
  - All policies (FS, NET, PROC) are demonstrably enforced at the container level.
  - Passes local tests for resource limits and FS/NET isolation without agent involvement.
- **Status 2025-11-08:** Local Docker runner + base image + policy→CLI translator landed (`src/sandbox/runner/*`, `docker/sandbox.Dockerfile`). Need FS deny-glob enforcement + live Docker verification to finish the milestone.

---

### Milestone 2: Agent SDK Integration

- **Goal:** Wire the M1 sandbox into the Claude Agent SDK, making it the primary and default executor for agent-generated code.
- **Key Deliverables:**
  - **2.1. Sandboxed Tool:**
    - A new `sandboxed_code.run` tool that uses the `SandboxRunner`.
    - Replaces the insecure default `bash.run` tool.
    - *Ref: `@spec/tasks.md §3.1`*
  - **2.2. SDK Hook Configuration:**
    - The Agent SDK is configured via `onToolRequest` to permit only `sandboxed_code.run` and other approved tools.
    - Provides a central gate for all tool execution.
    - *Ref: `@spec/tasks.md §3.2`*
  - **2.3. Per-Query Policy Overrides:**
    - The `sdk.query()` function is extended to accept a `sandboxPolicy` object.
    - Enables dynamic, task-specific permission adjustments (e.g., enabling network for a specific query).
    - *Ref: `@spec/tasks.md §3.3`*
- **Definition of Done:**
  - The agent can successfully execute a "hello world" script via the sandbox.
  - The "Happy Path" walkthrough passes. (`@spec/walkthroughs.md §1`)
  - A query with a policy override behaves differently than one without.

---

### Milestone 3: Production Readiness & Security Hardening

- **Goal:** Implement the critical security controls, observability, and documentation required for safe, auditable, and maintainable operation.
- **Key Deliverables:**
  - **3.1. Network Egress Proxy:**
    - A proxy that enforces the `net.allowlist` policy for sandboxed processes.
    - All outbound traffic is routed through the proxy when `net.enabled: true`.
    - Blocks access to sensitive domains (e.g., Anthropic's own APIs) to prevent exfiltration.
    - *Ref: `@spec/tasks.md §4.1`*
  - **3.2. Comprehensive Security Test Suite:**
    - Automated tests that codify the security requirements.
    - Proves FS escape, dotfile access, network isolation, secrets leakage, and resource abuse are all prevented.
    - *Ref: `@spec/tasks.md §4.3`, `@spec/cheatsheet.md §73`*
  - **3.3. Observability & Documentation:**
    - Structured logs for every sandbox execution, including policy, outcome, and resource usage.
    - `SANDBOX.md` and `SECURITY.md` for developer handoff and threat model documentation.
    - *Ref: `@spec/tasks.md §5`*
- **Definition of Done:**
  - All security-related walkthroughs pass. (`@spec/walkthroughs.md §2-6`)
  - Logs provide a clear audit trail for every sandboxed action.
  - A new engineer can understand the security model and how to use the sandbox by reading the documentation.
