/**
 * Sandbox contract + policy definitions, derived from @spec/tasks.md §1.1-2.1
 * and @spec/cheatsheet.md guidance. These types intentionally stay small and
 * serializable so they can be logged or shipped across process boundaries.
 */

/**
 * Filesystem mount descriptor describing a single path exposed to the sandbox.
 * `source` is optional because some mounts (tmpfs, overlays) are created by the
 * sandbox runtime itself.
 */
export interface FilesystemMount {
  /** Host path or named volume that will be mounted. */
  source?: string;
  /** Destination path inside the sandbox (e.g., /workspace). */
  target: string;
  /** Whether the mount is writable. */
  writable: boolean;
  /**
   * Mount type hint. Defaults to `bind`; other examples include `tmpfs` or
   * provider-specific volume types.
   */
  type?: "bind" | "tmpfs" | string;
}

/** Filesystem policy modeled after @spec/cheatsheet.md §27. */
export interface FilesystemPolicy {
  /** Explicitly allowed mounts (no implicit $HOME exposure). */
  mounts: FilesystemMount[];
  /**
   * Glob patterns that must remain inaccessible, even if reachable via a mount.
   * Runtimes can enforce this via runtime checks or overlay rules.
   */
  denyGlobs?: string[];
  /** Optional max storage (in megabytes) enforced by tmpfs or quotas. */
  maxTotalMb?: number;
}

interface NetworkProxyConfig {
  /** URL for the allowlist-enforcing proxy, if any. */
  url: string;
  /** Whether sandbox traffic must route through the proxy tunnel. */
  required: boolean;
}

export interface NetworkAllowlistRule {
  host: string;
  /** Optional list of ports allowed for this host. */
  ports?: number[];
  /** Restrict HTTP methods; omit → allow all. */
  methods?: ("GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD")[];
  /** Restrict protocols (http/https). */
  protocols?: ("http" | "https")[];
}

/** Network policy defaults to deny-all per @spec/cheatsheet.md. */
export interface NetworkPolicy {
  enabled: boolean;
  allowlist?: NetworkAllowlistRule[];
  proxy?: NetworkProxyConfig;
}

/** Process/resource policy derived from @spec/cheatsheet.md §28, §40. */
export interface ProcessPolicy {
  /** Soft CPU quota (e.g., Docker `--cpus`). */
  cpuQuota?: number;
  /** Memory limit in megabytes. */
  memoryMb?: number;
  /** Wall-clock timeout in milliseconds. */
  timeoutMs?: number;
  /** Optional Linux uid / gid to drop privileges. */
  uid?: number;
  gid?: number;
  /** Maximum number of child processes allowed (fork limit). */
  maxChildProcesses?: number;
  /** Additional environment variables injected into the sandbox. */
  env?: Record<string, string>;
  /** Working directory inside the sandbox runtime. */
  workdir?: string;
}

export interface SandboxPolicy {
  fs: FilesystemPolicy;
  net: NetworkPolicy;
  proc: ProcessPolicy;
  /**
   * Optional arbitrary metadata about the policy (e.g., run IDs, human labels).
   * Stored here so it travels with audit logs without affecting enforcement.
   */
  metadata?: Record<string, string | number | boolean>;
}

/** Policy overrides allow callers to change a subset of the base policy. */
export type SandboxPolicyOverrides = Partial<{
  fs: Partial<FilesystemPolicy>;
  net: Partial<NetworkPolicy>;
  proc: Partial<ProcessPolicy>;
  metadata: Record<string, string | number | boolean>;
}>;

/** Resource counters emitted by the sandbox runtime. */
export interface SandboxResourceUsage {
  wallTimeMs: number;
  cpuTimeMs?: number;
  memoryPeakMb?: number;
  bytesRead?: number;
  bytesWritten?: number;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** Snapshot of limits applied during the run (post-override). */
  effectivePolicy: SandboxPolicy;
  resourceUsage: SandboxResourceUsage;
  /** True when the sandbox truncated stdout/stderr to enforce limits. */
  outputTruncated?: boolean;
}

/**
 * Minimal contract for sandbox executors. Concrete runners (Docker, Podman,
 * remote service, etc.) provide their own constructors/factories and merely
 * implement this interface.
 */
export interface SandboxRunner {
  /**
   * Execute the provided code snippet under the supplied policy.
   * Implementations may persist code to a temp file or pipe it via stdin.
   */
  exec(code: string, policy: SandboxPolicy): Promise<SandboxResult>;
}
