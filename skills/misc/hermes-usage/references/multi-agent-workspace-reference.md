# Multi-Agent, Workspace, And Sandboxing Reference

Use this reference when a user asks how to create multiple Hermes agents, move an OpenClaw-style agent/workspace model to Hermes, isolate personal/work agents, assign a profile to a project folder, run separate gateways, or understand profiles versus workspaces versus sandboxing.

Hermes' closest equivalent to an OpenClaw agent is a **profile**, not only a model alias. A profile is a separate Hermes home directory with its own config, `.env`, `SOUL.md`, memories, sessions, skills, cron jobs, gateway state, logs, and state database.

## Mental Model

| Concept                       | What it controls                                                                          | What it does not control                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Profile                       | Durable Hermes state: config, credentials, memory, sessions, skills, cron, gateway state. | It does not restrict filesystem access by itself.           |
| Workspace / working directory | Where terminal tools start. Controlled by `terminal.cwd`.                                 | It does not isolate secrets, memory, sessions, or gateways. |
| Sandbox / terminal backend    | Execution environment and filesystem boundary.                                            | It does not define agent identity or memory by itself.      |
| `SOUL.md`                     | Profile personality and standing instructions.                                            | It guides behavior but does not enforce access boundaries.  |
| Project `AGENTS.md`           | Workspace/project operating instructions.                                                 | It should not hold secrets or replace sandboxing.           |

Profiles are the right tool when identity, memory, skills, cron jobs, credentials, gateways, or provider defaults should not mix. `terminal.cwd` is the right tool when the same profile should start work in a specific project folder. Sandboxing is the right tool when the agent must be technically restricted from reading or mutating parts of the filesystem.

## Create A Specialized Agent Profile

Blank profile:

```bash
hermes profile create coder --description "Focused coding assistant for the main app."
coder setup --portal
coder config set terminal.cwd /absolute/path/to/project
coder doctor
coder chat
```

Using the explicit profile flag instead of the alias:

```bash
hermes -p coder setup --portal
hermes -p coder config set terminal.cwd /absolute/path/to/project
hermes -p coder chat
```

The generated alias is just `hermes -p <name>` under the hood. Every profile has its own home directory:

```text
default profile: ~/.hermes
named profile:   ~/.hermes/profiles/<name>
```

## Clone Choices

| Command                                                 | Copies                                                                     | Use when                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `hermes profile create agent`                           | Fresh profile with bundled skills.                                         | New role, clean memory, clean credentials.           |
| `hermes profile create work --clone`                    | Current `config.yaml`, `.env`, and `SOUL.md`; fresh sessions and memory.   | Same provider/tool setup, new identity or workspace. |
| `hermes profile create fork --clone-all`                | Config, credentials, SOUL, memories, sessions, skills, cron jobs, plugins. | Backup or fork of an already trained agent.          |
| `hermes profile create work --clone --clone-from coder` | Config/env/SOUL from another profile.                                      | New profile based on a specific existing profile.    |

If Honcho memory is enabled, the docs say `--clone` creates a dedicated AI peer for the new profile while sharing the same user workspace. Still validate what the new profile remembers.

## Configure Identity And Instructions

Profile identity belongs in the profile's `SOUL.md`:

```bash
notepad ~/.hermes/profiles/coder/SOUL.md
# or on Linux/macOS:
nano ~/.hermes/profiles/coder/SOUL.md
```

Project/workspace rules belong in the project directory, commonly as `AGENTS.md`:

```text
/absolute/path/to/project/AGENTS.md
```

Changes to `SOUL.md` take effect cleanly in a new session. Existing sessions may still carry old prompt state, so start a new session after changing identity or workspace rules.

## Set The Workspace With `terminal.cwd`

Set an absolute path when the profile should always start in a project:

```bash
coder config set terminal.cwd /absolute/path/to/project
coder config show
coder chat -q "Run pwd, then summarize the project instructions."
```

Config shape:

```yaml
terminal:
  backend: local
  cwd: /absolute/path/to/project
```

Important rules from the docs:

