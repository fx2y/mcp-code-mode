# 2) Code sandbox integration — cheat sheet (1–2d)

## Goal

* Safe, repeatable code-exec for Claude Agent SDK agents; strict FS+NET isolation; least-privilege by default; auditable. ([Claude Docs][1])

## Decisions (fast)

* **Where run?** Prefer provider sandbox (Claude Code Execution Tool) for simplicity; self-hosted container/VM for tighter controls/compliance. ([Anthropic][2])
* **NET policy:** `deny-all` → allowlist per-domain via proxy; disable by default. ([Claude Docs][3])
* **FS policy:** ephemeral workspace; explicit RO/WR mounts; hide dotfiles (`.env`, SSH keys). ([Claude Docs][3])
* **SDK fit:** Use Agent SDK hooks to gate tools, attach sandbox runner, persist state outside sandbox. ([Claude Docs][1])

## Threat model (tl;dr)

* **Risks:** indirect prompt injection → exfil via allowed domains/APIs; DNS/leaky channels; over-broad FS/NET; long-lived creds. ([embracethered.com][4])
* **Controls:** NET egress allowlist + proxy signing; RO mounts; no secrets in sandbox; caps (CPU/RAM/time); audit logs + live killswitch. ([Claude Docs][3])

## Architecture

* **Process:** Agent (SDK) ⇄ Sandbox runner (exec, FS, subprocess) ⇄ MCP client libs (outside sandbox) ⇄ MCP servers. Keep tool schemas/results **out of model context**; perform compute in sandbox. ([Anthropic][5]) 
* **Policy layers:** SDK allow/deny hooks → sandbox FS/NET policy → org egress proxy → observability. ([Claude Docs][6])

## Minimal policies (start here)

* **FS:** `/workspace` (RW, wiped per run), `/deps` (RO), `/tmp` (RW, tmpfs). Block `$HOME`, dotfiles, SSH, kube creds. ([Claude Docs][3])
* **NET:** `egress=false` unless task opts in; when on, proxy→allowlist: MCP servers, package mirrors (optional), nothing else. No direct calls to cloud vendor APIs unless signed by proxy. ([Claude Docs][3])
* **PROC:** `cpu_quota`, `mem_limit`, `wall_timeout`, `fork_limit=0/1`, `no-root`, `seccomp`/equiv. ([Claude Docs][3])

## SDK integration (TS/Python) — terse steps

1. **Bind sandbox runner** to Agent SDK tool hooks; deny unknown tools by default; attach per-task `allowed_tools`. ([Claude Docs][1])
2. **Keep MCP client out of sandbox;** expose typed wrappers to sandboxed code (code-mode pattern). ([The Cloudflare Blog][7])
3. **State:** persist artifacts outside sandbox; pass paths/handles, not blobs, back to model (log heads only). 

## Secrets & data hygiene

