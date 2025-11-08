import {
  query as sdkQuery,
  type CanUseTool,
  type Options,
} from "@anthropic-ai/claude-agent-sdk";

import {
  createSandboxedCodeServer,
  DEFAULT_SANDBOX_SERVER_NAME,
  SANDBOXED_CODE_TOOL_NAME,
  type CreateSandboxedCodeServerOptions,
} from "./tools/sandboxed-code.js";
import type { SandboxPolicyOverrides, SandboxRunner } from "./sandbox/types.js";

export interface SandboxedQueryOptions extends Options {
  sandboxPolicy?: SandboxPolicyOverrides;
  sandboxRunner?: SandboxRunner;
  sandboxPolicyFile?: string;
  sandboxPolicyCwd?: string;
  sandboxServerName?: string;
}

interface SandboxedQueryParams {
  prompt: Parameters<typeof sdkQuery>[0]["prompt"];
  options?: SandboxedQueryOptions;
}

export function sandboxQuery({ prompt, options }: SandboxedQueryParams) {
  const baseOptions: SandboxedQueryOptions = options ?? {};
  const {
    sandboxPolicy,
    sandboxRunner,
    sandboxPolicyFile,
    sandboxPolicyCwd,
    sandboxServerName = DEFAULT_SANDBOX_SERVER_NAME,
    ...rest
  } = baseOptions;

  const sdkOptions = rest as Options;
  const serverOptions: CreateSandboxedCodeServerOptions = {
    serverName: sandboxServerName,
  };
  if (sandboxPolicy) {
    serverOptions.defaultPolicyOverrides = sandboxPolicy;
  }
  if (sandboxRunner) {
    serverOptions.runner = sandboxRunner;
  }
  if (sandboxPolicyFile) {
    serverOptions.policyFile = sandboxPolicyFile;
  }
  if (sandboxPolicyCwd) {
    serverOptions.policyCwd = sandboxPolicyCwd;
  }

  const sandboxServer = createSandboxedCodeServer(serverOptions);

  const allowedTools = new Set<string>(sdkOptions.allowedTools ?? []);
  allowedTools.add(SANDBOXED_CODE_TOOL_NAME);

  const mergedServers = {
    ...(sdkOptions.mcpServers ?? {}),
    [sandboxServerName]: sandboxServer,
  };

  const finalOptions: Options = {
    ...sdkOptions,
    allowedTools: Array.from(allowedTools),
    mcpServers: mergedServers,
  };

  if (!sdkOptions.canUseTool) {
    finalOptions.canUseTool = buildDefaultCanUseTool();
  }

  return sdkQuery({
    prompt,
    options: finalOptions,
  });
}

function buildDefaultCanUseTool(): CanUseTool {
  return async (toolName, input) => {
    if (toolName === SANDBOXED_CODE_TOOL_NAME) {
      return {
        behavior: "allow" as const,
        updatedInput: input,
      };
    }
    return {
      behavior: "deny" as const,
      message: `Tool ${toolName} is disabled; only ${SANDBOXED_CODE_TOOL_NAME} is permitted.`,
    };
  };
}
