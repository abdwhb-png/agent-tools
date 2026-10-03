# ADR-003: Native agent synchronization with harness-sync

Status: Accepted

The combined CLI and shared configuration/state placement are superseded by [ADR-004](004-separate-synchronization-commands.md). Native source and rendering decisions remain accepted.

Date: 2026-10-03

## Decision

Rename the existing instruction synchronizer to `harness-sync` and extend its file transaction to specialist agents. Keep the instruction layering from ADR-002 and the adoption, conflict, backup and rollback model from ADR-001. Preserve legacy state locations, instruction target identities and ownership markers. Adjacent machine configuration moves with the renamed tool.

Canonical specialist agents live under `agents/<role>/`. Shared responsibilities belong in `role.md`. `agent.json` contains a shared description and explicit native `pi` and `codex` configurations. Optional Markdown supplements describe native procedures. These sources are distinct from global instruction modules under `instructions/<harness>/agents/`.

The first catalog contains 22 roles, producing 17 Pi agents and 18 Codex agents. Pi retains `oh-my-oracle` as its native oracle name. Codex retains the `browser-debugger.toml` filename and `browser_debugger` native name. Both configured Codex homes use the fuller WSL profile, including its names, models and per-agent settings. Windows aliases map as follows:

| Retired Windows alias | Canonical Codex role |
| --- | --- |
| expert-reviewer | code-reviewer |
| explore | scout |
| reviewer | quick-reviewer |
| quick-coder | quick-worker |

## Native controls

Pi serializes the current scalar frontmatter and native lists, including tool groups, `mcp:` selections, skills and extension fields. Codex serializes supported session controls, including nested per-agent MCP definitions and tool selections. Native configuration is explicit. A shared capability compiler would obscure differences and suggest enforcement that a harness may not provide.

Validation rejects unsupported fields and unrepresentable values before any writes. The explicit Codex validator supports the imported catalog and native tool/MCP controls. New session fields require a deliberate validator update against [Codex's native agent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents) and [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

Global MCP registries, skill synchronization, provider installation and runtime activation remain outside this tool. Credential values are replaced with native environment references. Static parsing does not establish provider availability or authentication.

## Migration corrections

Shared role guidance no longer mandates Pi diagnostics in Codex, requires unapproved child delegation or assumes an unavailable skill/provider. Native Pi supplements reference configured diagnostics conditionally. Reviewer guidance evaluates design consequences rather than treating function length as an automatic violation. The oracle's duplicated foreign manifest is removed. QA guidance limits cleanup to task-owned resources, with its Codex sandbox changed to workspace-write for authorized test artifacts. The librarian uses remote source reads or existing checkouts when cloning is not permitted. Video analysis separates transcript and visual evidence. Quick-worker replaces retired Spark with gpt-6-luna at high reasoning effort.

## Lifecycle and compatibility

Agent synchronization is opt-in through `resources.agents`. Legacy configuration retains instructions-only behavior. The `--only` selector isolates source loading, assessment and mutation. A selected agent operation does not read or replace global Codex developer instructions.

Managed agent state records its output directory. Source removal considers only recorded files in currently enabled output directories, and only unchanged files can be deleted. Unknown files remain untouched. A machine-local `retiredAgents` list identifies exact legacy Codex basenames for explicit adoption. Adoption records their current hash without deleting them. A subsequent sync verifies ownership and current contents, backs up the file and retires it transactionally. Changing a harness destination or disabling it does not trigger deletion.

## Validation

Use focused RED → GREEN tests at the source/rendering, synchronization and CLI boundaries. Exercise the installed Pi parser and an independent TOML parser. Cover escaping, list and extension preservation, native settings validation, catalog counts, cross-home equality, idempotence, adoption, conflict isolation, removal, path collisions, concurrent edits during backup and rollback after deletion. Finish with package tests, typecheck, build, distribution verification and temporary-target compiled Node CLI checks. Preserve the existing WSL instruction conflict during live agent migration.
