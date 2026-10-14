# ADR-003: Native agent synchronization with harness-sync

Status: Accepted

The combined CLI and shared configuration/state placement are superseded by [ADR-004](004-separate-synchronization-commands.md). Native source and rendering decisions remain accepted.

Date: 2026-10-03

## Decision

Rename the existing instruction synchronizer to `harness-sync` and extend its file transaction to specialist agents. Keep the instruction layering from ADR-002 and the adoption, conflict, backup and rollback model from ADR-001. Preserve legacy state locations, instruction target identities and ownership markers. Adjacent machine configuration moves with the renamed tool.

Canonical specialist agents live under `agents/<role>/`. Shared responsibilities belong in `role.md`. `agent.json` contains a shared description and explicit native `pi`, `codex` and `vscode` configurations. Native descriptions inherit the shared description by default. Overrides are reserved for materially different responsibilities or selection criteria, not formatting or tool procedures. Optional Markdown supplements describe native procedures. These sources are distinct from global instruction modules under `instructions/<harness>/agents/`.

Optional root-level `agents/pi.md`, `agents/codex.md` and `agents/vscode.md` files contain instructions shared by every generated agent for that harness. The agent loader owns the composition order: shared harness instructions, shared role guidance, then the role-specific harness supplement. Native renderers consume the composed prompt without recomposing it. Empty or absent shared files preserve existing output. This layer does not create agent profiles, alter native controls, read tool-group registries or depend on instruction synchronization. Pi alias semantics belong in its shared prompt; actual group resolution remains owned by the Pi harness. Tool membership is not copied into generated prompts.

The current catalog is an explicit selection of 18 roles, producing 16 Pi agents, 18 agents in each Codex home and 18 agents in each enabled VS Code directory. Quick-reviewer, test-engineer and librarian have all three native profiles. Worker and scout have Codex and VS Code profiles because Pi owns their packaged definitions. SDD-orchestrator and orchestration-assessor remain local to Pi, with no synchronization ownership. The initial catalog imported 22 roles before its scope was narrowed and these selected roles were restored. Both Codex homes receive identical output. Pi retains `oh-my-oracle` as its native oracle name.

Browser validation and debugging use one canonical `browser-tester` role and shared description, with Pi's native name `browser-tester` and Codex's native name `browser_tester`. Codex writes `browser-tester.toml`; the previous `browser-debugger.toml` files are explicitly retired with recovery backups. Shared responsibilities prohibit application edits and require reproducible evidence. Native controls and reporting procedures remain in their owning profiles and supplements. Re-adoption of previously released native files uses the existing synchronization and transaction implementations. During the initial migration, Windows aliases mapped as follows:

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

Use focused RED → GREEN tests at the source/rendering, synchronization and CLI boundaries. Exercise the installed Pi parser and an independent TOML parser. Cover escaping, list and extension preservation, native settings validation, cross-home equality, idempotence, adoption, conflict isolation, removal, path collisions, concurrent edits during backup and rollback after deletion. Finish with package tests, typecheck, build, distribution verification and temporary-target compiled Node CLI checks. Preserve the existing WSL instruction conflict during live agent migration. Use temporary catalogs instead of pinning the personal catalog in standard tests.

## Extension: VS Code native agents (2026-10-13)

Extend agent-sync's existing loader, target planner and transaction rather than adding a synchronizer or capability compiler. Native model and tool choices remain explicit. Optional agent configuration uses `harnesses.vscode` with `enabled` and named `directories` entries containing `id` and an absolute `path`. Existing configurations and legacy imports retain VS Code agents disabled. `--vscode-agent-dir ID=PATH` adds or updates directories; enabling requires an explicit nonempty destination list. Instruction targets keep their separate contract.

Generate deterministic `.agent.md` files with quoted YAML frontmatter and composed Markdown. Native display names may contain spaces and remain independent of filenames. Optional `vscode.fileName` preserves an existing basename without entering frontmatter. The validator supports the selected catalog's identity, model, tool, subagent and visibility fields and rejects unsupported fields. The renderer runs under Node without installed dependencies; tests independently parse generated YAML with Bun's parser.

The initial destination is the existing Windows Insiders profile, configured explicitly from WSL. Local VS Code sessions discover user profile files. Copilot Agent Host instead discovers `~/.copilot/agents` on the host machine. Do not assume the synchronizer's home is the host's home, relocate files or activate another destination automatically. See [official migration behavior](https://code.visualstudio.com/docs/agent-customization/migrate-customizations).

Preserve the ten matching Insiders profiles' names, model ordering, tools and subagent references, including Scout's `codebase-scout.agent.md` filename. Canonical responsibilities remain authoritative, with VS Code-specific procedures in native supplements. Atlas Orchestrator, Metis and Quick Planner remain unmanaged. New review roles use the existing Code Reviewer model list; Quick Worker and Test Engineer use Worker settings; Browser Tester uses QA Tester settings. New profiles disable delegation. No Pi or Codex responsibilities or native settings change.

Ownership IDs are `vscode-<directory-id>-agent-<role-id>`. Reject duplicate target identities and paths before writes. Retirement checks the complete `.agent.md` suffix, recorded directory and unchanged hash. Disabling or moving destinations preserves old ownership. All adoption, concurrency, backup and rollback behavior remains owned by the shared transaction. Live adoption requires review of the preview and resulting prompt changes. Runtime discovery, models and tools remain a separate acceptance check.
