import assert from "node:assert/strict";
import { test } from "node:test";

import type { SandboxPolicy } from "../src/sandbox/types.js";
import { buildDockerRunArgs } from "../src/sandbox/runner/docker-args.js";

const basePolicy: SandboxPolicy = {
  fs: {
    mounts: [
      { source: "/host/workspace", target: "/workspace", writable: true, type: "bind" },
    ],
    denyGlobs: [],
  },
  net: {
    enabled: false,
    allowlist: [],
  },
  proc: {
    cpuQuota: 1,
    memoryMb: 256,
    timeoutMs: 1000,
    uid: 1000,
    gid: 1000,
    maxChildProcesses: 1,
    env: {
      NODE_ENV: "test",
    },
  },
};

test("buildDockerRunArgs enforces core policy knobs", () => {
  const args = buildDockerRunArgs({
    image: "sandbox:test",
    policy: basePolicy,
    mounts: [
      {
        ...basePolicy.fs.mounts[0]!,
        resolvedSource: "/host/workspace",
      },
    ],
    command: ["/bin/sh", "/sandbox/snippet.sh"],
  });

  assert.deepEqual(args.slice(0, 10), [
    "run",
    "--rm",
    "--network",
    "none",
    "--cpus",
    "1",
    "--memory",
    "256m",
    "--pids-limit",
    "2",
  ]);

  assert.ok(args.includes("--user"));
  assert.ok(args.includes("sandbox:test"));
  assert.ok(args.includes("--env"));
  assert.ok(args.some((arg) => arg.startsWith("type=bind,target=/workspace")));
});

test("buildDockerRunArgs switches to bridge network when enabled", () => {
  const policy: SandboxPolicy = {
    ...basePolicy,
    net: { enabled: true, allowlist: [] },
    proc: {
      ...basePolicy.proc,
      env: {},
      workdir: "/workspace",
    },
  };

  const args = buildDockerRunArgs({
    image: "sandbox:test",
    policy,
    mounts: [
      {
        ...basePolicy.fs.mounts[0]!,
        resolvedSource: "/host/workspace",
      },
    ],
    command: ["/bin/bash", "/sandbox/run.sh"],
  });

  const networkFlagIndex = args.findIndex((arg) => arg === "--network");
  assert.equal(args[networkFlagIndex + 1], "bridge");
  const workdirIndex = args.findIndex((arg) => arg === "--workdir");
  assert.equal(args[workdirIndex + 1], "/workspace");
  assert.equal(args.at(-2), "/bin/bash");
  assert.equal(args.at(-1), "/sandbox/run.sh");
});
