# Migration Playbook

This playbook gives a conservative OpenClaw to Hermes migration flow. It assumes the user cares about preserving daily agent workflows, not just copying files.

## Phase 0: Choose The Migration Shape

Ask only for details that change the plan:

| Question                                        | Why it matters                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Is this single-agent or multi-agent OpenClaw?   | Multi-agent lists and bindings are archived for manual rebuild.                    |
| Which gateways are live?                        | Running OpenClaw services can interfere with cleanup and bot routing.              |
| Are there critical custom skills or cron jobs?  | Skills may need adaptation; cron jobs are archived.                                |
| Can you use a fresh host/profile?               | Fresh host is safer than in-place for complex setups.                              |
| Do secrets need to migrate?                     | Secrets require `--migrate-secrets`; some SecretRefs need manual handling.         |
| Which OpenClaw agents have their own workspace? | Each durable agent/workspace usually becomes a Hermes profile plus `terminal.cwd`. |

Default to fresh-host or side-by-side when the user has multi-agent routing, long-lived skills, production messaging bots, or cron automation.

## Phase 1: Inventory OpenClaw

Run read-only inventory before migration:

```bash
openclaw --version
openclaw status
openclaw config validate --json
openclaw doctor --lint --json
openclaw agents list --bindings --json 2>/dev/null || true
openclaw skills list 2>/dev/null || true
openclaw gateway status --json 2>/dev/null || openclaw gateway status
```

Filesystem inventory:

```bash
du -sh ~/.openclaw
find ~/.openclaw -maxdepth 2 -type d | sort
find ~/.openclaw -maxdepth 3 -type f \( -name 'openclaw.json' -o -name '*.md' -o -name '*.json' \) | sort
```

Look specifically for:

- `openclaw.json`
- `workspace/`, `workspace-main/`, `workspace.default/`, `workspace-<agentId>/`
- `skills/`
- `memory/` and `workspace/memory/`
- `triggers/`, cron config, hooks/webhooks
- `credentials/` and `auth-profiles.json`
- `agents/*/agent/`
- `bindings`, channel account mappings, allowed users
- MCP server definitions
- custom provider definitions
- per-agent workspace paths that should become Hermes profile workspaces

## Phase 2: Snapshot And Freeze

Snapshot OpenClaw yourself. Hermes backs up Hermes state before applying, but do not rely on that as an OpenClaw source backup.

```bash
tar -czf "$HOME/openclaw-snapshot-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$HOME" .openclaw
```

Optional encrypted snapshot:

```bash
tar -czf - -C "$HOME" .openclaw | gpg -c -o "$HOME/openclaw-snapshot-$(date +%Y%m%d-%H%M%S).tar.gz.gpg"
```

Stop live writers before migration or cleanup:

```bash
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
pkill -f openclaw || true
pgrep -af openclaw || true
```

On Windows, use the installed service/process manager equivalent and verify no OpenClaw process remains.

## Phase 3: Install And Baseline Hermes

If Hermes is not installed:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc
hermes --version
```

For the easiest Nous Portal path:

```bash
hermes setup --portal
```

Baseline checks:

```bash
hermes status
hermes config check
hermes doctor
```

If using a fresh host from a tarball:

```bash
tar -xzf openclaw-snapshot.tar.gz -C ~
hermes claw migrate --source ~/.openclaw --dry-run
```

For multi-agent migrations, create target profiles before cutover planning:

```bash
hermes profile create work --description "Migrated work agent."
work setup --portal
work config set terminal.cwd /srv/hermes-workspaces/work
```

## Phase 4: Dry Run

Always run the preview:

```bash
hermes claw migrate --dry-run
```

With non-default source:

```bash
hermes claw migrate --source /path/to/openclaw --dry-run
```

With workspace target for `AGENTS.md`:

```bash
hermes claw migrate --workspace-target ~/projects/myapp --dry-run
```

Inspect dry-run output for:

- zero memory entries when memory should exist
- skipped or conflicting skills
- archived cron jobs, plugins, hooks, bindings, multi-agent list, complex channels
- missing provider keys
- file/exec SecretRefs that cannot resolve automatically
- unexpected source path
- unexpected overwrite plan in `~/.hermes`

If the dry-run looks wrong, fix source permissions/config first. Do not run apply hoping it resolves itself.

## Phase 5: Pick Flags Deliberately

Common apply commands:

```bash
# Full import including secrets, safest skill conflict handling.
hermes claw migrate --preset full --migrate-secrets --skill-conflict rename

