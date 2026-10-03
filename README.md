# Agent Tools

Reusable instructions, skills, and supporting tools for AI coding agents.

The repository keeps agent behavior portable across harnesses without treating one harness's file format as the source of truth. Canonical instruction content lives in this repository; harness-specific files are adapters or generated outputs.

## Contents

### Instructions

The [`instructions/`](instructions/) directory contains the canonical global instruction sources:

- [`invariant.md`](instructions/invariant.md) defines durable operating rules.
- [`preferences.md`](instructions/preferences.md) defines general coding and collaboration preferences.
- [`technology-defaults.md`](instructions/technology-defaults.md) defines conditional technology choices when the project has not established its stack or tooling.

Each harness (`pi`, `codex`, `vscode`, `zed`) supports two optional module directories:

```text
instructions/<harness>/system/*.md   # operating rules
instructions/<harness>/agents/*.md   # global personal guidance
instructions/pi/APPEND_SYSTEM.md    # dedicated Pi append source
```

Add a Markdown file to the appropriate layer directory to include it automatically. The loader reads regular `*.md` files directly within each directory in alphabetical filename order, normalizes BOM and line endings, and joins nonempty content with one blank line. Nested directories and non-Markdown files are not included. Missing or empty layer directories are valid.

Generated harness modules use their source identity as the tag name, without attributes. For example, `pi/system/specific-tools.md` becomes `<pi_system_specific_tools>`. Remove the final `.md` extension and replace each character other than an ASCII letter, digit, or underscore with an underscore, preserving case. If two nonempty modules produce the same tag, generation fails and names both sources. Sources remain plain Markdown. One short introduction marks the blocks as active instructions: `Follow the instructions in the tagged modules below.` Pi includes it only in `SYSTEM.md`, and Codex only in `developer_instructions`, covering their separate global `AGENTS.md` modules without repetition. Zed and VS Code include it once in their combined output. Outputs without nonempty modules omit it. Shared instructions and the dedicated Pi append source have no generated wrappers.

Module content must not contain opening or closing tags in the generated `<harness>_<system|agents>_<module>` namespace. The tool reports the source and stops before writing if it finds one. Other Markdown content is preserved.

Generated wrappers put a blank line after the opening tag and before the closing tag, keeping module content separate in Markdown previews:

```markdown
<pi_system_specific_tools>

Module content goes here.

</pi_system_specific_tools>
```

| Source content | Pi | Codex |
| --- | --- | --- |
| `invariant.md` + matching `system/*.md` | `SYSTEM.md` | managed `developer_instructions` in `config.toml` |
| `preferences.md` + `technology-defaults.md` + matching `agents/*.md` | global `AGENTS.md` | global `AGENTS.md` |
| Only `pi/APPEND_SYSTEM.md` | `APPEND_SYSTEM.md` | excluded |

Zed combines the operating layer followed by the personal guidance layer into one personal `AGENTS.md` per configured home. VS Code combines them into the invariants and preferences sections of its existing `*.instructions.md` targets. Source separation does not give these files system or developer priority. Pi's custom `SYSTEM.md` continues to replace its built-in prompt preamble.

Markdown files directly under a harness directory are rejected with a migration error, except the exact `pi/APPEND_SYSTEM.md` source. Move old modules into `system/` or `agents/` and rename `pi/append-system.md` to `pi/APPEND_SYSTEM.md`. A missing append source generates an empty managed `APPEND_SYSTEM.md`. A TOML multiline-string delimiter (`"""`) in Codex's operating layer blocks synchronization. Codex's `agents/` content remains plain Markdown and does not have that restriction.

The Pi shell rule lives in [`pi/system/specific-tools.md`](instructions/pi/system/specific-tools.md), and its todo-list preference lives in [`pi/agents/task-workflow.md`](instructions/pi/agents/task-workflow.md). Codex's question-visibility rule lives in [`codex/system/async-question-wait.md`](instructions/codex/system/async-question-wait.md). These instructions do not guarantee model behavior. Validate generated files separately from observed behavior in a new session after synchronization.

### Skills

The [`skills/`](skills/) directory contains reusable agent skills. Each skill is self-contained under its own directory with a `SKILL.md` entrypoint and, when needed, references, scripts, or evaluations.

