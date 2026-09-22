# Risk Register And Recovery

Use this reference to keep migration answers grounded in failure prevention and recovery.

## High-Risk Operations

| Operation                               | Risk                                                                                | Guardrail                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `hermes claw migrate` with no dry-run   | Surprises in skipped, archived, conflicting items.                                  | Run `--dry-run` first.                                             |
| `--migrate-secrets`                     | Secrets copied to Hermes `.env`; unsupported SecretRefs left behind.                | Explain what sources/targets are supported and audit `.env`.       |
| `--overwrite`                           | Existing Hermes files replaced.                                                     | Require backup and reviewed plan.                                  |
| `--skill-conflict overwrite`            | Hermes built-ins/customizations can be clobbered.                                   | Prefer `rename` first.                                             |
| `--yes`                                 | Skips confirmation after preview.                                                   | Use only after reviewed dry-run in automation.                     |
| `--no-backup`                           | Removes Hermes restore point.                                                       | Avoid unless user has external backup and explicitly accepts.      |
| `hermes claw cleanup` or archive prompt | Can rename `~/.openclaw`; historically dangerous if OpenClaw service still running. | Stop OpenClaw services/processes first and keep external snapshot. |
| Running both gateways                   | Port/token/webhook conflicts; messages may go to old bot.                           | Assign distinct ports/tokens or pause one gateway.                 |
| Treating imported skills as trusted     | Skills may call OpenClaw-only tools/paths.                                          | Audit and test skill by skill.                                     |
| Trusting memory immediately             | Agent may forget or hallucinate migrated operational context.                       | Verify concrete facts and files.                                   |
| Treating Hermes profiles as sandboxes   | A profile on the local backend can still access files as the same OS user.          | Use terminal backend, OS user, container, or host isolation.       |

## Service And Process Guard

Before cleanup/archival or in-place migration on a live machine:

```bash
systemctl --user status openclaw-gateway.service 2>/dev/null || true
pgrep -af openclaw || true
```

Stop:

```bash
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
pkill -f openclaw || true
pgrep -af openclaw || true
```

The GitHub issue found during research says this was fixed in Hermes PR #8663 by checking running processes and the `openclaw-gateway.service` systemd unit before archiving. Still keep the guardrail in the skill because users may run older Hermes versions, local forks, or manual directory operations.

## Port And Gateway Conflicts

OpenClaw and Hermes gateways can collide on default ports and platform tokens. If both need to run:

```bash
openclaw gateway install --force --port 18790
hermes gateway status
openclaw gateway status
```

Do not let both systems consume the same Telegram/Discord/Slack/WhatsApp token/webhook unless the user has a deliberate traffic split. For bots, cut over one platform at a time and keep the old platform paused.

## Multi-Agent Risk

Official migration docs archive OpenClaw multi-agent list and bindings for manual review. This is a major flow-breaker:

- agent identity/persona boundaries may flatten
- channel-to-agent routing does not automatically map
- per-agent credentials and Discord accounts may require manual Hermes profiles or separate installs
- workspace-specific skills and memory may need profile-specific organization

Recommended response:

1. Inventory OpenClaw agents and bindings.
2. Create one Hermes profile per durable agent identity/workspace that should keep separate memory, skills, credentials, cron, or gateway state.
3. Copy each OpenClaw workspace to a stable project/workspace path and set that profile's `terminal.cwd` to it.
4. Decide whether profiles, separate OS users, containers, separate hosts, or separate installs best match trust boundaries.
5. Rebuild one agent/profile at a time.
6. Validate each platform/channel route with real messages.

Profile boundary warning: `terminal.cwd` controls where tools start, not what the agent is allowed to access. A local-backend profile is not a filesystem sandbox.

## Skill Conflict Risk

The migration review video emphasized that many OpenClaw skills looked generic but depended on OpenClaw behavior. Examples mentioned included presentation skills, research/Twitter skills, and a complex video/transcript/database/summarization pipeline.

Audit pattern:

```bash
grep -R "openclaw\|OpenClaw\|~/.openclaw\|openclaw " ~/.hermes/skills/openclaw-imports || true
grep -R "twitter\|x_search\|cron\|gateway\|message\|infer" ~/.hermes/skills/openclaw-imports || true
```

Then test the skill with a small representative prompt. Do not wait until the production workflow invokes it.

## Cron, Hooks, And Webhooks

OpenClaw cron jobs, triggers, hooks, and webhooks are archived or require manual recreation. Treat these as a checklist:

```bash
find ~/.hermes/migration/openclaw -path '*archive*' -type f | sort
hermes cron list
hermes webhook list
hermes hooks list 2>/dev/null || true
```

Rebuild examples:

```bash
hermes cron create "Summarize yesterday's incidents and send to Slack" --skill incident-summary
hermes webhook subscribe github-issues --events issues --deliver slack --skills github-triage
```

Use exact local `hermes cron --help` and `hermes webhook --help` if flags differ.

## Memory And External Memory Providers

Memory migration merges markdown entries, but this does not guarantee the new agent will prioritize the same operational context. External memory providers such as Honcho need separate setup and validation.

Validation prompts:

- "What project did we spend last week building, and where is it deployed?"
- "Which channels should the work agent answer in?"
- "Which wiki URL should you use for the internal docs?"
- "List the cron workflows you believe exist, then show where they are configured."

If answers are vague, inspect files rather than arguing with the agent:

```bash
ls -la ~/.hermes/memories
sed -n '1,160p' ~/.hermes/SOUL.md
sed -n '1,160p' ~/.hermes/memories/MEMORY.md
hermes memory status 2>/dev/null || true
```

## Recovery From Bot Silence

If a migrated bot is silent:

1. Check whether old OpenClaw gateway is still running.
2. Check Hermes gateway status/logs.
3. Verify token and allowed-user env vars.
4. Verify one platform at a time.

Commands:

```bash
pgrep -af openclaw || true
hermes gateway status
hermes logs gateway -n 100
hermes logs errors --since 1h
hermes config env-path
```

Common causes:

- old gateway consumes webhook/token
- allowed-user list did not migrate or is stale
- token was skipped because `--migrate-secrets` was not used
- WhatsApp needs re-pairing
- channel binding from OpenClaw has no Hermes equivalent yet

## Recovery From Cleanup Skeleton

If an old OpenClaw service recreated an empty `~/.openclaw` after cleanup:

```bash
systemctl --user stop openclaw-gateway.service
rm -rf ~/.openclaw
mv ~/.openclaw.pre-migration ~/.openclaw
openclaw gateway install --force --port 18790
openclaw config set gateway.mode local
openclaw config set gateway.auth.mode token
openclaw doctor --fix
systemctl --user restart openclaw-gateway.service
```

Then rerun migration only from a snapshot or after reviewing source state.

## Completion Criteria

A migration is complete only when:

- OpenClaw source snapshot exists outside the active directory.
- Hermes dry-run and apply report were reviewed.
- Archived files have been triaged.
- All critical skills have been tested or rewritten.
- Cron/hook/webhook workflows have been recreated or intentionally retired.
- Provider auth and model selection work.
- Each messaging platform has a real send/receive test.
- Multi-agent/channel routing has been explicitly rebuilt.
- Memory/persona answers match source files and operational reality.
- Rollback path is known.