- `cwd: "."` means the directory Hermes was launched from, not the profile directory.
- Asking the model what directory it is in is not a reliable isolation test; verify with a terminal tool or a diagnostic command.
- `SOUL.md` can guide the model to stay in a workspace, but it does not enforce that boundary.

## Run Separate Gateways

Each profile can run its own gateway process and service:

```bash
coder gateway start
assistant gateway start

coder gateway install
assistant gateway install
```

Each profile has its own `.env`; configure distinct bot tokens per profile:

```bash
coder config env-path
assistant config env-path
```

Hermes has token locks for Telegram, Discord, Slack, WhatsApp, and Signal: if two profiles accidentally use the same supported bot token, the second gateway should be blocked with an error naming the conflicting profile. Still design a deliberate channel cutover rather than relying on the lock as the plan.

## Sandboxing And Trust Boundaries

Profiles are not sandboxes. On the default local terminal backend, the agent has the same filesystem access as the user account running Hermes.

Use profiles for state isolation:

- different API keys
- different memories and sessions
- different skills
- different cron jobs
- different gateway tokens
- different personalities

Use sandboxing or OS-level isolation for access boundaries:

- `terminal.backend: docker` or another constrained backend when available
- separate OS users for stronger filesystem separation
- separate hosts or containers for mutually untrusted agents
- narrow toolsets and approval policy for shared/public agents

Example Docker-oriented profile config:

```yaml
terminal:
  backend: docker
  cwd: /workspace
  docker_image: nikolaik/python-nodejs:python3.11-nodejs20
```

Verify exact installed backend keys with:

```bash
coder config show
coder doctor
hermes setup terminal
```

## Multi-Agent Patterns

| Goal                                | Recommended Hermes shape                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Work and personal assistants        | Two profiles with separate `.env`, `SOUL.md`, memories, and gateways.                             |
| Same assistant in multiple repos    | One profile, launch from repo root or set `terminal.cwd` per task.                                |
| Durable repo-specific assistant     | One profile per repo, each with `terminal.cwd` set to that repo.                                  |
| OpenClaw-style specialized agents   | One Hermes profile per old agent, plus copied project/workspace files and manual gateway routing. |
| High-risk public bot                | Separate profile plus narrow tools, token allowlists, and preferably container/host isolation.    |
| Mutually untrusted users or clients | Separate OS users, containers, hosts, or deployments; do not rely on profiles alone.              |

## Profile Distribution

Profiles can be shared as distributions. A distribution can include `SOUL.md`, config, skills, cron jobs, and MCP connections. Credentials, memories, and sessions remain per-machine.

```bash
hermes profile install github.com/you/research-bot --alias
hermes profile update research-bot
```

Use distributions for reusable agent templates; use profile export/import for local backup or moving one concrete profile:

```bash
hermes profile export coder -o coder.tar.gz
hermes profile import coder.tar.gz --name coder-restored
```

## Validation Checklist

Before calling a profile ready:

```bash
hermes profile list
hermes profile show coder
coder config show
coder doctor
coder skills list
coder gateway status
coder chat -q "Run pwd and list the project instruction files you can see."
```

Then validate the agent role:

- It starts in the intended `terminal.cwd`.
- Its `SOUL.md` reflects the intended identity.
- Its project `AGENTS.md` or equivalent workspace instructions are visible.
- Its skills list is appropriate for the role.
- Its `.env` contains only credentials intended for that profile.
- Its gateway uses distinct tokens or an intentional routing plan.
- Its sandbox/backend matches the trust boundary.

## Common Mistakes

- Creating a profile and assuming it cannot access the rest of the filesystem.
- Setting `SOUL.md` but forgetting `terminal.cwd`, then wondering why tools start in the launch directory.
- Using `--clone-all` when the goal was a fresh identity with the same model config.
- Reusing one Telegram/Discord/Slack token across profiles.
- Editing `SOUL.md` and testing in an old session.
- Migrating OpenClaw multi-agent routing and assuming Hermes profiles automatically recreate channel bindings.