* **No secrets in sandbox env;** use short-lived tokens at MCP client/proxy; mount read-only service accounts only when required. ([Claude Docs][6])
* **Redaction:** tokenize PII before model/logs; only **log/return** minimal slices (e.g., first 5 rows). 
* **Training/retention:** align with org policy; disable collection where required. ([Tom's Guide][8])

## Network egress hardening

* **Proxy-enforced allowlist** (domain→method→path); strip headers; sign requests; rate-limit.
* **Block Anthropic File/API misuse** paths from sandbox to prevent exfil via “allowed” domain; prefer proxy-signed uploads only. ([embracethered.com][4])

## Resource limits (sane defaults)

* `CPU ≤ 1–2 vCPU`, `RAM ≤ 512–2048MB`, `wall ≤ 30–120s`, `FS ≤ 100–500MB`, `no outbound` by default; expose per-skill overrides. ([Claude Docs][3])

## Observability

* **Metrics:** start/stop, exit code, time, bytes read/written, egress count; tokens/time at agent loop. ([Claude Docs][6])
* **Logs:** sampled, redacted; bind to task/run IDs; ship to SIEM. 

## Local vs prod

* **Local:** containerized sandbox (Docker/Podman); CI smoke tests.
* **Prod:** managed sandboxes (e.g., Vercel Sandbox, Cloudflare Sandbox SDK) or K8s VM-isolation. ([Vercel][9])

## Tests (must pass)

* **FS escape:** read `$HOME/.ssh` ⇒ **deny**. ([Claude Docs][3])
* **Dotfile probe:** read `.env` ⇒ **deny**. ([Claude Docs][3])
* **NET off:** `curl example.com` ⇒ **deny**. ([Claude Docs][3])
* **NET on (allowlisted):** GET MCP server ⇒ **ok**; POST non-allowlisted ⇒ **deny**. ([Anthropic][10])
* **Exfil sim:** attempt upload to Anthropic Files from sandbox ⇒ **blocked by proxy**. ([embracethered.com][4])
* **Resource cap:** infinite loop ⇒ **killed by timeout/quota**. ([Claude Docs][3])

## Runbook (ops)

* **Rotate** tokens daily; **rebuild** base image weekly; **scan** deps; **patch** CVEs quickly.
* **Quarantine** suspicious runs; export artifact bundle; attach logs + policy snapshot. ([Claude Docs][6])

## Docs/UX for devs (minimum)

* `SANDBOX.md`: FS/NET rules, allowed domains, how to request exceptions. ([Claude Docs][3])
* `SECURITY.md`: exfil risks + procedures; link to incident flow. ([embracethered.com][11])
* `config.example`: per-skill policy overrides (timeouts, mounts, egress).

## Why this matches 80/20

* Massive context + latency savings by moving tool calls/data handling into sandboxed code (code-mode); fewer tokens/logs; simpler mental model. ([Anthropic][5])
* Security posture grounded in OS-level isolation + explicit egress; mitigates current real-world exfil chains. ([Claude Docs][3])

---

### Appendix — tiny reference snippets

**Policy idea (YAML):**

```yaml
fs:
  mounts:
    - path: /workspace  # RW, ephemeral
      rw: true
    - path: /deps       # RO libs
      rw: false
  deny_globs: ['**/.env','**/.ssh/**','**/id_*','/home/**']
net:
  enabled: false
  allowlist: [] # via egress proxy only
proc:
  uid: 1000
  cpu_quota: 1
  mem_mb: 1024
  timeout_ms: 60000
logging:
  sample_ratio: 0.1
  redact_pii: true
```

**Agent SDK hooks (concept):**

```ts
sdk.configure({
  allowedTools: ['fs.read','bash.run'], // minimal
  sandbox: runner({policy}),
  onToolRequest(t){ return allowlist.has(t.name) }
})
```

(Use Agent SDK hosting/overview for exact APIs.) ([Claude Docs][1])

---

### Sources

* Claude Code sandboxing (FS/NET isolation; allow/deny). ([Claude Docs][3])
* Agent SDK overview & hosting. ([Claude Docs][1])
* Code execution with MCP (benefits; security/ops caveats). ([Anthropic][5]) 
* Code-mode pattern (sandboxed agent writes code that calls MCP). ([The Cloudflare Blog][7]) 
* Privacy patterns (tokenize; log slices only). 
* Recent exfiltration research (tighten egress). ([embracethered.com][11])

[1]: https://docs.claude.com/en/api/agent-sdk/overview "Agent SDK overview"
[2]: https://www.anthropic.com/learn/build-with-claude "Anthropic Academy: Claude API Development Guide"
[3]: https://docs.claude.com/en/docs/claude-code/sandboxing "Sandboxing"
[4]: https://embracethered.com/blog/posts/2025/claude-abusing-network-access-and-anthropic-api-for-data-exfiltration/ "Claude Pirate: Abusing Anthropic's File API For Data ..."
[5]: https://www.anthropic.com/engineering/code-execution-with-mcp "Code execution with MCP: Building more efficient agents"
[6]: https://docs.claude.com/en/api/agent-sdk/hosting "Hosting the Agent SDK"
[7]: https://blog.cloudflare.com/code-mode/ "Code Mode: the better way to use MCP"
[8]: https://www.tomsguide.com/ai/claude/claude-ai-will-start-training-on-your-data-soon-heres-how-to-opt-out-before-the-deadline "Claude AI will start training on your data soon - here's how to opt out before the deadline"
[9]: https://vercel.com/guides/using-vercel-sandbox-claude-agent-sdk "Using Vercel Sandbox to run Claude's Agent SDK"
[10]: https://www.anthropic.com/engineering/claude-code-sandboxing "Making Claude Code more secure and autonomous with ..."
[11]: https://embracethered.com/blog/posts/2025/claude-code-exfiltration-via-dns-requests/ "Claude Code: Data Exfiltration with DNS (CVE-2025-55284)"
