import { readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type { SandboxPolicy, SandboxPolicyOverrides } from "../types.js";
import { DEFAULT_SANDBOX_POLICY } from "./defaults.js";
import { SandboxPolicySchema } from "./schema.js";
import type { SandboxPolicyInput } from "./schema.js";

export interface LoadSandboxPolicyOptions {
  /**
   * Working directory used to resolve relative policy file paths.
   * Defaults to `process.cwd()`.
   */
  cwd?: string;
  /**
   * Path (relative or absolute) to the YAML file. When omitted we look for
   * `sandbox.policy.yaml` in `cwd`. Missing files fall back to defaults.
   */
  file?: string;
  /** Optional overrides applied after the file/defaults are parsed. */
  overrides?: SandboxPolicyOverrides;
}

/**
 * Parse the YAML policy file bundled in the repo (or supplied path), validate it
 * against the runtime schema, then apply any overrides.
 */
export async function loadSandboxPolicy(
  options: LoadSandboxPolicyOptions = {},
): Promise<SandboxPolicy> {
  const cwd = options.cwd ?? process.cwd();
  const file = options.file ?? "sandbox.policy.yaml";
  const resolvedPath = path.isAbsolute(file) ? file : path.join(cwd, file);

  let parsed: SandboxPolicyInput | null = null;
  try {
    const contents = await readFile(resolvedPath, "utf8");
    parsed = SandboxPolicySchema.parse(YAML.parse(contents));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const basePolicy = parsed ? (parsed as SandboxPolicy) : DEFAULT_SANDBOX_POLICY;
  return mergeSandboxPolicy(basePolicy, options.overrides);
}

/**
 * Deterministic merge that produces a fresh object suitable for logging and
 * audits. Arrays (e.g., mounts/allowlist) are replaced instead of concatenated
 * to avoid partial policy updates that are hard to reason about.
 */
export function mergeSandboxPolicy(
  base: SandboxPolicy,
  overrides?: SandboxPolicyOverrides,
): SandboxPolicy {
  if (!overrides) {
    return clonePolicy(base);
  }
  const result = clonePolicy(base);

  if (overrides.fs) {
    if (overrides.fs.mounts) {
      result.fs.mounts = overrides.fs.mounts.map((mount) => ({ ...mount }));
    }
    if (overrides.fs.denyGlobs) {
      result.fs.denyGlobs = [...overrides.fs.denyGlobs];
    }
    if (typeof overrides.fs.maxTotalMb !== "undefined") {
      result.fs.maxTotalMb = overrides.fs.maxTotalMb;
    }
  }

  if (overrides.net) {
    if (typeof overrides.net.enabled !== "undefined") {
      result.net.enabled = overrides.net.enabled;
    }
    if (overrides.net.allowlist) {
      result.net.allowlist = overrides.net.allowlist.map((rule) => ({ ...rule }));
    }
    if (overrides.net.proxy) {
      result.net.proxy = { ...overrides.net.proxy };
    }
  }

  if (overrides.proc) {
    if (typeof overrides.proc.cpuQuota !== "undefined") {
      result.proc.cpuQuota = overrides.proc.cpuQuota;
    }
    if (typeof overrides.proc.memoryMb !== "undefined") {
      result.proc.memoryMb = overrides.proc.memoryMb;
    }
    if (typeof overrides.proc.timeoutMs !== "undefined") {
      result.proc.timeoutMs = overrides.proc.timeoutMs;
    }
    if (typeof overrides.proc.uid !== "undefined") {
      result.proc.uid = overrides.proc.uid;
    }
    if (typeof overrides.proc.gid !== "undefined") {
      result.proc.gid = overrides.proc.gid;
    }
    if (typeof overrides.proc.maxChildProcesses !== "undefined") {
      result.proc.maxChildProcesses = overrides.proc.maxChildProcesses;
    }
    if (overrides.proc.env) {
      result.proc.env = {
        ...(result.proc.env ?? {}),
        ...overrides.proc.env,
      };
    }
    if (overrides.proc.workdir) {
      result.proc.workdir = overrides.proc.workdir;
    }
  }

  if (overrides.metadata) {
    result.metadata = {
      ...(result.metadata ?? {}),
      ...overrides.metadata,
    };
  }

  return result;
}

function clonePolicy(policy: SandboxPolicy): SandboxPolicy {
  const fsPolicy = {
    ...policy.fs,
    mounts: policy.fs.mounts.map((mount) => ({ ...mount })),
  };
  if (policy.fs.denyGlobs) {
    fsPolicy.denyGlobs = [...policy.fs.denyGlobs];
  }
  const netPolicy = {
    enabled: policy.net.enabled,
  } as SandboxPolicy["net"];
  if (policy.net.allowlist) {
    netPolicy.allowlist = policy.net.allowlist.map((rule) => ({ ...rule }));
  }
  if (policy.net.proxy) {
    netPolicy.proxy = { ...policy.net.proxy };
  }
  const procPolicy = { ...policy.proc };
  if (policy.proc.env) {
    procPolicy.env = { ...policy.proc.env };
  }

  const cloned: SandboxPolicy = {
    fs: fsPolicy,
    net: netPolicy,
    proc: procPolicy,
  };
  if (policy.metadata) {
    cloned.metadata = { ...policy.metadata };
  }
  return cloned;
}
