import assert from "node:assert/strict";
import { test } from "node:test";

import { createSandboxedCodeToolDefinition } from "../src/tools/sandboxed-code.js";
import type { SandboxPolicy, SandboxResult, SandboxRunner } from "../src/sandbox/types.js";

class StubRunner implements SandboxRunner {
  lastCode?: string;
  lastPolicy?: SandboxPolicy;

  constructor(private readonly response?: Partial<SandboxResult>) {}

  async exec(code: string, policy: SandboxPolicy): Promise<SandboxResult> {
    this.lastCode = code;
    this.lastPolicy = policy;
    return {
      stdout: this.response?.stdout ?? "stub-stdout",
      stderr: this.response?.stderr ?? "",
      exitCode: this.response?.exitCode ?? 0,
      effectivePolicy: policy,
      resourceUsage: this.response?.resourceUsage ?? { wallTimeMs: 5 },
      outputTruncated: this.response?.outputTruncated ?? false,
    };
  }
}

class ErrorRunner implements SandboxRunner {
  async exec(): Promise<SandboxResult> {
    throw new Error("runner exploded");
  }
}

test("sandboxed_code tool passes code + merged policy to runner", async () => {
  const runner = new StubRunner();
  const toolDef = createSandboxedCodeToolDefinition({
    runner,
    defaultPolicyOverrides: {
      proc: { timeoutMs: 1234 },
      metadata: { caller: "test" },
    },
    maxTextOutputChars: 200,
  });

  const result = await toolDef.handler(
    {
      code: "printf 'ok'",
      policyOverrides: {
        proc: { cpuQuota: 2 },
      },
    },
    {},
  );

  const firstBlock = result.content[0];
  assert.equal(firstBlock?.type, "text");
  assert.ok(firstBlock?.text?.includes("exitCode"));
  const structured = result.structuredContent as { stdout?: string } | undefined;
  assert.equal(structured?.stdout, "stub-stdout");
  assert.equal(runner.lastCode, "printf 'ok'\n");
  assert.ok(runner.lastPolicy);
  assert.equal(runner.lastPolicy?.proc.timeoutMs, 1234);
  assert.equal(runner.lastPolicy?.proc.cpuQuota, 2);
  assert.equal(runner.lastPolicy?.metadata?.caller, "test");
});

test("sandboxed_code tool surfaces runner failures as tool errors", async () => {
  const toolDef = createSandboxedCodeToolDefinition({ runner: new ErrorRunner() });
  const result = await toolDef.handler({ code: "exit 1" }, {});
  const firstBlock = result.content[0];
  assert.equal(result.isError, true);
  assert.equal(firstBlock?.type, "text");
  assert.ok(firstBlock?.text?.includes("failed"));
  const structured = result.structuredContent as { error?: { message?: string } } | undefined;
  assert.match(String(structured?.error?.message ?? ""), /runner exploded/);
});