Install or link a skill through the target harness's supported skill mechanism. Preserve the complete skill directory so relative references continue to work.

### Specialist agents

[`agents/`](agents/) owns the canonical specialist definitions. This directory is separate from `instructions/<harness>/agents/`, which contains global personal guidance.

```text
agents/<role>/role.md      # shared responsibilities and evidence standards
agents/<role>/agent.json   # shared description and explicit native settings
agents/<role>/pi.md        # optional Pi procedure
agents/<role>/codex.md     # optional Codex procedure
```

For example:

```json
{
  "description": "Reviews code and reports evidence",
  "pi": {
    "name": "reviewer",
    "tools": ["@review", "mcp:context7"],
    "inheritSkills": false,
    "turnBudget": "{ \"maxTurns\": 20 }"
  },
  "codex": {
    "name": "reviewer",
    "model": "gpt-6-luna",
    "model_reasoning_effort": "high",
    "sandbox_mode": "read-only",
    "mcp_servers": {
      "docs": {
        "command": "node",
        "args": ["/absolute/path/to/docs-server.js"],
        "env_vars": ["DOCS_TOKEN"],
        "enabled_tools": ["search"]
      }
    }
  }
}
```

An absent native section omits that harness's output. Native descriptions can override the shared description. Pi filenames follow the native name. Codex filenames follow the canonical role directory, with the native `name` remaining authoritative. Role directory IDs are stable ownership identities. Renaming one into an existing managed filename blocks synchronization rather than deleting a path that is still generated.

Pi accepts scalar frontmatter, string arrays for native list fields and scalar extension fields. Encode extension JSON as a string, as the current frontmatter does. Codex supports names, descriptions, nicknames, model and reasoning settings, sandbox and approval settings, web-search/image controls, skill configuration and per-agent MCP settings. Unknown keys or unrepresentable values fail before writes. Extend the explicit validator against the native documentation when introducing another Codex setting. Codex's `tools` table supports `web_search` and `view_image`, not an arbitrary tool-name allowlist. MCP selections use native `enabled_tools`, `disabled_tools` and per-tool settings. No settings are translated between harnesses.

Global MCP setup stays outside this tool. Reference credentials through native `env_vars`, `bearer_token_env_var` or `env_http_headers` rather than committing their values. Rendering and parsing a server definition does not verify its startup or authentication.

## Quick Start

Clone the repository and inspect the instruction or skill you want to use:

```bash
git clone https://github.com/abdwhb-png/agent-tools.git
cd agent-tools
```

No repository-wide installation step is currently required. Individual skills may have their own documented requirements.

## Architecture

The portable TypeScript package under `tools/harness-sync/` provides independent instruction and agent commands. Two thin entrypoints use one shared CLI, planner and file transaction. Instructions target Pi, Codex, VS Code and Zed. Native specialist agents target Pi and Codex. Each command preserves the native target format and has its own configuration and ownership state.

Version 1 uses explicit manual synchronization. Startup hooks are deliberately deferred until the file-based workflow has been implemented and validated.

See [ADR-001](docs/decisions/001-cross-harness-instruction-synchronization.md) for the synchronization safety model and [ADR-002](docs/decisions/002-explicit-harness-instruction-layers.md) for the accepted source layout, native target mapping, migration, and validation requirements.

## Project Status

- Canonical instruction sources: available
- Reusable skills: available
- Instructions and agent synchronizer: available at [`tools/harness-sync/`](tools/harness-sync/)
- Canonical specialist agents: 22 roles in [`agents/`](agents/), producing 17 Pi and 18 Codex agents

## Instruction synchronization

Run the standalone Node 24+ artifact without installing dependencies:

```bash
node tools/harness-sync/dist/instruction-sync.mjs configure
node tools/harness-sync/dist/instruction-sync.mjs configure --apply
node tools/harness-sync/dist/instruction-sync.mjs doctor
node tools/harness-sync/dist/instruction-sync.mjs sync --dry-run
node tools/harness-sync/dist/instruction-sync.mjs sync
node tools/harness-sync/dist/instruction-sync.mjs check
```

