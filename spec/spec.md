# Goal → ship a small, acquirable agent starter that prefers Claude Agent SDK + MCP “code mode”

* **Deliverable:** `mcp-code-mode-starter` (template repo + CLI + Docker image) that scaffolds an agent using Claude Agent SDK, executes code, wraps MCP tools as typed TS APIs, and ships two demo flows. Leans on progressive tool discovery + Skills for 80/20 impact. ([Anthropic][1])  
* **Why now:** Code-exec with MCP slashes token/latency by loading only needed tools + processing data off-context; Cloudflare and Anthropic outline the pattern and sandboxes. ([Anthropic][2])
* **Scope:** Single-agent, TS/Node runtime, 3 sample MCP servers, Skills, privacy guardrails, perf telemetry, docs, release assets.
* **Out of scope:** Multi-agent orchestration, custom auth backends, heavy UIs.

---

# Architecture (terse)

* **Agent core:** Claude Agent SDK + Claude Code sandbox (exec, FS, subprocess). ([Anthropic][1])
* **MCP:** Client to 2–3 servers (e.g., Filesystem, HTTP, GitHub). Tools exposed as generated TS modules (code mode). ([Model Context Protocol][3])
* **Discovery:** Progressive tool discovery (`list_directory`, `search_tools(detail_level)`), fetch full schemas on demand. 
* **Skills:** Folderized higher-level abilities (scripts + SKILL.md). ([Claude Docs][4])
* **Privacy:** PII tokenization/redaction at client; logs sample/limit. 
* **DX:** CLI + config, minimal HTTP endpoint, Docker, E2E demos, docs.

---

# Composable 1–5 day mini-projects (ship in any order; deps noted)

## 1. Repo & SDK bootstrap (1d)

* **Value:** Running agent in <5 min.
* **Deliver:** Template repo (`create-mcp-agent`), Env: Node 20+, pnpm, Claude Agent SDK wired, `dev` + `test` scripts.
* **Impl:** Init SDK harness, register code executor, FS workspace, `.env` for keys.
* **Done:** `npm create mcp-agent@latest` yields “hello, world” action. **Deps:** none. ([Anthropic][1])

## 2. Code sandbox integration (1–2d)

* **Value:** Safe, scalable exec; fewer context tokens.
* **Deliver:** Sandbox profile (resource limits, net policy), file mounts, secrets isolation.
* **Impl:** Follow Claude Code sandboxing guidance; block outbound by default; allow MCP client egress only.
* **Done:** Run isolated script, prove secrets never enter sandbox (unit test). **Deps:** (1). ([Anthropic][5])

## 3. MCP client + servers “hello” (1d)

* **Value:** Real tools wired fast.
* **Deliver:** Clients to `filesystem`, `http`, `github` (or 3 of your choice).
* **Impl:** Minimal config (`mcp.config.ts`), health check command.
* **Done:** `agent mcp:ls` lists tools; `agent mcp:ping` calls a tool. **Deps:** (1). ([Model Context Protocol][3])

## 4. **Code-mode wrapper generator** (2d)

* **Value:** 80% cost/latency win by calling MCP via code APIs vs direct tool calls.
* **Deliver:** Codegen that turns MCP tool schemas → typed TS functions (per-server folder tree).
* **Impl:** Introspect tools, emit `servers/<name>/<tool>.ts`, barrel exports, JSDoc; lazy-load definitions.
* **Done:** `agent gen:wrappers` creates modules; sample program compiles + runs. **Deps:** (3). ([The Cloudflare Blog][6]) 

## 5. Progressive tool discovery (1d)

* **Value:** Tiny context; scalable catalogs.
* **Deliver:** `search_tools(pattern, detail_level)` + `list_directory()` ops and cache; CLI: `agent tools:find`.
* **Impl:** Return **name** | **name+desc** | **full schema** lazily; LRU cache warm combos.
* **Done:** Demo shows browsing → selective load. **Deps:** (3)(4). 

## 6. Skill system v1 (1d)

* **Value:** Reusable higher-level abilities the agent can load on demand.
* **Deliver:** `/skills/*/SKILL.md` + optional scripts; loader + registry + examples.
* **Impl:** Add “Save Sheet as CSV”, “Summarize PRs” skills; ensure minimal context footprint.
* **Done:** `agent skills:run save-sheet-as-csv <id>`. **Deps:** (4)(5). ([Claude Docs][4]) 

## 7. Privacy & logging guardrails (1–2d)

* **Value:** Safer demos; enterprise-friendly posture.
* **Deliver:** Tokenize PII fields (email/phone/name) before logs/model; sampling logger (cap arrays to N).
* **Impl:** Intercept tool outputs, mask, allow pass-through to next MCP call via lookup.
* **Done:** Tests prove PII never hits model logs. **Deps:** (1)(4). 

## 8. Cost/latency telemetry (1d)

* **Value:** Quantify 80/20 gains.
* **Deliver:** Middlewares recording tokens in/out, wall time, calls per task; budget thresholds + tips.
* **Impl:** Compare direct tool mode vs code mode on same flows.
* **Done:** `agent report:perf` prints deltas. **Deps:** (4). ([The Cloudflare Blog][6])

## 9. Demo A: Sheet→Filter→Summary (1d)

* **Value:** Shows context-efficient data handling.
* **Deliver:** Program: fetch 10k-row sheet via MCP, filter in code, log head(5), write CSV.
* **Impl:** Use wrapper `gdrive.getSheet` (or HTTP), filter rows off-context, store `./workspace/…`.
* **Done:** CLI `agent demo:sheets --status=pending`; tokens ≪ baseline. **Deps:** (4)(6). 