# User data only: persona, memory, skills; leaves infra/secrets cleaner.
hermes claw migrate --preset user-data --skill-conflict rename

# Fresh host or non-standard source.
hermes claw migrate --source /path/to/openclaw --preset full --migrate-secrets --skill-conflict rename

# Copy project AGENTS.md into the intended project.
hermes claw migrate --preset full --workspace-target ~/projects/myapp --skill-conflict rename
```

Flag rules:

| Flag                         | Use when                                                        | Warning                                                 |
| ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| `--dry-run`                  | Always before apply.                                            | Preview only.                                           |
| `--preset full`              | Hermes will replace OpenClaw as the working setup.              | Secrets still require `--migrate-secrets`.              |
| `--preset user-data`         | You want persona/memory/skills but clean Hermes infrastructure. | Messaging/config/secrets are skipped.                   |
| `--migrate-secrets`          | You intentionally want allowlisted keys copied.                 | File/exec SecretRefs still need manual handling.        |
| `--skill-conflict rename`    | Default cautious choice for custom skills.                      | Leaves duplicates to reconcile.                         |
| `--skill-conflict skip`      | You trust Hermes built-ins more than old OpenClaw skill.        | Custom behavior may be absent.                          |
| `--skill-conflict overwrite` | You explicitly prefer OpenClaw skill over Hermes version.       | Can clobber newer Hermes skill behavior.                |
| `--overwrite`                | Existing Hermes conflicts should be replaced.                   | Use only after reading the plan and having backup.      |
| `--no-backup`                | Almost never.                                                   | Removes the automatic Hermes restore point.             |
| `--workspace-target`         | You want `AGENTS.md` copied into a project.                     | Without it, workspace instructions may be archived.     |
| `--source`                   | OpenClaw is not at `~/.openclaw`.                               | Must point to unpacked OpenClaw directory, not tarball. |
| `--yes`                      | Non-interactive automation after reviewed dry-run.              | Do not use for first exploratory run.                   |

## Phase 6: Post-Migration Review

Immediately inspect:

```bash
hermes status
hermes config check
hermes doctor
hermes skills list
hermes logs errors --since 1h
```

Find the migration archive:

```bash
find ~/.hermes/migration/openclaw -maxdepth 3 -type f | sort
```

Review archived files before assuming migration is complete. Anything archived needs manual attention.

## Phase 7: Rebuild The Flow

Treat this as the real migration work:

1. Start a new Hermes session so imported memory and skills load.
2. Test one old skill at a time.
3. Rename, disable, or edit imported skills that conflict with Hermes built-ins.
4. Recreate cron jobs with `hermes cron create`.
5. Recreate webhooks with `hermes webhook subscribe`.
6. Translate OpenClaw multi-agent routing into Hermes profiles, gateway/platform config, or separate Hermes installs.
7. For each important OpenClaw agent workspace, create a Hermes profile, copy the workspace, set `terminal.cwd`, and migrate identity/memory/skills into that profile.
8. Configure external memory provider if needed: `hermes memory setup` or provider-specific command.
9. Re-pair WhatsApp with `hermes whatsapp`.
10. Test each messaging platform from the real user/channel that will use it.

## Phase 8: Cutover And Cleanup

Keep OpenClaw recoverable until Hermes has passed real workflows for several days.

Before cleanup, verify that migrated profiles do not depend on workspaces under `~/.openclaw` unless preserving that path is intentional:

```bash
hermes profile list
hermes profile show work
work config show
```

If running side by side, avoid shared tokens and ports:

```bash
# Example: reinstall OpenClaw gateway on a different port if you must keep it.
openclaw gateway install --force --port 18790
```

Only after successful validation:

```bash
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
pgrep -af openclaw || true
hermes claw cleanup
```

If cleanup offers to archive `~/.openclaw`, stop and verify no OpenClaw process or service is active first.

## Recovery Pattern For Cleanup Damage

If `~/.openclaw` was renamed and a running service recreated an empty skeleton:

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

Use a non-Hermes port if both systems need to coexist.