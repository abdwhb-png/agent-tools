# Harness Sync

Synchronize this repository's canonical instructions and specialist agents into native harness files. The package provides two independent commands that share the same CLI implementation, planner and file transaction.

| Command | Manages | Supported harnesses | Default configuration |
| --- | --- | --- | --- |
| `instruction-sync` | Global operating rules and personal guidance | Pi, Codex, VS Code, Zed | `instructions.config.json` |
| `agent-sync` | Native specialist agent definitions | Pi, Codex, VS Code | `agents.config.json` |

Each command loads only its own sources, configuration and ownership state. Disabling one workflow or encountering an instruction conflict does not affect the other. Synchronization is manual. The tool does not synchronize skills, install tools, manage global MCP registries or restart runtimes.

## Guide

- [Quick start](#quick-start)
- [Commands and options](#commands-and-options)
- [Configuration and destinations](#configuration-and-destinations)
- [Instruction sources and outputs](#instruction-sources-and-outputs)
- [Agent sources and outputs](#agent-sources-and-outputs)
- [Ownership, conflicts and recovery](#ownership-conflicts-and-recovery)
- [Legacy migration](#legacy-migration)
- [Package maintenance](#package-maintenance)

## Quick start

Use Node 24+ with the committed standalone artifacts. No dependency installation or build is required for normal use. From the repository root:

```bash
cd tools/harness-sync
```

All commands below run from this directory. Keep the repository layout intact: the CLIs locate canonical sources relative to the tool, regardless of the current working directory. `--config` and `--state` change settings and ownership locations, not the canonical source root.

### Instructions

```bash
node dist/instruction-sync.mjs configure
node dist/instruction-sync.mjs configure --apply
node dist/instruction-sync.mjs doctor
node dist/instruction-sync.mjs sync --dry-run
node dist/instruction-sync.mjs sync
node dist/instruction-sync.mjs check
```

The first command previews the proposed settings. Check destinations and enabled harnesses before applying. `configure --apply` writes configuration only. `doctor` reports target IDs and status. A conflict requires review before `sync` can apply changes. Use [explicit adoption](#sync-versus-adopt) when an existing destination should be replaced by canonical content.

### Agents

```bash
node dist/agent-sync.mjs configure
node dist/agent-sync.mjs configure --apply
node dist/agent-sync.mjs doctor
node dist/agent-sync.mjs sync --dry-run
node dist/agent-sync.mjs sync
node dist/agent-sync.mjs check
```

Agent configuration is required separately, even if instruction synchronization is already configured. Before syncing the Codex catalog, add the [local path bindings](#local-agent-path-bindings) from the agent example configuration and set their actual installation paths. `configure` preserves existing bindings but does not discover these external installations. Review the preview before applying either workflow. After changing canonical sources or local bindings, use that workflow's `sync --dry-run`, `sync` and `check` commands again.

## Commands and options

Invoke exactly one command at a time:

```text
node dist/instruction-sync.mjs <configure|doctor|check|sync|adopt> [options]
node dist/agent-sync.mjs <configure|doctor|check|sync|adopt> [options]
```

`sync adopt` is invalid. Run `adopt` and `sync` as separate invocations when both are needed. The old combined `--only` selector is removed.

| Command | Behavior | Writes |
| --- | --- | --- |
| `configure` | Preview or change this workflow's settings. Also provides legacy import. | Only with `--apply`. |
| `doctor` | Report configuration/state paths, target IDs and current status. | Never. |
| `check` | Report target status and signal drift through the exit code. | Never. |
| `sync` | Create missing targets, update unchanged managed targets, record matching files and remove eligible retired targets. | Applies by default. `--dry-run` previews. |
| `adopt` | Explicitly replace selected targets with canonical output and take ownership. Unowned missing targets are skipped. Retired agents are recorded for later deletion. | Requires `--dry-run` or `--apply`. |

### Shared options

| Option | Use |
| --- | --- |
| `--config PATH` | Override this command's configuration file. Relative paths resolve from the current working directory. |
| `--state PATH` | Override this command's ownership state. Keep instruction and agent state separate. |
| `--help` | Display the command's dedicated help. Also available as `help`. |
| `--dry-run` | Preview `configure`, `sync` or `adopt` without filesystem mutations. |
| `--apply` | Apply `configure` or `adopt`. `sync` already applies by default and does not accept this flag. |

`--apply` and `--dry-run` cannot be combined. A dry-run creates no target files, configuration files, state, temporary files, directories or backups. Preview and execution use the same synchronization operation plan and conflict rules. Execution also checks that file contents have not changed since preflight. A preview does not guarantee future filesystem access or runtime behavior.

Synchronization and adoption previews report operations such as `create`, `update`, `remove`, `record` and `forget`, plus unchanged/skipped/blocked targets, totals and whether ownership would change. `record` updates ownership without changing target content. `forget` removes obsolete ownership for an already absent retired target. A blocked plan applies nothing.

### Configure options

| Option | Available in | Use |
| --- | --- | --- |
| `--enable`, `--disable` | Both | Enable or pause this workflow. |
| `--pi-agent-dir PATH` | Both | Set Pi's agent configuration directory, usually `~/.pi/agent`. |
| `--codex-home PATH` | Both | Set the primary Codex home. |
| `--codex-additional-home ID=PATH` | Both | Add or update a named Codex home. Repeatable. |
| `--enable-pi`, `--disable-pi` | Both | Include or exclude Pi. |
| `--enable-codex`, `--disable-codex` | Both | Include or exclude all configured Codex homes. |
| `--vscode-agent-dir ID=PATH` | Agents | Add or update a named exact agent directory. Repeatable. |
| `--vscode-target PATH` | Instructions | Set exact output paths. Repeat to supply the entire replacement list. |
| `--enable-vscode`, `--disable-vscode` | Both | Include or exclude VS Code for this workflow. |
| `--zed-home PATH` | Instructions | Set the primary Zed home. |
| `--zed-additional-home ID=PATH` | Instructions | Add or update a named Zed home. Repeatable. |
| `--enable-zed`, `--disable-zed` | Instructions | Include or exclude Zed. |
| `--import-legacy` | Both | Import this domain's settings and ownership. Preview by default. |
| `--legacy-config PATH`, `--legacy-state PATH` | Both | Override import sources. Require `--import-legacy`. |

Repeat the same configure options with `--apply` after reviewing a preview. Named-home and named-agent-directory options preserve other destinations and update the entry with the same ID. Remove an entry by editing the configuration. Path options alone do not enable a previously disabled harness. Opposing enable/disable flags for the same scope are invalid. Import legacy settings before changing destinations or enabled status.

### Sync versus adopt

`sync` follows recorded ownership. It creates missing unmanaged destinations, updates managed content when only canonical sources changed, and records existing files that already match. An independently changed or divergent unmanaged file blocks synchronization.

`adopt` is explicit authorization to overwrite an existing destination with canonical content and record ownership. It does not merge local edits into canonical sources. Preserve any local content you want to keep in the canonical source before adopting. Select target IDs reported by `doctor`:

```bash
node dist/instruction-sync.mjs adopt --target codex-config --dry-run
node dist/instruction-sync.mjs adopt --target codex-config --apply
node dist/instruction-sync.mjs sync --dry-run
node dist/instruction-sync.mjs sync
```

For an agent:

```bash
node dist/agent-sync.mjs adopt --target codex-agent-quick-reviewer --dry-run
node dist/agent-sync.mjs adopt --target codex-agent-quick-reviewer --apply
```

`--target ID` is repeatable. `--all` selects targets in that command's domain and cannot be combined with `--target`. Prefer named targets when reviewing a specific conflict. Adoption skips unowned missing targets, which a later sync can create. Explicit adoption can recreate a previously managed file that now reports a conflict. Targeted adoption ignores ownership conflicts on unselected targets and preserves their files and ownership records. Those conflicts remain visible in `doctor` and `check` and still block a later global `sync`. `adopt --all` explicitly selects every enabled target for adoption. Configuration and canonical source validation still cover enabled resources before any writes, and unknown target IDs remain errors. Instructions and agents remain independent.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Successful operation or feasible preview. A preview can propose changes and still succeed. |
| `1` | `doctor` or `check` found a target that is not current. |
| `2` | Invalid arguments/configuration, disabled workflow, blocked operation, import conflict or execution error. |

## Configuration and destinations

Configuration files are adjacent to this tool and Git-ignored. Create them through `configure`, or copy and edit [instructions.config.example.json](instructions.config.example.json) and [agents.config.example.json](agents.config.example.json). Replace placeholder paths and disable unwanted destinations before applying. JSON paths must be absolute for the platform running Node. JSON does not expand `~` or environment-variable placeholders.

| Setting | Meaning |
| --- | --- |
| `schemaVersion` | Must be `2` for current configuration. |
| `kind` | Must match the command: `instructions` or `agents`. |
| `enabled` | Boolean controlling the whole workflow. |
| `paths` | Optional map of named, absolute installation paths. Agent configuration only. |
| `harnesses.pi` | Required object with `enabled` and, when enabled, `agentDir`. |
| `harnesses.codex` | Required object with `enabled` and, when enabled, `home`. Optional `additionalHomes`. |
| `harnesses.vscode` | Instructions require `enabled` and a nonempty `targets` array when enabled. Agents optionally accept `enabled` and named `directories`, which must be nonempty when enabled. |
| `harnesses.zed` | Optional for instructions, with `enabled`, `home` when enabled, and optional `additionalHomes`. Invalid in agent configuration. |
| `retiredAgents` | Agent configuration only, on the primary Codex settings or individual additional homes. Exact `.toml` basenames to retire. |

Unknown settings are rejected. Each additional home needs a unique lowercase ID matching `[a-z][a-z0-9-]*` and a distinct absolute path. A harness-level `enabled` switch applies to all its homes. A disabled harness retains its files and ownership records. Moving a harness also preserves the old files, and existing ownership identities can require explicit adoption at the new destination.

On first configuration, Pi defaults to `~/.pi/agent`. Codex uses `CODEX_HOME` when set, otherwise `~/.codex`. Instruction configuration also enables the platform's standard VS Code target and leaves Zed disabled. Agent configuration initially includes only Pi and Codex; VS Code agents require explicit destinations and enablement. Existing configurations and legacy agent imports do not enable VS Code agents.

### Local agent path bindings

Tracked agent definitions reference local installation paths by name. Put the actual values in the Git-ignored `agents.config.json`. For example, the `pi-session-recall` MCP settings in `agents/pi-expert/agent.json` contain:

```json
{
  "command": "node",
  "args": ["${paths.piSessionRecallScript}", "--project-dir", "${paths.piProjectDir}"]
}
```

The corresponding top-level setting in your local agent configuration is:

```json
{
  "paths": {
    "piSessionRecallScript": "/absolute/path/to/pi-session-recall/dist/mcp-bin.js",
    "piProjectDir": "/absolute/path/to/.pi",
    "factualResearchSkill": "/absolute/path/to/skills/factual-research/SKILL.md",
    "youtubeServerScript": "/absolute/path/to/youtube-mcp-server/dist/index.js"
  }
}
```

These are excerpts, not complete files. The four bindings above are required by the current Codex catalog. Start from [agents.config.example.json](agents.config.example.json), replace its placeholders, and keep the complete configuration's `schemaVersion`, `kind`, `enabled` and `harnesses` settings. Existing users can add `paths` to their current configuration. These local values are preserved by subsequent `configure` operations.

One shared resolver substitutes references in Pi and Codex native string fields, including nested arrays and objects, before the resolved settings are validated and rendered. Use an entire string value such as `"${paths.piSessionRecallScript}"`. Embedded forms such as `"${paths.installDir}/server.js"` are rejected, so bind the complete file path instead. Binding names match `[A-Za-z][A-Za-z0-9_-]*`, and values must be literal absolute paths for the Node platform without nested path references or NUL characters. Neither shell commands nor environment variables are evaluated. The supported VS Code fields are literal native settings and do not use path bindings.

Generated native files receive the resolved absolute paths. Shared descriptions, role prompts and Markdown supplements should remain portable. Prompt bodies are not templates. Credential environment references such as `env_vars` remain native settings.

A missing binding for an enabled profile exits `2` in `doctor`, `check`, sync and adoption, including previews, and changes no files or ownership. The error identifies the role, native field and missing name. A disabled harness does not require its native profiles' bindings. A Pi-only configuration therefore does not need the current Codex path bindings. The resolver does not check whether a configured file exists or whether its runtime can start.

Moving an installation requires changing its local binding, then previewing and applying agent sync. The resulting native content participates in the existing ownership hashes, conflicts, backups and rollback. Every Codex home in one agent configuration receives the same resolved profile. Instruction configuration does not accept or load these agent bindings.

### Multiple Codex homes

For a WSL process, Windows destinations use mounted Linux paths. Confirm the intended Windows home separately if its `CODEX_HOME` is customized. Configure each workflow that should write there:

```bash
node dist/instruction-sync.mjs configure --codex-additional-home windows=/mnt/c/Users/example/.codex
node dist/instruction-sync.mjs configure --codex-additional-home windows=/mnt/c/Users/example/.codex --apply
node dist/agent-sync.mjs configure --codex-additional-home windows=/mnt/c/Users/example/.codex
node dist/agent-sync.mjs configure --codex-additional-home windows=/mnt/c/Users/example/.codex --apply
```

All configured Codex agent homes receive identical profiles. Their instruction operating blocks and personal guidance match, while unrelated contents of each `config.toml` remain local. A native Windows Node process requires Windows absolute paths instead.

### VS Code and Zed

VS Code uses exact configured `*.instructions.md` paths. Repeat `--vscode-target` to set multiple targets, including a separate Copilot location if needed:

```bash
node dist/instruction-sync.mjs configure --vscode-target /home/example/.config/Code/User/instructions/agent-policy.instructions.md --vscode-target /home/example/.copilot/instructions/agent-policy.instructions.md
```

VS Code agents use exact directories rather than a guessed installation or user home. Each `directories` entry contains a lowercase `id` matching `[a-z][a-z0-9-]*` and an absolute `path`. The parser normalizes paths and rejects duplicate IDs or equivalent paths, including case aliases on Windows. All configured directories receive the same native profiles. `--vscode-target` is invalid for agent-sync, and `--vscode-agent-dir` is invalid for instruction-sync.

For example, preview an existing Windows Insiders profile from WSL:

```bash
node dist/agent-sync.mjs configure --vscode-agent-dir 'insiders=/mnt/c/Users/example/AppData/Roaming/Code - Insiders/User/prompts' --enable-vscode
```

Repeat with `--apply` only after reviewing configuration. Then run `doctor`, `sync --dry-run` and targeted `adopt --dry-run` for divergent existing files. Adoption replaces their prompt bodies with canonical responsibilities and native procedures, with recovery backups on application. It does not import local prompt bodies into canonical sources.

Destination discovery depends on the selected VS Code runtime. Local sessions read profile storage such as `Code - Insiders/User/prompts`. Copilot Agent Host uses `~/.copilot/agents` on the machine running that host instead of profile user data. A Windows host therefore uses its Windows home, while a WSL or remote host uses its own home. See [VS Code's customization migration documentation](https://code.visualstudio.com/docs/agent-customization/migrate-customizations). Add another named directory explicitly when needed; the synchronizer does not migrate files, discover runtime hosts or change VS Code settings.

Agent target IDs are `vscode-<directory-id>-agent-<role-id>`. Directory names and role IDs that produce an ambiguous target identity are rejected before writes. Disabling or moving a directory preserves its prior files and ownership. Unknown local agents remain unmanaged.

Zed receives personal `AGENTS.md` in each configured home. Typical homes are `%APPDATA%\Zed` on Windows and `~/.config/zed` on Linux. For WSL and a second Linux home:

```bash
node dist/instruction-sync.mjs configure --zed-home /mnt/c/Users/example/AppData/Roaming/Zed --zed-additional-home linux=/home/example/.config/zed --enable-zed
```

These examples preview settings. Repeat the intended command with `--apply` to save them. Zed external agents have their own instruction mechanisms.

### Ownership state locations

State is local and separate from configuration. The default platform-specific root contains `instructions/state.json` and `agents/state.json`:

| Platform | Default state root |
| --- | --- |
| Linux / WSL | `$XDG_STATE_HOME/agent-policy`, otherwise `~/.local/state/agent-policy`. |
| Windows | `%LOCALAPPDATA%\agent-policy`, otherwise `~\AppData\Local\agent-policy`. |
| macOS | `~/Library/Application Support/agent-policy`. |

Each state file keeps schema version `1` and target IDs, paths and SHA-256 ownership hashes. Agent records also identify the managed agent directory. `--state` overrides the file for one invocation. Use the same override consistently, and never share a state file between commands. Backups are stored beside the selected state file under `backups/`.

To pause and resume agents independently:

```bash
node dist/agent-sync.mjs configure --disable --apply
node dist/agent-sync.mjs configure --enable --apply
```

Pausing only changes settings. Other operations on a disabled workflow exit `2` until it is enabled again.

## Instruction sources and outputs

Canonical global instructions live in the repository's [instructions directory](../../instructions/):

```text
instructions/invariant.md                  # shared operating rules
instructions/preferences.md                # shared personal guidance
instructions/technology-defaults.md        # conditional technology choices
instructions/<harness>/system/*.md         # harness operating modules
instructions/<harness>/agents/*.md         # harness personal guidance modules
instructions/pi/APPEND_SYSTEM.md           # dedicated Pi append source
```

The operating layer combines `invariant.md` with that harness's system modules. Personal guidance combines `preferences.md`, `technology-defaults.md` and its agents modules. The three shared files are required. Harness module directories are optional. Regular `*.md` files directly within each module directory load in alphabetical filename order. Nested directories and other files are ignored. BOM and line endings are normalized, empty content is omitted, and nonempty sources are joined with one blank line.

| Harness | Operating layer | Personal guidance | Append source |
| --- | --- | --- | --- |
| Pi | First in `<agentDir>/APPEND_SYSTEM.md` | `<agentDir>/AGENTS.md` | After the operating layer in the same append file. |
| Codex | Managed `developer_instructions` block in `<home>/config.toml` | `<home>/AGENTS.md` | Excluded. |
| VS Code | Combined output at each configured target, with invariants and preferences sections and `applyTo: "**"` | Included in the same file. | Excluded. |
| Zed | Combined operating layer then personal guidance in `<home>/AGENTS.md` | Included in the same file. | Excluded. |

Pi retains its native system prompt. The synchronizer never creates `SYSTEM.md` and retires its former managed output through the protected transition below. Source separation does not grant system or developer priority to VS Code or Zed files. Instructions express intended behavior, which should be checked separately in a fresh harness session.

### Module tags and validation

Harness modules receive tags derived from their source identity. `pi/system/specific-tools.md` becomes `<pi_system_specific_tools>`. Remove the final `.md` and replace every non-ASCII-letter/digit/underscore character with `_`, preserving case. The generated wrapper has no attributes and keeps blank lines around the Markdown content:

```markdown
<pi_system_specific_tools>

Module content goes here.

</pi_system_specific_tools>
```

Nonempty modules that produce the same tag are rejected. Module content must not contain opening or closing tags in the reserved `<harness>_<system|agents>_<module>` namespace. Keep canonical sources as plain Markdown without generated wrappers. Shared files and the Pi append source have no generated tags.

The introduction `Follow the instructions in the tagged modules below.` appears once when a harness has nonempty modules. Pi places it in `APPEND_SYSTEM.md` and Codex in `developer_instructions`, covering their separate personal guidance files. VS Code and Zed include it in their combined output.

Markdown directly under `instructions/<harness>/` is rejected except the exact `pi/APPEND_SYSTEM.md` source. Move old modules into `system/` or `agents/` and rename `pi/append-system.md` to `pi/APPEND_SYSTEM.md`. A missing dedicated append source leaves the operating layer in the managed Pi append file. A `"""` delimiter in Codex's operating layer blocks rendering, while Codex personal guidance remains plain Markdown without this restriction.

### Codex managed region

Only the marked operating block in `config.toml` is owned by instruction synchronization:

```toml
# >>> agent-policy developer_instructions >>>
developer_instructions = """
Generated operating instructions.
"""
# <<< agent-policy developer_instructions <<<
```

Other settings are preserved. An existing unmanaged `developer_instructions` assignment requires explicit adoption. The supported adoption form is a multiline TOML basic string with its opening and closing delimiters on separate lines. Unsupported assignments or malformed managed markers fail validation. The global `AGENTS.md` and other standalone instruction outputs are owned as whole files.

### Transition existing Pi instructions

`pi-system` is now a retirement target for `<agentDir>/SYSTEM.md`, not a generated prompt. With Pi enabled, sync removes it only when the recorded path and ownership hash match. Removal receives a recovery backup and shares the transaction with the append update and state. If the owned file is already absent, sync forgets its record and never recreates it. An absent unowned file stays absent. A modified or unmanaged file blocks all instruction writes, as does ownership at a different path. Disabling Pi leaves its files and records untouched.

Review the existing files and run `instruction-sync sync --dry-run` before applying. For a Pi-only transition, use a separate instruction configuration with Pi enabled and Codex, VS Code and Zed disabled. Preserve the instruction ownership state, including the old `pi-system` record. Use a copy of that state for isolated previews, and the original state for an authorized application. Never use agent-sync or an empty state to bypass an instruction conflict.

If the old system content contains independent changes, retain them in the appropriate canonical sources before any deletion. After reviewing the exact file to retire, `instruction-sync adopt --target pi-system --dry-run` previews ownership adoption. The same command with `--apply` records its current hash without deleting or replacing it. A subsequent reviewed sync backs up and removes it. An independently modified `pi-append-system` still requires its ordinary source review and explicit adoption. Apply with the same scoped configuration and original instruction state only after reviewing a fresh dry-run.

Target and ownership-state backups must be recovered together. Restoring `SYSTEM.md` makes Pi use a replacement prompt again. After transition, repeated sync is idempotent. Repository-local `SYSTEM.md`, explicit CLI prompt overrides and extension mutations are outside this global-output transition, so qualification in a real provider session remains a separate check. See [ADR-006](../../docs/decisions/006-additive-pi-instructions.md).

## Agent sources and outputs

Canonical specialist definitions live in the repository's [agents directory](../../agents/), separately from `instructions/<harness>/agents/`:

```text
agents/pi.md                      # optional instructions for every Pi subagent
agents/codex.md                    # optional instructions for every Codex subagent
agents/vscode.md                   # optional instructions for every VS Code agent
agents/<role>/role.md              # required shared responsibilities
agents/<role>/agent.json           # required metadata and native settings
agents/<role>/pi.md                # optional Pi procedures
agents/<role>/codex.md             # optional Codex procedures
agents/<role>/vscode.md            # optional VS Code procedures
```

Every role requires a nonempty shared description, a nonempty role prompt and at least one native `pi`, `codex` or `vscode` section. An absent section produces no profile for that harness. Role directory IDs must match `[a-z][a-z0-9-]*`. Pi and Codex profiles require safe, unique native names consisting of letters, digits, underscores or hyphens and starting with a letter or digit. VS Code display names can contain spaces and default to the role ID; duplicate names are rejected.

### Define a role

For example, create `agents/example-reviewer/role.md` with the role's responsibilities and this `agent.json`:

```json
{
  "description": "Reviews code and reports evidence without editing application files",
  "pi": {
    "name": "example-reviewer",
    "tools": ["@inspect", "mcp:context7"],
    "thinking": "high",
    "inheritSkills": false,
    "turnBudget": "{ \"maxTurns\": 20 }"
  },
  "codex": {
    "name": "example_reviewer",
    "model": "gpt-6-luna",
    "model_reasoning_effort": "high",
    "sandbox_mode": "read-only",
    "mcp_servers": {
      "docs": {
        "command": "node",
        "args": ["${paths.exampleDocsScript}"],
        "env_vars": ["DOCS_TOKEN"],
        "enabled_tools": ["search"]
      }
    }
  }
}
```

Add `exampleDocsScript` with the absolute script path to your local configuration's `paths` map before enabling this Codex profile. Tool groups and MCP selectors in this example must already exist in the relevant harness. The synchronizer does not install or resolve those tools. Use native environment references for credentials rather than committing secret values.

Descriptions inherit `agent.json.description`. Add a native description only when responsibilities or selection criteria materially differ. Formatting and native tool procedures do not justify a separate description.

The loader composes each prompt once in this order: harness-wide shared instructions, shared `role.md`, then the role's native supplement. Optional missing or empty shared files add no content. Put shared alias semantics in `agents/pi.md` and keep actual group membership in Pi's tool registry. Role supplements own native procedures, and native renderers serialize the resulting prompt without translating settings between harnesses.

### Native output and identity

| Harness | Destination | Filename | Prompt |
| --- | --- | --- | --- |
| Pi | `<agentDir>/agents/` | `<pi.name>.md` | Markdown body after native frontmatter. |
| Codex | `<home>/agents/` | `<role-directory>.toml` | Composed `developer_instructions`. Native `codex.name` remains authoritative. |
| VS Code | Exact named directory | `<role-directory>.agent.md`, or explicit `vscode.fileName` | Markdown body after YAML frontmatter. Native display names are independent of filenames. |

Role directory IDs are stable ownership identities. For example, `browser-tester` produces `browser-tester.md` in Pi and `browser-tester.toml` in Codex, with Codex native name `browser_tester`. Renaming a role ID into an existing managed filename blocks synchronization rather than deleting a path still generated. Plan identity/path changes as an explicit migration.

### Supported native settings

The owning [agent module](src/agents.ts) validates supported settings before writes. Unsupported or unrepresentable data fails rather than being silently dropped. Adding a native setting requires extending that validator and rendering coverage.

Pi accepts scalar frontmatter fields and scalar extension fields. Native list fields such as `tools`, `excludeTools`, `skills`, `allowedAgents`, `extensions` and `mutationTools` accept comma-separated strings or arrays of strings. Arrays render as comma-separated lists, and an item cannot be blank or contain commas or newlines. Boolean controls such as `inheritProjectContext`, `inheritSkills`, `interactive` and `completionGuard` accept booleans or the strings `"true"` and `"false"`. Encode nested extension JSON as a string, as shown for `turnBudget`. Invalid frontmatter keys or values that cannot survive the installed parser's format are rejected. Native `@group` and `mcp:` selectors remain unchanged.

Pi output must preserve values through both Pi core's YAML parser and pi-subagents' simple frontmatter parser. Strings use quotes without escapes or literal blocks because pi-subagents does not decode YAML escapes. The renderer rejects control characters, multiple trailing newlines in metadata, and leading whitespace in metadata requiring a literal block when the two parsers cannot preserve them identically. These restrictions apply to frontmatter, not the Markdown prompt body. Invalid metadata blocks synchronization before any target is written.

Codex supports the following top-level fields:

| Category | Fields |
| --- | --- |
| Identity | `name`, optional `description`, `nickname_candidates` |
| Model | `model`, `model_provider`, `model_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`, `service_tier`, `model_context_window`, `model_max_output_tokens` |
| Permissions | `sandbox_mode`, `approval_policy`, `sandbox_workspace_write` |
| Native controls | `web_search`, `tools`, `skills`, `mcp_servers` |

The renderer owns `developer_instructions`, so supply prompt content through Markdown rather than this JSON key. `tools` accepts boolean `web_search` and `view_image` controls, not an arbitrary tool-name allowlist. `web_search` accepts `disabled`, `cached` or `live`. `sandbox_mode` accepts `read-only`, `workspace-write` or `danger-full-access`. Approval policy accepts `never`, `on-request`, `on-failure`, or a `granular` object with boolean `sandbox_approval`, `rules`, `mcp_elicitations`, `request_permissions` and `skill_approval` controls. Skills use `skills.config` entries with a `path` and boolean `enabled`. `sandbox_workspace_write` supports `writable_roots`, `network_access`, `exclude_tmpdir_env_var` and `exclude_slash_tmp`.

Each native MCP server can define either a process (`command`, `args`, `cwd`) or URL transport (`url`), with optional enablement, required status, timeouts, authentication and environment/header settings. Supported tool selection is `enabled_tools` / `disabled_tools`. Per-tool settings use `tools.<name>.approval_mode` and `output_token_limit`, with approval modes `auto`, `prompt`, `writes` or `approve`. Credential references include `env_vars`, `bearer_token_env_var` and `env_http_headers`. See the explicit validator for the complete nested field list. Parsing a profile does not establish model availability, tool availability, MCP startup or authentication.

VS Code profiles support `name`, `description`, `argument-hint`, `tools`, `agents`, `model`, `user-invocable` and `disable-model-invocation`. Tools are arrays of nonempty native tool names or MCP selectors such as `docs/*`. Models are a nonempty string or nonempty ordered array of model names. Omitting `model` uses the runtime's selected model. Agents accept `*` or a list of nonempty display names; `[]` disables subagent use. When allowing subagents with an explicit tools list, include the `agent` tool. Visibility controls require actual booleans. Unsupported native fields fail before writes rather than being silently omitted. See [VS Code's native field documentation](https://code.visualstudio.com/docs/agent-customization/custom-agents#header-optional).

Optional `vscode.fileName` is synchronizer metadata, not frontmatter. It must be a basename ending in `.agent.md`, with letters, digits, underscores or hyphens before the suffix and a letter or digit first. It preserves existing aliases such as `codebase-scout.agent.md` while the canonical role remains `scout` and its display name remains `Scout`. Otherwise output uses the role ID as its filename. YAML uses deterministic sorted keys and quoted values while preserving model order and booleans.

The initial VS Code profiles preserve the native model lists, tools, names and subagent references from the ten matching Insiders definitions. Shared canonical responsibilities replace divergent local prompt bodies. New review roles use the Code Reviewer model list with `read` and `search`; Quick Worker and Test Engineer use Worker model and tool settings; Browser Tester uses QA Tester settings. New profiles disable delegation with `agents: []`. Model strings are configuration choices, not evidence that a provider is installed or available. Browser Tester uses the available browser CLI through terminal tools. Terminal access cannot enforce a prohibition on application edits. Validate actual discovery, model selection and tools in the intended VS Code session after adoption.

### Current catalog

The selected catalog has 18 canonical roles, producing 16 Pi profiles, 18 profiles in every Codex home and 18 profiles in every enabled VS Code agent directory.

| Availability | Roles |
| --- | --- |
| Pi, Codex and VS Code | api-reviewer, architect, browser-tester, code-reviewer, factual-researcher, librarian, oracle, performance-reviewer, pi-expert, qa-tester, quick-reviewer, quick-worker, security-reviewer, style-reviewer, test-engineer, videographer |
| Codex and VS Code | scout, worker |
| Local Pi definitions outside management | sdd-orchestrator, orchestration-assessor |
| Local Insiders definitions outside management | atlas-orchestrator, metis, quick-plan |

Worker and scout preserve Pi's packaged definitions. Librarian is explicitly provided to both harnesses. Pi's oracle keeps its native name `oh-my-oracle`. Browser validation and debugging share one role. Pi keeps `browser-tester`, Codex uses `browser_tester`, and Pi's version-1 JSON reporting contract applies when the caller supplies that schema. The previous Codex `browser-debugger.toml` files were retired through backed-up migration.

### Retire a legacy Codex file

Add its exact basename to `retiredAgents` for the intended home in `agents.config.json`. For example:

```json
{
  "id": "windows",
  "home": "/mnt/c/Users/example/.codex",
  "retiredAgents": ["explore.toml"]
}
```

This is an entry inside `harnesses.codex.additionalHomes`, not a complete configuration. For the primary home, put `retiredAgents` directly on `harnesses.codex`. Review the target ID, adopt it, then sync:

```bash
node dist/agent-sync.mjs doctor
node dist/agent-sync.mjs adopt --target codex-windows-agent-retired-explore --dry-run
node dist/agent-sync.mjs adopt --target codex-windows-agent-retired-explore --apply
node dist/agent-sync.mjs sync --dry-run
node dist/agent-sync.mjs sync
```

Adoption records the current retired file's hash without deleting it. Sync checks ownership again, backs up the file and removes it. Remove the retirement entry afterward. A file still generated by an active role cannot also be retired.

## Ownership, conflicts and recovery

### Target status

| Status | Meaning | Normal action |
| --- | --- | --- |
| `current` | Generated content matches recorded ownership, or a retired file is already absent without ownership. | No change. |
| `missing` | An unowned output does not exist. | Sync creates it. |
| `untracked` | Existing output matches canonical content but has no ownership record. | Sync records ownership without replacing the file. |
| `stale` | Canonical sources changed while managed target content stayed unchanged. | Sync updates it with a backup. |
| `conflict` | Existing output diverges, a managed file/region disappeared, or ownership points elsewhere. | Review and explicitly adopt or restore the expected content. |
| `obsolete` | A removed/retired target has eligible ownership, including an already absent file with a remaining record. | Sync removes the file if present and forgets its ownership. |

`doctor` and `check` print these statuses with IDs and paths. During `sync`, a conflict blocks all writes in that command's transaction, including unrelated targets within the same domain. Targeted `adopt` changes only its selected targets and leaves unselected ownership conflicts unresolved. Source validation still runs before either operation. A missing previously managed file is a conflict, not permission to recreate it automatically.

### Safe writes and removals

One shared transaction handles configuration, import, target changes, deletions and state writes. It checks input snapshots, creates private recovery copies for replaced/deleted content, writes via temporary files and atomic rename, and rolls back completed changes on failure. Deletions are restored during rollback, and newly created files are removed. Concurrent changes are checked again before each write. Backups and new files use private permissions where supported by the filesystem. Rollback errors are reported with recovery paths.

Applied operations report changed targets first and summarize backup directories. A successful repeated sync makes no changes. If only ownership changes, the command may report no target file changes even though state was updated.

Agent source removal schedules deletion only inside enabled, currently configured output directories. The record must point to the same directory/path and its ownership hash must match current normalized content. Independent edits block deletion and sibling writes. Unmanaged files outside explicit adoption/retirement targets remain untouched. Moving or disabling a harness preserves its old files and records. Instruction targets do not have general obsolete-file deletion. The explicit `pi-system` retirement below is the only instruction removal target.

To keep an agent local while removing it from canonical management, back up its native file and the agent state, then explicitly release its ownership record as part of that migration before removing its source/profile. There is no release command. Removing the canonical source alone schedules deletion on the next sync.

### Recover from a failed operation

Read the reported error and backup directory first. A normal transaction failure rolls back completed writes. If rollback reports failures, recover the affected target contents and corresponding ownership state from that transaction's `.bak` files, then run `doctor` and preview sync before applying again. Backups are content snapshots, not a restore command or an automatic merge. Do not delete ownership state to bypass a conflict because doing so discards protection for managed outputs.

For a missing managed file, either restore its previous content and sync or explicitly adopt its conflicted target to recreate canonical output. For independent edits you want to retain, update the appropriate canonical source before adopting the target. For `Codex developer_instructions is unmanaged`, use the instruction adoption flow only after reviewing the assignment and its supported multiline-string form.

## Legacy migration

The former `dist/harness-sync.mjs` interface prints replacement commands and performs no synchronization. An invocation requesting work exits `2`. Import the combined settings and ownership into each workflow independently:

```bash
node dist/instruction-sync.mjs configure --import-legacy --dry-run
node dist/agent-sync.mjs configure --import-legacy --dry-run
node dist/instruction-sync.mjs configure --import-legacy --apply
node dist/agent-sync.mjs configure --import-legacy --apply
```

By default, import reads the old adjacent `config.json` and `state.json` at the platform-specific `agent-policy` root. If those inputs are elsewhere, supply overrides. For example, preview an instruction import:

```bash
node dist/instruction-sync.mjs configure --import-legacy --legacy-config /absolute/path/to/legacy/config.json --legacy-state /absolute/path/to/legacy/state.json --config /absolute/path/to/new/instructions.config.json --state /absolute/path/to/new/instructions/state.json --dry-run
```

Use the same arguments with `--apply` instead of `--dry-run` after review. Legacy inputs and new destinations must use distinct paths. A missing legacy state is treated as empty ownership, while the legacy configuration must exist. Missing configuration triggers setup guidance during ordinary commands, and a schema-version-1 combined configuration requires import rather than direct use.

Import partitions ownership using agent directory metadata. It preserves destinations, target IDs, paths, hashes, disabled workflows, named homes and applicable retirement settings. Runtime target files and instruction markers remain untouched. The original inputs stay in place and receive private recovery copies when changes are applied. Divergent destination configuration or state blocks the entire import. An identical repeated import makes no changes. The shared transaction rolls back incomplete imports.

Apply imports before using regular configure flags to change settings, then add the local path bindings before syncing the current Codex catalog. When legacy agent synchronization was disabled, enable it explicitly afterward:

```bash
node dist/agent-sync.mjs configure --enable
node dist/agent-sync.mjs configure --enable --apply
```

## Package maintenance

Runtime use needs only Node 24+. Maintenance uses the established Bun 1.3.14 toolchain and a locally available TypeScript compiler. From this directory:

```bash
bun test
bun run typecheck
bun run build
bun run verify:dist
```

| Check | Purpose |
| --- | --- |
| `bun test` | Rendering, configuration, CLI, migration and transaction coverage through real modules. |
| `bun run typecheck` | Check TypeScript without emitting files. |
| `bun run build` | Generate both standalone Node commands and the legacy replacement stub. |
| `bun run verify:dist` | Rebuild in a temporary directory, compare each artifact and check its Node help entrypoint. |

Native TOML tests need Python 3.11+ for an independent `tomllib` parser. Pi parser integration uses installed `pi-subagents` and `@earendil-works/pi-coding-agent` packages at their default user locations, or package roots supplied by `PI_SUBAGENTS_DIR` and `PI_CORE_PACKAGE_DIR`. Integration tests skip when their parsers are absent. Before deploying Pi agent changes, run `bun test tests/pi-frontmatter.integration.test.ts` with both parsers present and no skipped tests. These are validation requirements, not dependencies of the distributed CLIs. Static checks do not establish live agent behavior or MCP startup/authentication.

Agent tests use temporary catalogs and assert that rendering preserves their configured values and prompt bodies. Do not pin the names, count, model choices, or wording of the personal catalog under `agents/` in standard tests.

Keep shared rules centralized: the two thin entrypoints in [src/instruction-sync.ts](src/instruction-sync.ts) and [src/agent-sync.ts](src/agent-sync.ts) bind a fixed domain and call [src/commands.ts](src/commands.ts). Configuration/state validation, migration, planning and file transactions each have one owning module. Native agent validation, path resolution and rendering stay in [src/agents.ts](src/agents.ts), and instruction rendering in [src/renderers.ts](src/renderers.ts). Both standalone bundles embed the same shared source implementation for independent Node execution. Rebuild generated artifacts rather than editing them directly.

Architecture rationale is recorded in [ADR-001: synchronization safety](../../docs/decisions/001-cross-harness-instruction-synchronization.md), [ADR-002: instruction layers](../../docs/decisions/002-explicit-harness-instruction-layers.md), [ADR-003: native agents](../../docs/decisions/003-native-agent-synchronization.md), [ADR-004: separate commands and shared mechanisms](../../docs/decisions/004-separate-synchronization-commands.md) [ADR-005: local agent path bindings](../../docs/decisions/005-local-agent-path-bindings.md) and [ADR-006: additive Pi instructions](../../docs/decisions/006-additive-pi-instructions.md).