Configuration defaults to the Git-ignored `tools/harness-sync/instructions.config.json`. Copy [instructions.config.example.json](tools/harness-sync/instructions.config.example.json) there and edit its absolute destinations, or use `configure` to preview and apply changes. Its `kind` is `instructions`, its `enabled` switch controls this workflow, and its harness settings cover Pi, Codex, VS Code and Zed. Use `--config PATH` and `--state PATH` for explicit overrides.

Codex supports a primary home and named additional homes. From WSL, use mounted absolute paths for Windows homes and confirm the effective Windows `CODEX_HOME` if customized:

```bash
node tools/harness-sync/dist/instruction-sync.mjs configure --codex-additional-home windows=/mnt/c/Users/example/.codex
node tools/harness-sync/dist/instruction-sync.mjs configure --codex-additional-home windows=/mnt/c/Users/example/.codex --apply
```

Zed's native agent reads personal `AGENTS.md` from `%APPDATA%\Zed` on Windows and `~/.config/zed` on Linux. Configure its homes through the instruction command:

```bash
node tools/harness-sync/dist/instruction-sync.mjs configure --zed-home /mnt/c/Users/example/AppData/Roaming/Zed --zed-additional-home linux=/home/example/.config/zed --enable-zed
node tools/harness-sync/dist/instruction-sync.mjs configure --zed-home /mnt/c/Users/example/AppData/Roaming/Zed --zed-additional-home linux=/home/example/.config/zed --enable-zed --apply
```

Zed's external agents use their own instruction mechanisms. When running from WSL, Windows destinations must use `/mnt/...` paths. Configure flags modify only instruction settings and do not affect agent destinations or enabled status.

## Agent synchronization

Agent management has its own command and configuration:

```bash
node tools/harness-sync/dist/agent-sync.mjs configure
node tools/harness-sync/dist/agent-sync.mjs configure --apply
node tools/harness-sync/dist/agent-sync.mjs doctor
node tools/harness-sync/dist/agent-sync.mjs sync --dry-run
node tools/harness-sync/dist/agent-sync.mjs sync
node tools/harness-sync/dist/agent-sync.mjs check
```

Configuration defaults to the Git-ignored `tools/harness-sync/agents.config.json`. Copy [agents.config.example.json](tools/harness-sync/agents.config.example.json) there and edit its absolute destinations, or use `configure`. Its `kind` is `agents`, and its settings cover only Pi and Codex. Agent synchronization requires its own configuration, even if instruction synchronization is already configured. Configure accepts Pi and Codex paths and named additional Codex homes. `configure --disable --apply` pauses this workflow while preserving files and ownership. Instruction synchronization continues independently.

Canonical definitions remain in `agents/<role>/`: shared responsibilities in `role.md`, native settings in `agent.json`, and optional `pi.md` and `codex.md` supplements. The 22-role catalog produces 17 Pi and 18 Codex agents. Both configured Codex homes receive the same profile.

Harness-wide subagent instructions belong in [agents/pi.md](agents/pi.md) and [agents/codex.md](agents/codex.md). Every generated agent receives its harness's shared instructions, then its role, then its role-specific harness supplement. Missing or empty shared files preserve the previous output. The loader composes each prompt once, and native renderers only serialize it. These sources are managed exclusively by `agent-sync` and are separate from global instruction modules. The Pi file explains tool-group aliases without copying their members. The Codex file is initially empty.

Matching unmanaged files can be recorded by sync. Divergent files require explicit adoption. Source removal deletes only recorded agents in enabled output directories whose current hash matches their ownership record. Independent edits block removal and sibling writes. Moving or disabling a harness preserves its previously managed files and records.

For a known legacy Codex alias, put its exact basename in `retiredAgents` on the primary Codex settings or a named additional home. For example, `additionalHomes: [{ "id": "windows", "home": "/mnt/c/Users/example/.codex", "retiredAgents": ["explore.toml"] }]`. Adopt its reported target ID before removal:

```bash
node tools/harness-sync/dist/agent-sync.mjs adopt --target codex-windows-agent-retired-explore --dry-run
node tools/harness-sync/dist/agent-sync.mjs adopt --target codex-windows-agent-retired-explore --apply
node tools/harness-sync/dist/agent-sync.mjs sync --dry-run
node tools/harness-sync/dist/agent-sync.mjs sync
```

