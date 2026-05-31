---
name: openclaw-to-hermes-migration
description: Migration playbook for moving from OpenClaw to Hermes Agent without breaking agent workflows. Use this skill whenever the user mentions migrating OpenClaw to Hermes, `hermes claw migrate`, `hermes claw cleanup`, OpenClaw-to-Hermes skills, memory, cron jobs, gateway services, multi-agent setups, agent workspaces, Hermes profiles, channel bindings, Discord/Telegram/Slack/WhatsApp bots, OpenClaw directories, migration dry-runs, side-by-side operation, backups, or post-migration validation. This skill is intentionally cautious: use it even when the user only asks for the command, because real migrations can silently break skills, cron jobs, memory, gateways, or multi-agent routing if treated as a one-step copy.
---

# OpenClaw To Hermes Migration

Use this skill to plan and execute OpenClaw to Hermes Agent migrations as a staged operational cutover, not as a single command. It combines the Hermes migration guide with field concerns from a migration review video, a Google AI Mode search fallback, a GitHub issue about `hermes claw cleanup` and running OpenClaw services, and a third-party migration walkthrough.

Read supporting references based on the user's problem:

- For the end-to-end command plan, read [references/migration-playbook.md](references/migration-playbook.md).
- For what migrates, what is archived, and what must be rebuilt manually, read [references/mapping-and-gaps.md](references/mapping-and-gaps.md).
- For converting OpenClaw agent workspaces into Hermes profiles, workspaces, and per-profile gateways, read [references/agent-workspace-migration.md](references/agent-workspace-migration.md).
- For risk controls, flow-preservation checks, and recovery commands, read [references/risk-register.md](references/risk-register.md).
- For source-specific lessons from the docs, video, search fallback, and issue, read [references/source-notes.md](references/source-notes.md).

## Core Principle

Do not let the user treat this as "run `hermes claw migrate` and move on." A working OpenClaw install often contains a lived-in flow: custom skills, cron jobs, memory habits, channel routing, allowed users, gateways, shell approvals, provider auth, and directory assumptions. Hermes can import many compatible pieces, but the migration still needs a controlled cutover.

The safest shape is:

1. Inventory and snapshot OpenClaw.
2. Stop or isolate live OpenClaw services before any archive/cleanup step.
3. Run `hermes claw migrate --dry-run` and inspect the plan.
4. Migrate with explicit preset, secrets, skill conflict, source, and workspace flags.
5. Convert each important OpenClaw agent/workspace into a Hermes profile plus explicit `terminal.cwd`.
6. Rebuild archived gaps: cron jobs, multi-agent routing, channel bindings, plugins/hooks, complex skills, memory backend, and workspace assumptions.
7. Validate Hermes with real workflows before disabling OpenClaw.
8. Only clean up OpenClaw after a verified rollback path exists.

## Default Recommendation

When the user has anything more than a disposable personal setup, recommend a two-phase or side-by-side migration:

```bash
# Snapshot OpenClaw before touching anything.
tar -czf "$HOME/openclaw-snapshot-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$HOME" .openclaw

# Stop live OpenClaw services before any archive/cleanup operation.
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
pkill -f openclaw || true

# Inspect what Hermes thinks it can migrate.
hermes claw migrate --dry-run

# Apply only after reviewing skipped, archived, and conflicting items.
hermes claw migrate --preset full --migrate-secrets --skill-conflict rename
```

If they want the least disruptive path, recommend a fresh machine or fresh profile and migrate from a tarball/source copy:

```bash
tar -czf openclaw-snapshot.tar.gz ~/.openclaw
scp openclaw-snapshot.tar.gz user@new-host:~
ssh user@new-host
tar -xzf openclaw-snapshot.tar.gz -C ~
hermes claw migrate --source ~/.openclaw --dry-run
hermes claw migrate --source ~/.openclaw --preset full --migrate-secrets --skill-conflict rename
```

## Response Contract

For migration questions, answer in this order:

1. **Recommended migration mode**: fresh-host, side-by-side, in-place cautious, user-data only, or manual skill-only.
2. **Preflight**: snapshot, service stop/isolation, inventory commands, port plan, and source path.
3. **Migration command**: dry-run first, then explicit apply command.
4. **Manual gap list**: items that Hermes archives or cannot safely translate.
5. **Agent/workspace mapping**: how each OpenClaw agent becomes a Hermes profile with explicit `terminal.cwd`.
6. **Validation plan**: provider, memory, skills, cron, gateway, channels, profile workspace, and representative workflows.
7. **Rollback/cleanup plan**: what to restore, what not to delete yet, and when `hermes claw cleanup` is acceptable.

## Decision Rules

