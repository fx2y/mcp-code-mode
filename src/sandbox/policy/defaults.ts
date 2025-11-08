import type { SandboxPolicy } from "../types.js";

/**
 * Baseline, least-privilege policy derived from @spec/cheatsheet.md §27-28.
 * Intended for local development smoke tests; production deployments should
 * override mounts and allowlist entries as needed.
 */
export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  fs: {
    mounts: [
      {
        source: "./workspace",
        target: "/workspace",
        writable: true,
        type: "bind",
      },
      {
        source: "./deps",
        target: "/deps",
        writable: false,
        type: "bind",
      },
      {
        target: "/tmp",
        writable: true,
        type: "tmpfs",
      },
    ],
    denyGlobs: ["**/.env", "**/.ssh/**", "**/id_*", "/home/**"],
    maxTotalMb: 512,
  },
  net: {
    enabled: false,
    allowlist: [],
  },
  proc: {
    cpuQuota: 1,
    memoryMb: 512,
    timeoutMs: 60_000,
    uid: 1000,
    gid: 1000,
    maxChildProcesses: 1,
    env: {},
  },
  metadata: {
    source: "default/local",
  },
};
