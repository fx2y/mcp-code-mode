# Code Sandbox Integration - Prime Context

## Project State Analysis

### Current Codebase Structure
- **Entry point**: `src/hello.ts:1-20` - Basic Claude Agent SDK query with locked down `allowedTools: []`
- **Package**: `package.json:28-29` - Uses `@anthropic-ai/claude-agent-sdk:0.1.30`
- **Config**: TypeScript ESM with `tsconfig.json:10-11` targeting `es2022`
- **Security**: Starts with empty tool allowlist for security-by-default

### SDK Capabilities (Available)
**Core interfaces** (`node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`):
- `query()` function (line 511) - Main agent execution
- `tool()` function (line 420) - MCP tool creation
- `createSdkMcpServer()` function (line 432) - In-process MCP servers

**Tool system** (`node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts`):
- `BashInput` (line 54) - Command execution with `dangerouslyDisableSandbox` (line 85)
- File operations: `FileEditInput`, `FileReadInput`, `FileWriteInput`
- Search: `GlobInput`, `GrepInput`
- Web: `WebFetchInput`, `WebSearchInput`

**Security framework**:
- `CanUseTool` callback (line 120) - Tool permission control
- `PermissionMode` (line 225) - 'default', 'acceptEdits', 'bypassPermissions', 'plan'
- `HookEvent` types (line 138) - 'PreToolUse', 'PostToolUse' interception
- Hook system for security monitoring

## Sandbox Integration Requirements

### Goal (Spec §2)
Safe, scalable code execution with:
- Strict FS/NET isolation
- Least-privilege by default
- Auditable security posture
- 80% context/latency reduction via code-mode pattern

### Architecture Pattern (Cheatsheet §21)
```
Agent (SDK) ⇄ Sandbox runner (exec, FS, subprocess) ⇄ MCP client libs ⇄ MCP servers
```

### Core Security Policies (Cheatsheet §26-28)
**Filesystem**:
- `/workspace` (RW, ephemeral)
- `/deps` (RO)
- `/tmp` (RW, tmpfs)
- Block: `$HOME`, dotfiles, SSH, kube creds

**Network**:
- `egress=false` by default
- Allowlist proxy for MCP servers only
- Block direct cloud vendor API calls

**Process**:
- `cpu_quota`, `mem_limit`, `wall_timeout`
- `fork_limit=0/1`, `no-root`
- Resource caps enforced

## Implementation Gaps

### Missing Sandbox Infrastructure
1. **No container/VM isolation** - SDK only has basic `dangerouslyDisableSandbox` flag
2. **No resource limits** - No CPU/memory/time enforcement
3. **No network isolation** - No egress controls or allowlist proxy
4. **No filesystem sandboxing** - Only directory restrictions, not true isolation
5. **No runtime isolation** - No separate JavaScript/Python runtimes

### Required Components
1. **Sandbox runner interface** - Abstract execution environment
2. **Policy engine** - FS/NET/PROC rule enforcement
3. **Resource monitor** - CPU/memory/time tracking
4. **Security proxy** - Network egress control
5. **Isolation layers** - Container/VM/process isolation

### 2025-11-08 Progress Snapshot
- `src/sandbox/types.ts` defines `SandboxRunner`, `SandboxPolicy`, `SandboxResult`, bringing Phase 1.1 online.
- `src/sandbox/policy/{schema,defaults,loader}.ts` + `sandbox.policy.yaml` ship the YAML-driven policy loader with deny-all net + minimal mounts.
- Build/test smoke (`npm run build && npm run test`) covers the new types/loader wiring; still need container runner + enforcement layers.
- `docker/sandbox.Dockerfile` + `src/sandbox/runner/{local-container-runner,docker-args}.ts` implement a Docker-backed runner with policy→CLI translation + output trimming; network/fs/proc flag verification + deny-glob enforcement still open.

## Integration Points

### SDK Extension Points
- Extend `BashInput` with sandbox configuration options
- Create sandbox-specific permission modes in `PermissionMode`
- Implement sandbox hooks in `HookCallback` system
- Add resource limit parameters to query options

### Code-Mode Pattern (Cheatsheet §33)
- MCP client stays outside sandbox
- Generate typed TS wrappers for MCP tools
- Execute data processing in sandbox
- Pass minimal context back to model

### Security Integration
- Leverage existing `CanUseTool` for sandbox tool approval
- Use `HookEvent` system for security monitoring
- Extend permission system for sandbox-specific controls

## Next Implementation Steps

### Phase 1: Core Sandbox Interface
Define abstract sandbox runner with:
- Resource limit configuration
- FS mount policies
- Network egress rules
- Security policy enforcement

### Phase 2: Policy Engine
Implement security rule processor:
- Parse YAML/JSON security policies
- Enforce FS/NET/PROC restrictions
- Monitor resource usage
- Audit logging

### Phase 3: SDK Integration
Wire sandbox into Agent SDK:
- Extend query options for sandbox configuration
- Implement sandbox tool execution hooks
- Add permission controls for sandbox operations
- Create sandbox-specific error handling

### Phase 4: Security Hardening
Production-ready security:
- Implement allowlist proxy for network egress
- Add resource monitoring and kill switches
- Create security test suite
- Document security model and procedures
