# Agent Workspace Migration

Use this reference when migrating OpenClaw's multi-agent/workspace model into Hermes. OpenClaw has `agents.list[]`, per-agent `workspace`, per-agent `agentDir`, channel bindings, skills, memory files, runtime policy, and sandbox/tool policy. Hermes does not import that whole structure into equivalent multi-agent objects automatically. The closest durable unit is a Hermes **profile**.

## Core Mapping

| OpenClaw concept                        | Hermes target                                           | Notes                                                                                        |
| --------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `agents.list[].id`                      | Hermes profile name                                     | Use stable lowercase slugs: `work`, `research`, `docs`.                                      |
| `agents.list[].workspace`               | Project/workspace directory plus profile `terminal.cwd` | Copy or preserve the workspace path, then run `<profile> config set terminal.cwd /abs/path`. |
| `agents.list[].agentDir`                | Profile home under `~/.hermes/profiles/<name>`          | Hermes owns this; do not copy OpenClaw runtime state wholesale.                              |
| `SOUL.md` / `IDENTITY.md`               | Profile `SOUL.md`                                       | Merge identity into one Hermes personality file.                                             |
| `AGENTS.md`                             | Project `AGENTS.md` in the workspace                    | Also pass `--workspace-target` during baseline migration when useful.                        |
| `USER.md` / `MEMORY.md` / `memory/*.md` | Profile memories                                        | Copy or migrate into `~/.hermes/profiles/<name>/memories/`. Validate with a new session.     |
| Workspace `skills/`                     | Profile skills, often `skills/openclaw-imports/`        | Audit and rewrite OpenClaw-specific assumptions.                                             |
| Agent skill allowlist                   | Per-profile installed/enabled skills and tool config    | Rebuild manually with `<profile> skills list` and `<profile> tools`.                         |
| Agent model/provider policy             | Per-profile `config.yaml` and `.env`                    | Use `profile model`, `profile config set`, or copied config with review.                     |
| Channel bindings                        | Per-profile gateway tokens and platform config          | No automatic binding parity; cut over channel by channel.                                    |
| Cron/triggers                           | Per-profile Hermes cron jobs                            | Recreate with the profile alias: `work cron create ...`.                                     |
| Sandbox/tool policy                     | Per-profile tools plus terminal backend                 | Profiles isolate state but do not sandbox local filesystem access.                           |

## Recommended Strategy

For a multi-agent OpenClaw install, do not rely on one global `hermes claw migrate` as the full migration. Use it as a baseline import/report, then rebuild each important agent as a Hermes profile.

High-level sequence:

1. Inventory OpenClaw agents, workspace paths, bindings, skills, and cron jobs.
2. Snapshot `~/.openclaw`.
3. Stop live OpenClaw services before cleanup or archival.
4. Run a baseline `hermes claw migrate --dry-run` and inspect archives.
5. Create one Hermes profile per durable OpenClaw agent identity.
6. Copy each agent workspace into a target project/workspace directory.
7. Set each profile's `terminal.cwd` to that copied workspace path.
8. Move persona, memory, skills, model config, cron, and gateway config into the profile.
9. Validate each profile independently before any channel cutover.

## Inventory OpenClaw Agents

Use OpenClaw diagnostics if available:

```bash
openclaw agents list --bindings --json 2>/dev/null || true
openclaw config validate --json
openclaw doctor --lint --json
```

Filesystem fallback:

```bash
find ~/.openclaw -maxdepth 2 -type d | sort
find ~/.openclaw -maxdepth 3 -type f \( -name 'AGENTS.md' -o -name 'SOUL.md' -o -name 'USER.md' -o -name 'MEMORY.md' -o -name 'IDENTITY.md' -o -name 'openclaw.json' \) | sort
```

Create an agent mapping table before copying anything:

| OpenClaw agent | Old workspace                    | New Hermes profile | New workspace path                | Gateway/channel plan |
| -------------- | -------------------------------- | ------------------ | --------------------------------- | -------------------- |
| `work`         | `~/.openclaw/workspace-work`     | `work`             | `/srv/hermes-workspaces/work`     | new Slack bot token  |
| `research`     | `~/.openclaw/workspace-research` | `research`         | `/srv/hermes-workspaces/research` | no gateway at first  |

## Create Profiles

Blank profile when the old agent should start clean:

```bash
hermes profile create work --description "Work coding agent for the main application."
work setup --portal
```

Clone config only when provider/tool defaults should match the current Hermes profile:

```bash
hermes profile create work --clone --description "Work coding agent for the main application."
```

Avoid `--clone-all` for migrated OpenClaw agents unless you intentionally want to copy an existing Hermes profile's sessions, memories, cron jobs, plugins, and skills. For most OpenClaw migrations, create a profile and import only the old agent's own workspace/memory.

