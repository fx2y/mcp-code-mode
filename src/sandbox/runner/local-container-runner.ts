import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { PassThrough, type Readable } from "node:stream";

import type { FilesystemMount, SandboxPolicy, SandboxResult, SandboxRunner } from "../types.js";
import { buildDockerRunArgs, type ResolvedMount } from "./docker-args.js";

const DEFAULT_IMAGE = "mcp-code-mode-sandbox:latest";
const CONTAINER_SCRIPT_PATH = "/sandbox/snippet.sh";

export type LocalContainerRunnerLogEvent = {
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  meta?: Record<string, unknown>;
};

export type LocalContainerRunnerLogger = (event: LocalContainerRunnerLogEvent) => void;

export interface LocalContainerRunnerOptions {
  image?: string;
  runtimeBinary?: string;
  workspaceRoot?: string;
  tempDir?: string;
  maxOutputBytes?: number;
  logger?: LocalContainerRunnerLogger;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  outputTruncated: boolean;
}

export class LocalContainerRunner implements SandboxRunner {
  private readonly image: string;
  private readonly runtimeBinary: string;
  private readonly workspaceRoot: string;
  private readonly tempDir: string;
  private readonly maxOutputBytes: number;
  private readonly logger: LocalContainerRunnerLogger | undefined;

  constructor(options: LocalContainerRunnerOptions = {}) {
    this.image = options.image ?? process.env.SANDBOX_IMAGE ?? DEFAULT_IMAGE;
    this.runtimeBinary = options.runtimeBinary ?? process.env.SANDBOX_RUNTIME ?? "docker";
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
    this.tempDir = options.tempDir ?? os.tmpdir();
    this.maxOutputBytes = options.maxOutputBytes ?? 512 * 1024;
    this.logger = options.logger;
  }

  async exec(code: string, policy: SandboxPolicy): Promise<SandboxResult> {
    const runId = randomUUID();
    const tempDir = await mkdtemp(path.join(this.tempDir, "sandbox-"));
    try {
      const scriptPath = path.join(tempDir, "snippet.sh");
      await writeFile(scriptPath, code, { mode: 0o700 });

      const resolvedMounts = await this.resolveMounts(policy.fs.mounts);
      resolvedMounts.push({
        type: "bind",
        resolvedSource: scriptPath,
        target: CONTAINER_SCRIPT_PATH,
        writable: false,
      });

      const dockerArgs = buildDockerRunArgs({
        image: this.image,
        policy,
        mounts: resolvedMounts,
        command: ["/bin/sh", CONTAINER_SCRIPT_PATH],
      });

      const start = performance.now();
      this.log("debug", "starting sandbox run", { runId, args: dockerArgs });

      let timedOut = false;
      const execResult = await this.spawnDocker(dockerArgs, policy, () => {
        timedOut = true;
      });
      const durationMs = performance.now() - start;
      this.log("info", "sandbox run finished", {
        runId,
        exitCode: execResult.exitCode,
        durationMs: Math.round(durationMs),
        timedOut,
      });

      return {
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        exitCode: execResult.exitCode,
        effectivePolicy: policy,
        resourceUsage: {
          wallTimeMs: Math.round(durationMs),
        },
        outputTruncated: execResult.outputTruncated,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private async spawnDocker(
    args: string[],
    policy: SandboxPolicy,
    onTimeout: () => void,
  ): Promise<ExecResult> {
    const child = spawn(this.runtimeBinary, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutStream = child.stdout ?? new PassThrough();
    const stderrStream = child.stderr ?? new PassThrough();
    const stdoutPromise = collectStream(stdoutStream, this.maxOutputBytes);
    const stderrPromise = collectStream(stderrStream, this.maxOutputBytes);

    let timeoutHandle: NodeJS.Timeout | undefined;
    let timedOut = false;
    if (typeof policy.proc.timeoutMs === "number") {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        onTimeout();
        child.kill("SIGKILL");
      }, policy.proc.timeoutMs);
    }

    const exitPromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
      (resolve, reject) => {
        child.once("error", (error) => reject(error));
        child.once("close", (code, signal) => resolve({ code, signal }));
      },
    );

    try {
      const [{ data: stdout, truncated: stdoutTruncated }, { data: stderr, truncated: stderrTruncated }, exit] =
        await Promise.all([stdoutPromise, stderrPromise, exitPromise]);
      const outputTruncated = stdoutTruncated || stderrTruncated;
      const exitCode = exit.code ?? (timedOut ? null : exit.code);
      return { stdout, stderr, exitCode, outputTruncated };
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async resolveMounts(mounts: FilesystemMount[]): Promise<ResolvedMount[]> {
    const resolved: ResolvedMount[] = [];
    for (const mount of mounts) {
      if (mount.type === "tmpfs" || !mount.source) {
        resolved.push({
          ...mount,
        });
        continue;
      }
      const resolvedSource = path.isAbsolute(mount.source)
        ? mount.source
        : path.resolve(this.workspaceRoot, mount.source);
      await this.ensureDirectory(resolvedSource);
      resolved.push({
        ...mount,
        resolvedSource,
      });
    }
    return resolved;
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // ignore EEXIST for files/dirs that already exist
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }

  private log(level: LocalContainerRunnerLogEvent["level"], msg: string, meta?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }
    const payload: LocalContainerRunnerLogEvent = { level, msg };
    if (meta) {
      payload.meta = meta;
    }
    this.logger(payload);
  }
}

async function collectStream(stream: Readable, limit: number): Promise<{ data: string; truncated: boolean }> {
  const chunks: Buffer[] = [];
  let total = 0;
  let truncated = false;

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buf);
    total += buf.length;
    if (total > limit) {
      truncated = true;
      while (chunks.length > 1 && total - chunks[0]!.length >= limit) {
        const removed = chunks.shift();
        if (removed) {
          total -= removed.length;
        }
      }
      if (chunks.length === 1 && total > limit) {
        const only = chunks[0]!;
        const start = only.length - limit;
        chunks[0] = only.subarray(start);
        total = limit;
      }
    }
  }

  return { data: Buffer.concat(chunks, total).toString("utf8"), truncated };
}