Choose a migration mode by risk:

| Situation                                                          | Recommended mode                                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Brand-new or disposable OpenClaw setup                             | In-place cautious migration can be fine.                                                                                                                                 |
| Long-lived personal agent with custom skills                       | Side-by-side migration; keep OpenClaw paused but recoverable for days.                                                                                                   |
| Multi-agent OpenClaw setup with bindings/channel routing           | Fresh-host or profile-based rebuild; do not assume direct multi-agent equivalence.                                                                                       |
| Public/shared messaging bots                                       | Fresh-host or side-by-side with explicit channel cutover and allowed-user tests.                                                                                         |
| Many cron jobs, hooks, webhooks, plugins, or custom memory backend | Treat migration as partial import plus manual rebuild.                                                                                                                   |
| User only wants memories/persona/skills                            | `--preset user-data`; omit secrets and infrastructure.                                                                                                                   |
| User wants only skills                                             | Prefer manual copy or `user-data` with memory disabled only if documented for the installed version; otherwise `rsync` skills into `~/.hermes/skills/openclaw-imports/`. |

## Safety Rules

- Always start with a snapshot of `~/.openclaw`; Hermes' pre-migration backup protects overwritten Hermes files, not the OpenClaw source directory.
- Always run `hermes claw migrate --dry-run` before applying.
- Always inspect archived items under `~/.hermes/migration/openclaw/<timestamp>/archive/` after migration.
- Stop OpenClaw gateway/services before `hermes claw cleanup` or accepting any archive prompt that renames `~/.openclaw`.
- Avoid running Hermes and OpenClaw gateways on the same default port or the same bot token without a deliberate routing plan.
- Do not assume OpenClaw multi-agent bindings become Hermes profiles automatically; the docs archive multi-agent list and bindings for manual review.
- For old OpenClaw agents, map each durable agent identity to a Hermes profile, then set that profile's `terminal.cwd` to the copied workspace/project path. Profiles isolate Hermes state; they do not sandbox filesystem access.
- Treat imported skills as suspect until tested. Many break because they reference OpenClaw tool names, directories, skill conventions, or built-in flows.
- Do not trust memory migration as proof the agent "knows" old operational state. Ask it concrete facts and verify actual files/services.

## Common Flow Breakers To Surface

- OpenClaw-specific skills that call `openclaw`, assume OpenClaw tool names, or overlap with Hermes built-in skills.
- Cron jobs and triggers: archived, not directly recreated.
- Multi-agent lists, channel bindings, and per-agent Discord/Slack/Telegram accounts: archived, manual rebuild.
- `.env` and secrets: only copied with `--migrate-secrets`, only for supported targets, and file/exec SecretRefs need manual handling.
- WhatsApp: QR re-pairing is required.
- OpenClaw gateway still running: can recreate `~/.openclaw` skeleton after cleanup/archival and confuse recovery.
- Port conflicts: OpenClaw and Hermes gateway defaults can collide.
- Imported memory can be incomplete or misleading; external memory providers such as Honcho need their own setup and validation.
- Agent flow changes: Hermes is more vocal about tool success/failure, but old workflows may require several hours of cleanup conversation and skill repair.

## Validation Before Cutover

Do not declare success until the user has verified at least one real workflow from each category they depend on:

```bash
hermes status
hermes config check
hermes doctor
hermes skills list
hermes gateway status
hermes logs errors --since 1h
```

Then run representative prompts:

- A memory/persona prompt only the old agent should know.
- A migrated skill that used to be core to daily work.
- A cron job or scheduled workflow manually recreated in Hermes.
- A gateway/channel test from each messaging platform.
- A provider/model call, especially if the old setup used custom providers or OAuth.
- A directory-sensitive workflow that used OpenClaw workspaces, project scripts, or external deployed services.
- For each migrated OpenClaw agent, a profile-specific test that proves the correct `SOUL.md`, memories, skills, `.env`, gateway token, and `terminal.cwd` are active.

## When To Read Other Skills

- Read `hermes-usage` for exact Hermes CLI/config syntax outside migration-specific details.
- Read `openclaw-cli` when the user needs OpenClaw backup, gateway, service, status, or diagnostic commands.
- Read `openclaw-agent-creation` when translating OpenClaw multi-agent boundaries into Hermes profiles, skills, tools, and messaging policy.

## Be Honest About Uncertainty

The Google AI Mode share URL was not directly scrapeable during skill creation because it returned a CAPTCHA, so this skill uses the exposed search query and fetched search results instead. Treat AI-mode claims as leads, not primary evidence. The video is experiential, not official documentation; use it to identify real migration pain points, then pair each point with official commands or concrete verification.
