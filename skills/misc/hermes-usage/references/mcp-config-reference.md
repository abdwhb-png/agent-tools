# Hermes MCP Config Reference

Hermes can both consume MCP servers and run as an MCP server. Use this reference for `mcp_servers:` in `config.yaml` and `hermes mcp` commands.

## CLI Surface

```bash
hermes mcp <subcommand>
```

Subcommands:

| Subcommand                                                         | Purpose                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| none / `picker`                                                    | Interactive catalog picker for Nous-approved MCPs. Browse, install, enable, disable. |
| `catalog`                                                          | List Nous-approved MCPs in plain scriptable form.                                    |
| `install <name>`                                                   | Install a catalog entry, for example `hermes mcp install n8n`.                       |
| `serve [-v                                                         | --verbose]`                                                                          | Run Hermes as an MCP server, exposing conversations to other agents. |
| `add <name> [--url URL] [--command CMD] [--args ...] [--auth oauth | header]`                                                                             | Add custom MCP server with automatic tool discovery.                 |
| `remove <name>` / `rm`                                             | Remove server from config.                                                           |
| `list` / `ls`                                                      | List configured servers.                                                             |
| `test <name>`                                                      | Test connection to server.                                                           |
| `configure <name>` / `config`                                      | Toggle tool selection for server.                                                    |
| `login <name>`                                                     | Force OAuth re-authentication for OAuth MCP server.                                  |

## Config Root

MCP servers are configured under `mcp_servers:` in `~/.hermes/config.yaml`, keyed by server name.

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
```

## Shared Fields

| Field                          | Applies to | Purpose                                       |
| ------------------------------ | ---------- | --------------------------------------------- |
| `enabled`                      | all        | Enable/disable server.                        |
| `timeout`                      | all        | Tool call timeout.                            |
| `connect_timeout`              | all        | Initial connection timeout.                   |
| `supports_parallel_tool_calls` | all        | Allow concurrent tool calls from this server. |
| `tools`                        | all        | Tool/resource/prompt filtering policy.        |

## Stdio Servers

Fields:

| Field     | Purpose                               |
| --------- | ------------------------------------- |
| `command` | Executable to launch.                 |
| `args`    | Subprocess arguments.                 |
| `env`     | Environment variables for subprocess. |

Example:

```yaml
mcp_servers:
  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      resources: false
      prompts: false
```

Operational notes:

- Prefer environment references over plaintext secrets.
- Pin package versions for reproducible and auditable MCP startup when possible.
- Stdio servers execute local processes, so review package provenance and command arguments.

## HTTP / Streamable HTTP / SSE Servers

Fields:

| Field         | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `url`         | Endpoint URL.                                                          |
| `headers`     | Request headers.                                                       |
| `ssl_verify`  | TLS verification; bool or certificate path/string depending on server. |
| `client_cert` | mTLS client certificate path or details.                               |
| `client_key`  | Client private key path when `client_cert` is a string.                |

Examples:

```yaml
mcp_servers:
  stripe:
    url: "https://mcp.stripe.com"
    headers:
      Authorization: "Bearer ${STRIPE_MCP_TOKEN}"
    tools:
      exclude: [delete_customer, refund_payment]
```

```yaml
mcp_servers:
  internal_api:
    url: "https://mcp.internal.example.com/mcp"
    client_cert: "~/secrets/mcp-client.pem"
```

Security notes:

- `ssl_verify: false` compromises TLS security; use only for local test endpoints or a controlled temporary debug step.
- Treat remote MCP tool descriptions as untrusted. Use allowlists for high-impact environments.
- Avoid broad authorization headers for servers that expose destructive tools.

## Tool Filtering Policy

`tools` controls server-native tools and, according to docs examples, can also disable resources/prompts.

Patterns:

```yaml
mcp_servers:
  github:
    tools:
      include: [list_issues, create_issue, update_issue, search_code]
      resources: false
      prompts: false
```

```yaml
mcp_servers:
  stripe:
    tools:
      exclude: [delete_customer, refund_payment]
```

Use include lists for production or public-facing agents. Use exclude lists only when the safe surface is broad and a few operations are clearly risky.

## Recommended Workflows

Catalog install:

```bash
hermes mcp catalog
hermes mcp install n8n
hermes mcp list
hermes mcp test n8n
hermes mcp configure n8n
```

Custom stdio server:

```bash
hermes mcp add github --command npx --args -y --args @modelcontextprotocol/server-github
hermes mcp test github
hermes mcp configure github
```

Custom remote server:

```bash
hermes mcp add stripe --url https://mcp.stripe.com --auth header
hermes mcp login stripe
hermes mcp test stripe
```

Run Hermes as MCP server:

```bash
hermes mcp serve --verbose
```

## Troubleshooting

| Symptom                             | Check                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Server missing                      | `hermes mcp list`, then inspect `mcp_servers:` in `config.yaml`.                                                |
| Connection failure                  | `hermes mcp test <name>`, check `connect_timeout`, URL/command, and credentials.                                |
| Tool unavailable                    | `hermes mcp configure <name>`, check `tools.include` / `tools.exclude`.                                         |
| OAuth server auth stale             | `hermes mcp login <name>`.                                                                                      |
| Local package vulnerability concern | `hermes security audit --skip-venv --skip-plugins` or include all surfaces with `hermes security audit --json`. |
| Secret leakage concern              | Move tokens into `.env` via `hermes config set`, then reference env vars in config.                             |

## Answering Guidance

When asked to configure MCP for Hermes:

1. Identify stdio vs remote HTTP/SSE.
2. Put command/args/env or url/headers in `mcp_servers:`.
3. Add `enabled`, timeouts, and filtering only when they change behavior.
4. Prefer allowlists for tools with side effects.
5. Test with `hermes mcp test <name>`.
6. Verify broad health with `hermes doctor` and `hermes config check`.