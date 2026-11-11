# ADR-011: Synchronize a managed subset of global Codex MCP servers

Status: Accepted. Extends [ADR-003](003-native-agent-synchronization.md) and [ADR-009](009-codex-managed-region-hardening.md) without changing the shared transaction, adoption or ownership model.

Date: 2026-11-07

## Context

Codex reads global MCP servers from `[mcp_servers.<id>]` tables in `~/.codex/config.toml`. The same file also carries `developer_instructions`, providers, agents, hooks and other machine-local settings. The existing `codex-config` target already owns the `developer_instructions` assignment in that file.

Current Codex documentation states that `mcp_servers` in a custom agent file does not override the parent session’s MCP configuration. The existing per-agent `mcp_servers` entries therefore cannot act as the authoritative source for shared servers. Global `config.toml` is the documented location.

The current `codex-config` ownership hash covers only the `developer_instructions` block. Any new MCP region must preserve that existing state until the registry is first introduced.

## Decision

### Add a canonical Codex registry

Add `mcp/codex.json` with the native shape:

```json
{
  "mcp_servers": {
    "context7": { "url": "https://mcp.context7.com/mcp" },
    "firecrawl-mcp": {
      "auth": "oauth",
      "url": "https://mcp.firecrawl.dev/v2/mcp-oauth"
    }
  }
}
```

Firecrawl uses its OAuth MCP endpoint and requires one browser sign-in through `codex mcp login firecrawl-mcp`; no API-key environment variable enters the canonical registry.

Load it as `codexMcp` in the instruction-domain canonical sources. Reuse the existing Codex MCP validator and TOML serializers rather than introducing a second schema or serializer.

### Extend the existing `codex-config` target

Do not create a second target for `config.toml`; two targets with the same path would violate the planner and transaction rules. The existing target owns both managed regions:

```toml
# >>> agent-policy developer_instructions >>>
developer_instructions = """..."""
# <<< agent-policy developer_instructions <<<

# >>> agent-policy mcp_servers >>>
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
# <<< agent-policy mcp_servers <<<
```

The ownership value is a composite of the developer block and the managed MCP block. When no managed MCP block exists, the value remains exactly the developer block so existing state stays current. Adding the registry makes the target `stale` rather than `conflict`; the first sync records the composite hash.

If `mcp/codex.json` is later removed, an existing managed MCP region is preserved and continues to participate in ownership. The tool does not silently delete it.

### Own only the managed subset

Only `[mcp_servers.*]` tables inside the MCP markers are owned. Unrelated global MCP tables outside the region remain local and untouched.

A canonical server name colliding with a table outside the managed region blocks synchronization. Explicit `adopt` removes only the colliding table with a recovery backup and preserves every unrelated outside table. Add shared servers to `mcp/codex.json`; keep machine-local or secret-bearing servers outside the managed region.

The renderer uses a focused TOML table scanner that handles comments, quoted keys, array-of-table headers and multiline strings. It identifies `mcp_servers` tables, determines whether they sit inside the marker range, and removes only explicit adoption collisions.

### Preserve Codex custom-agent MCP fields

Existing `codex.mcp_servers` entries remain accepted and unchanged. Documentation notes that current Codex treats the parent session’s MCP configuration as authoritative, so the global registry is the source of truth for shared servers. Retaining the fields avoids an unrelated catalog migration.

## Alternatives Considered

- **Own the whole `mcp_servers` namespace.** Matches Antigravity and OpenCode, but adoption would replace every global MCP server, including machine-local or secret-bearing servers. Rejected because `config.toml` is a shared user file.
- **Create a second target for the same `config.toml`.** Keeps state identities separate, but violates duplicate-path planning and the one-file transaction contract. Rejected.
- **Manage MCP in a separate file.** Codex does not provide an include mechanism for global MCP tables. Rejected.
- **Rely on per-agent `mcp_servers`.** Current Codex documentation says custom agent files do not override parent MCP configuration. Rejected.
- **Use the Codex CLI to add servers.** Moves mutation outside the planner, backups and rollback, and makes previews non-deterministic. Rejected.

## Consequences

- Codex joins Antigravity and OpenCode as a globally synchronized MCP registry.
- Existing developer-only state upgrades through a normal stale update.
- A conflict in either managed region blocks both updates for that Codex home, because both live in one target and one file transaction.
- Unrelated global MCP tables survive normal sync and adoption.
- Canonical-name collisions require explicit adoption and remove only the colliding table, with a backup.
- Shared MCP servers become available to the parent Codex session and therefore to custom agents through inheritance.
- Per-agent Codex `mcp_servers` entries remain inert under current Codex behavior and are retained for compatibility.
- The canonical registry rejects secret-like keys; credentials belong in environment variables or outside the managed region.
- The tool does not verify MCP startup, authentication, tool availability or model access.

## Validation Requirements

Cover deterministic table rendering, sorted server and field order, local and remote transports, nested fields, secret rejection, marker extraction and malformed markers. Use an independent TOML parser to verify generated output.

Cover preservation of unrelated tables, canonical-name collision detection, targeted adoption, backups, composite ownership, developer-only state upgrade, managed-region conflict blocking, stale canonical updates, missing-source preservation and idempotence. Finish with the package tests, typecheck, build, distribution verification and an isolated Codex configuration discovery check when the Codex CLI is available.
