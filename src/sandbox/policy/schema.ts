import { z } from "zod";

/**
 * Runtime schema for sandbox policies; mirrors the static interfaces defined in
 * `src/sandbox/types.ts` so configs can be validated on load.
 */
export const FilesystemMountSchema = z.object({
  source: z.string().min(1).optional(),
  target: z.string().min(1),
  writable: z.boolean(),
  type: z.string().min(1).optional(),
});

export const FilesystemPolicySchema = z.object({
  mounts: z.array(FilesystemMountSchema).min(1, "At least one mount must be defined"),
  denyGlobs: z.array(z.string().min(1)).default([]),
  maxTotalMb: z.number().positive().optional(),
});

const httpMethodEnum = z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]);
const protocolEnum = z.enum(["http", "https"]);

export const NetworkAllowlistRuleSchema = z.object({
  host: z.string().min(1, "Host cannot be empty"),
  ports: z.array(z.number().int().positive()).optional(),
  methods: z.array(httpMethodEnum).optional(),
  protocols: z.array(protocolEnum).optional(),
});

export const NetworkPolicySchema = z.object({
  enabled: z.boolean(),
  allowlist: z.array(NetworkAllowlistRuleSchema).default([]),
  proxy: z
    .object({
      url: z.string().url(),
      required: z.boolean().default(true),
    })
    .optional(),
});

export const ProcessPolicySchema = z.object({
  cpuQuota: z.number().positive().optional(),
  memoryMb: z.number().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  uid: z.number().int().nonnegative().optional(),
  gid: z.number().int().nonnegative().optional(),
  maxChildProcesses: z.number().int().nonnegative().optional(),
  env: z.record(z.string()).optional(),
  workdir: z.string().min(1).optional(),
});

const metadataValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const SandboxPolicySchema = z.object({
  fs: FilesystemPolicySchema,
  net: NetworkPolicySchema,
  proc: ProcessPolicySchema,
  metadata: z.record(metadataValueSchema).optional(),
});

export type FilesystemMountInput = z.infer<typeof FilesystemMountSchema>;
export type FilesystemPolicyInput = z.infer<typeof FilesystemPolicySchema>;
export type NetworkAllowlistRuleInput = z.infer<typeof NetworkAllowlistRuleSchema>;
export type NetworkPolicyInput = z.infer<typeof NetworkPolicySchema>;
export type ProcessPolicyInput = z.infer<typeof ProcessPolicySchema>;
export type SandboxPolicyInput = z.infer<typeof SandboxPolicySchema>;
