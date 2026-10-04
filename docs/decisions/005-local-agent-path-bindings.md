# ADR-005: Local agent path bindings

Status: Accepted

Date: 2026-10-03

## Context

Three canonical agent definitions contained four machine-specific paths for an MCP entrypoint, a Pi project directory, an installed skill and a YouTube MCP entrypoint. Keeping these values in Git made shared definitions depend on one installation. Native output needs resolved paths while canonical role guidance and native configuration choices remain portable.

## Decision

Add an optional top-level `paths` map to schema-version-2 agent configuration. Its values are local, literal absolute paths for the Node platform. Names match `[A-Za-z][A-Za-z0-9_-]*`. Native string fields in tracked `agent.json` can reference a binding through the entire value `${paths.name}`. Nested references, NUL characters and embedded substitutions are rejected. The map belongs in the existing Git-ignored `agents.config.json`, and subsequent configuration changes preserve it. Instructions do not accept the setting.

The native agent module owns one recursive resolver used by both native renderers. It resolves explicit references without mutating canonical definitions, then validates the resolved settings before serialization. Resolution occurs only for profiles rendered into enabled harnesses. The existing target planner invokes these renderers for inspection, previews, synchronization and adoption, so path handling creates no parallel CLI or dry-run workflow. Role prompts and Markdown supplements are not templates, and ordinary environment references are not evaluated.

Missing bindings identify the agent, native field and binding name, exit with code 2 and block changes before the file transaction. Resolved content uses the existing ownership, backup, conflict and rollback rules. Each Codex profile is resolved once per configuration and shared across its configured homes, preserving identical output. File existence, MCP startup and authentication remain outside static rendering.

## Consequences

The canonical catalog references `piSessionRecallScript`, `piProjectDir`, `factualResearchSkill` and `youtubeServerScript`. Installations supply their values locally. Existing native files and ownership hashes stay unchanged when the local values equal the previous canonical paths. Moving an installation changes the local map and makes affected native files stale through normal synchronization.

Existing configurations without path references remain compatible without a `paths` field. Users of the current Codex catalog must add its four bindings before syncing. The example configuration and package README document this step. This change adds no dependency installation, runtime restart, global MCP management, per-home override hierarchy or tool compatibility layer.
