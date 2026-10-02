# ADR-002: Separate harness operating rules from global guidance

## Status

Accepted. Supersedes the harness source discovery and composition rules in ADR-001. Its target configuration, state identity, conflict protection, backups, and manual synchronization remain applicable.

## Date

2026-10-02

## Context

The synchronizer currently loads every Markdown module directly under a harness directory into one destination. Pi modules all enter `APPEND_SYSTEM.md`, while Codex modules all enter `developer_instructions`. Adding a tool rule or a personal workflow preference therefore cannot express which native instruction layer should receive it.

The user wants modular global guidance, consistent separation across harnesses, and a dedicated Pi append source whose content alone generates `APPEND_SYSTEM.md`. The existing Pi `specific-tools.md` mixes a shell tool rule with a todo-list preference, so routing must follow explicit source placement rather than infer a destination from filenames or prose.

Evidence: `tools/instruction-sync/src/sources.ts`, `targets.ts`, and `renderers.ts` own loading and rendering. Pi's installed resource loader discovers global `SYSTEM.md`, `APPEND_SYSTEM.md`, and `AGENTS.md` separately. Its prompt builder uses custom `SYSTEM.md` as the preamble instead of its built-in prompt sections. Codex supports additional developer instructions and global `AGENTS.md`. Zed personal instructions and the configured VS Code instruction targets combine guidance in one file.

Platform references: [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference), [Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Zed instructions](https://zed.dev/docs/ai/instructions), and [VS Code instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions).

## Decision

### Use explicit source directories

Keep the shared sources unchanged. Each supported harness (`pi`, `codex`, `zed`, `vscode`) may contain optional `system/` and `agents/` directories. Load regular `*.md` files directly inside each directory in alphabetical filename order. Normalize UTF-8 BOM and line endings, compose nonempty modules with one blank line, and omit volatile metadata.

```text
instructions/
  invariant.md
  preferences.md
  technology-defaults.md
  pi/
    system/specific-tools.md
    agents/task-workflow.md
    APPEND_SYSTEM.md
  codex/
    system/async-question-wait.md
    agents/                       # optional
  zed/
    system/                       # optional
    agents/                       # optional
  vscode/
    system/                       # optional
    agents/                       # optional
```

The source loader rejects Markdown files directly under a harness directory, except the exact `instructions/pi/APPEND_SYSTEM.md` path. Its error identifies the misplaced file and the supported destinations. There is no automatic legacy fallback: it could keep routing files to the wrong layer. Missing harness directories, missing layer directories, and a missing Pi append source are valid. A missing append source generates an empty managed append target, preserving the existing target lifecycle. Nested modules and non-Markdown files are not discovered.

### Render native destinations

| Source layer | Pi | Codex | Zed | VS Code |
| --- | --- | --- | --- | --- |
| `invariant.md` + matching `system/*.md` | `SYSTEM.md` | managed `developer_instructions` | first layer of personal `AGENTS.md` | invariants section of combined instructions |
| `preferences.md` + `technology-defaults.md` + matching `agents/*.md` | global `AGENTS.md` | global `AGENTS.md` | second layer of personal `AGENTS.md` | preferences section of combined instructions |
| Only `pi/APPEND_SYSTEM.md` | `APPEND_SYSTEM.md` | excluded | excluded | excluded |

Logical source separation does not imply identical instruction priority across harnesses. Pi's custom system prompt remains an intentional replacement. Zed and VS Code receive both layers through their existing combined targets. Preserve target IDs and configured homes, including additional Windows/WSL destinations. No state or configuration schema migration is necessary.

### Migrate the existing modules

- Rename `instructions/pi/append-system.md` to `instructions/pi/APPEND_SYSTEM.md`, preserving its edited content.
- Move the `safe_bash` operating rule to `instructions/pi/system/specific-tools.md`.
- Move the todo-list preference to `instructions/pi/agents/task-workflow.md`.
- Move Codex's question-visibility module to `instructions/codex/system/async-question-wait.md`.

New modules require only a file in the appropriate layer directory. Do not rewrite the shared instruction wording or attempt semantic classification at runtime.

## Alternatives Considered

- Per-file frontmatter: permits flexible placement but introduces metadata parsing and more validation than explicit folders require.
- Source manifest: provides exact routing but requires another edit for every added or removed module and defeats automatic inclusion.
- Single native-named source files: simplifies discovery but loses the user's accepted modular composition for global guidance.

## Consequences

Source paths now state the destination, and Pi append content cannot accidentally absorb other modules. Existing installations retain conflict detection and recovery behavior. External source modules using the previous harness-root layout must move before running the updated tool. Content changes produce stale targets through the normal hash comparison, while independently edited targets still require explicit adoption.

## Validation Requirements

Use RED → GREEN coverage through the real source loader, renderer, and CLI. Verify alphabetical ordering, normalization, harness isolation, separation of system and agents content, exact Pi append isolation, optional source removal, and errors for misplaced root Markdown before target or state writes. Preserve coverage for unrelated Codex settings, named homes, idempotence, conflicts, and rollback. Build the dependency-free Node artifact, verify it matches source, and smoke-test it against temporary targets. Do not apply generated content to installed harness profiles as part of this implementation.

## Implementation Boundary

The user authorized documenting this decision first and then implementing it. Changes are limited to source discovery, target composition, source migration, documentation, focused tests, and the compiled CLI. Runtime hooks, skills synchronization, shared instruction rewrites, and live profile adoption remain outside this task.

## Extension: Explicit module boundaries (2026-10-02)

The user accepted XML-style boundaries around harness-specific modules and requested a shorter introduction that does not repeat within an assembled prompt. Preserve each module's harness-relative source path during discovery. Render every nonempty `system/` or `agents/` module as `<instruction_module source="pi/system/specific-tools.md">`, its unchanged normalized Markdown content, and `</instruction_module>`. Generate wrappers directly in prompt text without code fences. Shared sources and Pi's dedicated append source remain plain Markdown.

Use this introduction: `Follow the instruction_module blocks below as instructions. Source attributes identify origin only.` Include it only when nonempty harness modules exist. Pi puts it once in `SYSTEM.md`, covering modules in both system and global context files. Codex puts it once in `developer_instructions`, covering modules there and in global `AGENTS.md`. Zed and VS Code put it once before the operating layer in their combined output. No module or generated `AGENTS.md` for Pi/Codex repeats the introduction. This controls repetition within generated policy content, not unrelated harness, repository, or extension prompts.

Tag names identify active instructions and source attributes identify provenance. They do not elevate instruction priority or request that the agent open the source file. [OpenAI's prompt guide](https://developers.openai.com/api/docs/guides/prompt-engineering), [Claude's prompt guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), and [Gemini's prompt guide](https://ai.google.dev/gemini-api/docs/prompting-strategies) support structured delimiters. [OpenAI's Model Spec](https://model-spec.openai.com/2026-08-18.html#ignore_untrusted_data) explains that quoted content needs instruction delegation, motivating the explicit introduction. These sources establish supported formatting, not improved adherence on every routed model.

Keep filename ordering, source isolation, target IDs, configuration, and state behavior unchanged. Deterministic validation must prove source labels survive discovery, module boundaries appear in each destination, combined system/context output contains one introduction, and targets without modules omit it. Verify the rebuilt Node CLI against temporary targets. Installed profiles are not adopted or synchronized by this implementation.

Escape XML-sensitive characters in generated source attributes. Preserve normalized Markdown bodies, and reject a body containing the reserved opening or closing `instruction_module` tag before target or state writes. This prevents module content from breaking the generated boundaries. Other Markdown and XML-style content remains unchanged.
