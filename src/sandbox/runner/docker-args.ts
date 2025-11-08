import type { FilesystemMount, SandboxPolicy } from "../types.js";

export interface ResolvedMount extends FilesystemMount {
  /**
   * Absolute host path for bind mounts. Optional for mount types that do not
   * require a source (e.g., tmpfs).
   */
  resolvedSource?: string;
}

export interface BuildDockerRunArgsParams {
  image: string;
  policy: SandboxPolicy;
  mounts: ResolvedMount[];
  /**
   * Final command executed inside the container. Defaults to `/bin/sh`.
   */
  command?: string[];
}

/**
 * Translate a `SandboxPolicy` into `docker run` arguments. Keeps this logic
 * isolated so it can be unit tested without invoking Docker.
 */
export function buildDockerRunArgs(params: BuildDockerRunArgsParams): string[] {
  const { image, policy, mounts, command } = params;
  const args: string[] = ["run", "--rm"];

  if (policy.net.enabled) {
    args.push("--network", "bridge");
  } else {
    args.push("--network", "none");
  }

  if (typeof policy.proc.cpuQuota === "number") {
    args.push("--cpus", policy.proc.cpuQuota.toString());
  }
  if (typeof policy.proc.memoryMb === "number") {
    args.push("--memory", `${policy.proc.memoryMb}m`);
  }
  if (typeof policy.proc.maxChildProcesses === "number") {
    const limit = Math.max(1, policy.proc.maxChildProcesses + 1);
    args.push("--pids-limit", `${limit}`);
  }
  if (typeof policy.proc.uid === "number" || typeof policy.proc.gid === "number") {
    const uid = typeof policy.proc.uid === "number" ? policy.proc.uid : 0;
    const gid = typeof policy.proc.gid === "number" ? policy.proc.gid : uid;
    args.push("--user", `${uid}:${gid}`);
  }
  if (policy.proc.workdir) {
    args.push("--workdir", policy.proc.workdir);
  }
  if (policy.proc.env) {
    for (const [key, value] of Object.entries(policy.proc.env)) {
      args.push("--env", `${key}=${value}`);
    }
  }

  for (const mount of mounts) {
    args.push("--mount", toDockerMountFlag(mount));
  }

  args.push(image);

  if (command && command.length > 0) {
    args.push(...command);
  }

  return args;
}

function toDockerMountFlag(mount: ResolvedMount): string {
  const type = mount.type ?? "bind";
  const parts = [`type=${type}`, `target=${mount.target}`];
  if (type !== "tmpfs") {
    if (!mount.resolvedSource) {
      throw new Error(`Mount for target ${mount.target} is missing a resolved source path`);
    }
    parts.push(`source=${mount.resolvedSource}`);
  }
  if (!mount.writable) {
    parts.push("readonly");
  }
  return parts.join(",");
}