Adoption records ownership of a retired alias without deleting it. Sync checks ownership again, backs up the file and removes it. Remove the retirement list afterward. Active generated files cannot also be listed for retirement.

## Preview, adoption and safety

Both commands share these rules. `configure` previews by default and writes only with `--apply`. `sync --dry-run` previews creations, updates, removals, ownership changes and conflicts. `sync` applies the same plan through the shared transaction. `adopt` requires either `--dry-run` or `--apply` plus `--target ID` or `--all`. Adoption selects only existing targets in that command's domain. `--apply` and `--dry-run` cannot be combined.

Dry-run performs no mutating filesystem operations, including state writes, temporary files, directories and backups. A feasible preview exits 0 even when changes are proposed. Invalid or blocked operations exit 2. `doctor` and `check` never write and exit 1 for stale, missing, untracked, obsolete or conflicted targets. Use `--help` on either command for its own options. The combined `--only` selector no longer exists.

Applied operations report one result per target, with changed targets first and backups summarized by directory. Configuration, imports, runtime replacements, deletions and ownership writes reuse one transaction with private backups, concurrent-change checks and rollback. An instruction conflict cannot block agent synchronization. Neither workflow manages global MCP registries, installs tools or restarts runtimes.

## Migrating the combined configuration

The former `harness-sync` executable prints replacement commands and performs no synchronization. Import each domain independently from the old adjacent `config.json` and shared state:

```bash
node tools/harness-sync/dist/instruction-sync.mjs configure --import-legacy --dry-run
node tools/harness-sync/dist/agent-sync.mjs configure --import-legacy --dry-run
node tools/harness-sync/dist/instruction-sync.mjs configure --import-legacy --apply
node tools/harness-sync/dist/agent-sync.mjs configure --import-legacy --apply
```

Use `--legacy-config PATH` and `--legacy-state PATH` when the old files are elsewhere. `--config PATH` and `--state PATH` choose the new destinations. Import preserves native destinations, named homes, disabled workflows, retirement settings where applicable, ownership IDs, paths and hashes. Runtime files and instruction markers remain untouched. The original inputs remain in place and receive private recovery copies. Divergent destination settings or ownership block the entire import. Repeating an identical import does nothing. Apply imports before ordinary configuration changes. If agents were disabled in the legacy configuration, enable the imported workflow explicitly with `agent-sync configure --enable --apply` using its Node artifact.

Default ownership state remains under the platform-specific `agent-policy` directory, split into `instructions/state.json` and `agents/state.json`. On Linux these default to `~/.local/state/agent-policy/instructions/state.json` and `~/.local/state/agent-policy/agents/state.json`, honoring `XDG_STATE_HOME`. Windows uses `LOCALAPPDATA`, and macOS uses `~/Library/Application Support`.

## Maintaining the package

Run `bun run typecheck`, `bun test`, `bun run build` and `bun run verify:dist` from `tools/harness-sync/`. Maintenance requires Bun 1.3.14 and a locally available TypeScript compiler. The generated CLIs require only Node 24+. Both standalone bundles are generated from the same shared implementation. Their duplicated compiled code is a distribution boundary, and the shared build and verification scripts keep both artifacts current.

Native TOML tests use Python 3.11+. Pi parser integration tests use an installed `pi-subagents` package from the default user installation or `PI_SUBAGENTS_DIR` and report a skip when absent. These are validation tools rather than runtime dependencies. Parsing does not establish MCP startup or authentication. See [ADR-004](docs/decisions/004-separate-synchronization-commands.md) for interface separation, centralized mechanisms and migration, and [ADR-003](docs/decisions/003-native-agent-synchronization.md) for native agent definitions.

## Contributing

- Keep durable cross-harness behavior in `instructions/`.
- Keep harness-specific adaptation out of the canonical instruction bodies.
- Put repeatable, task-specific workflows in `skills/`.
- Record expensive-to-reverse architectural decisions in `docs/decisions/`.
- Preserve existing file paths unless a migration plan accounts for external
  consumers.