## Copy Workspace And Set `terminal.cwd`

Example for one OpenClaw workspace:

```bash
mkdir -p /srv/hermes-workspaces/work
rsync -a ~/.openclaw/workspace-work/ /srv/hermes-workspaces/work/
work config set terminal.cwd /srv/hermes-workspaces/work
work config show
```

If keeping the original workspace path temporarily:

```bash
work config set terminal.cwd ~/.openclaw/workspace-work
```

Prefer copying to a Hermes-owned or project-owned path before cleanup. If `hermes claw cleanup` later renames `~/.openclaw`, a profile that points `terminal.cwd` into `~/.openclaw/...` will break or start in an unexpected path.

## Move Identity And Memory

Named profile paths live under `~/.hermes/profiles/<name>`:

```bash
mkdir -p ~/.hermes/profiles/work/memories

# Merge/edit deliberately rather than blind overwrite when files already exist.
cp /srv/hermes-workspaces/work/SOUL.md ~/.hermes/profiles/work/SOUL.md
cp /srv/hermes-workspaces/work/USER.md ~/.hermes/profiles/work/memories/USER.md 2>/dev/null || true
cp /srv/hermes-workspaces/work/MEMORY.md ~/.hermes/profiles/work/memories/MEMORY.md 2>/dev/null || true
```

If OpenClaw has `IDENTITY.md`, fold the durable identity into the Hermes profile's `SOUL.md`. If OpenClaw has `AGENTS.md`, keep it in the workspace root so the profile sees project operating rules when `terminal.cwd` points there.

Memory validation:

```bash
work chat -q "Start a new session and summarize what you know about this workspace, your role, and the user's key preferences."
```

## Move Skills

Copy workspace-local skills into the profile, keeping them visibly marked as imports:

```bash
mkdir -p ~/.hermes/profiles/work/skills/openclaw-imports
rsync -a /srv/hermes-workspaces/work/skills/ ~/.hermes/profiles/work/skills/openclaw-imports/ 2>/dev/null || true
work skills list
```

Then audit:

```bash
grep -R "openclaw\|OpenClaw\|~/.openclaw\|openclaw " ~/.hermes/profiles/work/skills/openclaw-imports || true
```

Classify each skill as keep, replace with Hermes built-in, rewrite, or retire. Do not call the agent migrated until its critical skill workflows pass a real task.

## Rebuild Model, Tools, Sandbox, And Cron

Per-profile provider and model:

```bash
work model
work config show
```

Per-profile workspace and terminal backend:

```bash
work setup terminal
work config set terminal.cwd /srv/hermes-workspaces/work
```

Per-profile tools:

```bash
work tools
work tools --summary
```

Per-profile cron:

```bash
work cron list
work cron create "Run the old daily work-agent summary workflow" --skill daily-summary
```

Profiles isolate Hermes state, but they do not sandbox local filesystem access. If the old OpenClaw agent had a restrictive sandbox/tool policy, recreate that with Hermes tool configuration and terminal backend/host isolation. Use a container, separate OS user, or separate host when filesystem isolation matters.

## Rebuild Gateway And Channel Routing

OpenClaw bindings do not automatically become Hermes routing rules. In Hermes, the common safe migration is one profile per bot/account or one profile per clear channel ownership boundary.

Per-profile gateway setup:

```bash
work gateway setup
work gateway status
work gateway install
```

Use distinct bot tokens per profile. Hermes supports token locks for Telegram, Discord, Slack, WhatsApp, and Signal, but design the cutover explicitly:

1. Keep old OpenClaw gateway stopped or on a separate token/port.
2. Configure the Hermes profile's `.env` and allowed users.
3. Start only that profile's gateway.
4. Send a real test message from the intended channel/user.
5. Repeat for the next profile/channel.

## Validation For One Migrated Agent

Run these after each profile migration:

```bash
hermes profile show work
work config show
work doctor
work skills list
work cron list
work gateway status
work chat -q "Run pwd, list the workspace instruction files, and summarize your role from SOUL.md."
```

Acceptance criteria:

- Profile home is `~/.hermes/profiles/<name>`.
- `terminal.cwd` points to the intended copied workspace/project path.
- Workspace `AGENTS.md` or equivalent instructions are present.
- Profile `SOUL.md` reflects the old agent identity.
- Memories contain the old agent/user context that should survive.
- Imported skills are present and audited.
- Cron jobs are recreated or intentionally retired.
- Gateway uses intended tokens/allowed users and does not conflict with OpenClaw.
- A representative workflow succeeds in a new session.

## Cleanup Rule

Do not run `hermes claw cleanup` or delete/rename old OpenClaw directories until every migrated profile uses a workspace path outside `~/.openclaw` or the old path is intentionally preserved. Otherwise profile `terminal.cwd` values and imported skill references can point into a directory that cleanup renames.