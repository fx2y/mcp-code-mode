import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { loadSandboxPolicy, mergeSandboxPolicy } from "../sandbox/policy/loader.js";
import { SandboxPolicySchema } from "../sandbox/policy/schema.js";
import { LocalContainerRunner } from "../sandbox/runner/local-container-runner.js";
import type {
  SandboxPolicy,
  SandboxPolicyOverrides,
  SandboxResult,
  SandboxRunner,
} from "../sandbox/types.js";

const SANDBOX_POLICY_OVERRIDE_SCHEMA = SandboxPolicySchema.deepPartial();
const SANDBOXED_CODE_INPUT_SCHEMA = z.object({
  code: z.string().min(1, "code must not be empty"),
  policyOverrides: SANDBOX_POLICY_OVERRIDE_SCHEMA.optional(),
});

export const SANDBOXED_CODE_TOOL_NAME = "sandboxed_code.run";
export const DEFAULT_SANDBOX_SERVER_NAME = "sandbox";
const DEFAULT_TEXT_SUMMARY_LIMIT = 2_000;

export type SandboxedCodeInput = z.infer<typeof SANDBOXED_CODE_INPUT_SCHEMA>;

type SandboxedCodePolicyOverrides = z.infer<typeof SANDBOX_POLICY_OVERRIDE_SCHEMA>;

export interface CreateSandboxedCodeToolOptions {
  runner?: SandboxRunner;
  policyFile?: string;
  policyCwd?: string;
  defaultPolicyOverrides?: SandboxPolicyOverrides;
  maxTextOutputChars?: number;
}

export interface CreateSandboxedCodeServerOptions extends CreateSandboxedCodeToolOptions {
  serverName?: string;
  serverVersion?: string;
}

export function createSandboxedCodeToolDefinition(options: CreateSandboxedCodeToolOptions = {}) {
  const runner = options.runner ?? new LocalContainerRunner();
  const policyFile = options.policyFile ?? "sandbox.policy.yaml";
  const policyCwd = options.policyCwd ?? process.cwd();
  const defaultPolicyOverrides = options.defaultPolicyOverrides;
  const maxTextOutputChars = options.maxTextOutputChars ?? DEFAULT_TEXT_SUMMARY_LIMIT;

  return tool(
    SANDBOXED_CODE_TOOL_NAME,
    "Execute POSIX shell snippets inside the hardened sandbox container.",
    SANDBOXED_CODE_INPUT_SCHEMA.shape,
    async (rawInput) => {
      const input = SANDBOXED_CODE_INPUT_SCHEMA.parse(rawInput);
      const basePolicy = await loadSandboxPolicy({ cwd: policyCwd, file: policyFile });
      const withDefaultOverrides = applyOverrides(basePolicy, defaultPolicyOverrides);
      const effectivePolicy = applyOverrides(withDefaultOverrides, input.policyOverrides);

      try {
        const execResult = await runner.exec(ensureTrailingNewline(input.code), effectivePolicy);
        return formatSuccessResult(execResult, maxTextOutputChars);
      } catch (error) {
        return formatErrorResult(error);
      }
    },
  );
}

export function createSandboxedCodeServer(options: CreateSandboxedCodeServerOptions = {}) {
  const toolDefinition = createSandboxedCodeToolDefinition(options);
  return createSdkMcpServer({
    name: options.serverName ?? DEFAULT_SANDBOX_SERVER_NAME,
    version: options.serverVersion ?? "1.0.0",
    tools: [toolDefinition],
  });
}

function ensureTrailingNewline(code: string): string {
  return code.endsWith("\n") ? code : `${code}\n`;
}

function applyOverrides(
  basePolicy: SandboxPolicy,
  overrides?: SandboxPolicyOverrides | SandboxedCodePolicyOverrides,
): SandboxPolicy {
  return overrides ? mergeSandboxPolicy(basePolicy, overrides as SandboxPolicyOverrides) : basePolicy;
}

function formatSuccessResult(result: SandboxResult, textLimit: number) {
  return {
    content: [
      {
        type: "text" as const,
        text: summarizeOutput(result, textLimit),
      },
    ],
    structuredContent: {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      effectivePolicy: result.effectivePolicy,
      resourceUsage: result.resourceUsage,
      outputTruncated: result.outputTruncated ?? false,
    },
  };
}

function formatErrorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text" as const,
        text: `Sandbox execution failed: ${message}`,
      },
    ],
    isError: true,
    structuredContent: {
      error: serializeError(error),
    },
  };
}

function summarizeOutput(result: SandboxResult, textLimit: number): string {
  const lines = [
    `exitCode: ${result.exitCode ?? "null"}`,
    `wallTimeMs: ${result.resourceUsage.wallTimeMs}`,
  ];
  if (result.outputTruncated) {
    lines.push("stdout/stderr truncated by sandbox to stay within limits");
  }

  const halfLimit = Math.max(0, Math.floor(textLimit / 2));
  const stdoutSummary = truncate(result.stdout, halfLimit);
  if (stdoutSummary) {
    lines.push(`stdout:\n${stdoutSummary}`);
  }

  const stderrSummary = truncate(result.stderr, halfLimit);
  if (stderrSummary) {
    lines.push(`stderr:\n${stderrSummary}`);
  }

  return lines.join("\n\n");
}

function truncate(value: string, limit: number): string {
  if (!value || limit <= 0 || value.length <= limit) {
    return value ?? "";
  }
  if (limit <= 4) {
    return `${value.slice(0, limit)}...`;
  }
  const head = Math.ceil((limit - 3) / 2);
  const tail = limit - 3 - head;
  return `${value.slice(0, head)}...${value.slice(value.length - tail)}`;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}