## 10. Demo B: Deploy-watch Slack loop (1d)

* **Value:** Control flow best-practice (loops, waits) in code.
* **Deliver:** Poll Slack channel via MCP until “deployment complete”; notify + exit.
* **Impl:** While-loop with backoff; only small logs to model.
* **Done:** `agent demo:deploy-watch`. **Deps:** (4). 

## 11. Minimal UX: CLI + REST shim (1d)

* **Value:** Easy adoption + embedding.
* **Deliver:** `agent` CLI (help, env, demos); `/run` HTTP endpoint for headless calls.
* **Impl:** Commander/Fastify; JSON in/out; error mapping.
* **Done:** Postman collection + smoke tests. **Deps:** (1)(3).

## 12. Config & secrets (0.5d)

* **Value:** Safe defaults.
* **Deliver:** `.env.example`, secret provider abstraction, per-server config docs.
* **Impl:** No secrets in sandbox; ephemeral tokens where possible.
* **Done:** Lint to block accidental commits. **Deps:** (2). ([TechRadar][7])

## 13. Packaging: Docker + Makefile (0.5d)

* **Value:** “Acquirable” by anyone.
* **Deliver:** Multi-stage Dockerfile; `make run test demo`.
* **Impl:** Image runs entirely with sandbox flag on.
* **Done:** `docker run … demo:sheets` works. **Deps:** (2)(11).

## 14. Docs & examples (1d)

* **Value:** 10-min onboarding.
* **Deliver:** `README`, quickstart, architecture diagram, Skills how-to, perf notes, troubleshooting.
* **Impl:** Cross-link Claude SDK, MCP, Skills, Code Mode references.
* **Done:** “Getting Started” passes dry-run with new dev. **Deps:** (1–11). ([Anthropic][1])

## 15. Release assets (0.5d)

* **Value:** One-click adoption.
* **Deliver:** GitHub template, semver tag v0.1.0, binary builds for mac/linux, example videos/gifs.
* **Impl:** GH Actions (lint + test + build + image push).
* **Done:** Public release notes with perf table. **Deps:** (8)(14).

## 16. Optional: Security hardening pass (1d)

* **Value:** Trust for pilots.
* **Deliver:** Prompt-injection checks, allow-list MCP servers, rate limits, per-tool timeouts.
* **Impl:** Sandbox caps (CPU/mem/fs), outbound host allow-list.
* **Done:** Threat model doc + tests. **Deps:** (2)(3). ([IT Pro][8])

---

# Release checklist (ultra-terse)

* Quickstart runs on fresh machine (CLI + Docker).
* Demos succeed; perf delta recorded (code mode ≪ direct). ([The Cloudflare Blog][6])
* Skills detected and callable. ([Claude Docs][4])
* Logs redacted; secrets isolated. 
* Docs include links to SDK/MCP/Code-mode refs. ([Anthropic][1])

---

# Notes on value props (for buyers/maintainers)

* **Cost/latency:** Load only needed tools; process data off-context. (Empirically validated by Anthropic/Cloudflare.) ([Anthropic][2]) 
* **Safety:** Sandboxed exec + PII tokenization; fewer sensitive tokens touch the model. ([Anthropic][5]) 
* **Scalability:** Progressive discovery scales to 100s–1,000s tools without context bloat. 
* **Extensibility:** Skills system composes new behaviors without forking core. ([Claude Docs][4])
* **Acquirability:** Template/CLI/Docker + thin REST.

---

# References (curated)

* Claude Agent SDK + best practices. ([Anthropic][1])
* MCP overview & architecture. ([Model Context Protocol][9])
* Code Mode pattern & results. ([The Cloudflare Blog][6])
* Code execution with MCP (context-efficient patterns, skills, privacy). ([Anthropic][2]) 
* Progressive tool discovery pattern. 
* Skills announcements/overview. ([Anthropic][10])

- [The Verge](https://www.theverge.com/ai-artificial-intelligence/800868/anthropic-claude-skills-ai-agents)
- [TechRadar](https://www.techradar.com/pro/mcps-biggest-security-loophole-is-identity-fragmentation)
- [IT Pro](https://www.itpro.com/technology/artificial-intelligence/what-is-model-context-protocol-mcp)

[1]: https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk "Building agents with the Claude Agent SDK"
[2]: https://www.anthropic.com/engineering/code-execution-with-mcp "Code execution with MCP: Building more efficient agents"
[3]: https://modelcontextprotocol.io/docs/learn/architecture "Architecture overview"
[4]: https://anthropic.mintlify.app/en/docs/agents-and-tools/agent-skills/overview "Agent Skills - Claude Docs - Home - Anthropic"
[5]: https://www.anthropic.com/engineering/claude-code-sandboxing "Making Claude Code more secure and autonomous with ..."
[6]: https://blog.cloudflare.com/code-mode/ "Code Mode: the better way to use MCP"
[7]: https://www.techradar.com/pro/mcps-biggest-security-loophole-is-identity-fragmentation "MCP's biggest security loophole is identity fragmentation"
[8]: https://www.itpro.com/technology/artificial-intelligence/what-is-model-context-protocol-mcp "What is model context protocol (MCP)?"
[9]: https://modelcontextprotocol.io/ "What is the Model Context Protocol (MCP)? - Model Context ..."
[10]: https://www.anthropic.com/news/skills "Claude Skills: Customize AI for your workflows"
