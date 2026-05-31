# Source Notes

This skill was created from multiple sources so it does not overfit to the official migration command alone.

## Official Hermes Migration Guide

URL: `https://hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw`

Key facts:

- `hermes claw migrate` imports OpenClaw, Clawdbot, or Moldbot setup into Hermes.
- The command always shows a preview before changing files.
- `--dry-run` previews and stops.
- `--preset full` and `--preset user-data` control scope.
- No preset imports secrets silently; `--migrate-secrets` is explicit.
- `--no-backup` skips the pre-migration Hermes snapshot and should rarely be recommended.
- Source defaults to `~/.openclaw`; `--source` handles custom paths.
- `--workspace-target` is needed for direct `AGENTS.md` placement.
- `--skill-conflict` supports `skip`, `overwrite`, and `rename`.
- Skills land under `~/.hermes/skills/openclaw-imports/`.
- Cron jobs, plugins, hooks/webhooks, memory backend config, skills registry, multi-agent list, channel bindings, complex channels, and some workspace files are archived for manual review.
- WhatsApp requires QR re-pairing.
- After migration: review report, inspect archives, start new session, verify API keys, test messaging, check session policies, re-pair WhatsApp, and only then clean up.

## Official Hermes Profiles Guide

URL: `https://hermes-agent.nousresearch.com/docs/user-guide/profiles#profiles-vs-workspaces-vs-sandboxing`

Key facts:

- Profiles run multiple independent Hermes agents on the same machine.
- Each profile has its own home directory with config, `.env`, `SOUL.md`, memories, sessions, skills, cron jobs, gateway state, logs, and state database.
- A profile automatically gets a command alias; `coder chat` is equivalent to targeting `hermes -p coder`.
- `--clone` copies config, `.env`, and `SOUL.md` but gives fresh sessions and memory.
- `--clone-all` copies everything, including memories, sessions, skills, cron jobs, and plugins.
- Profiles are different from workspaces and sandboxes. A workspace/working directory is controlled by `terminal.cwd`; sandboxing is controlled separately by terminal backend or host isolation.
- On the default local backend, a profile still has the same filesystem access as the user account running Hermes.
- Set an absolute per-profile `terminal.cwd` for predictable project/workspace starts.
- Each profile can run its own gateway process/service with its own bot token. Token locks exist for supported platforms when profiles accidentally reuse a bot token.

## YouTube Migration Review

URL: `https://www.youtube.com/watch?v=IiyCgnT7OHg`

Video title from transcript metadata: `OpenClaw to Hermes Agent Migration: Real Issues, Fixes & Honest Review`

Key field lessons:

- The speakers describe the migration as brutal/painful in the short term even though Hermes felt worthwhile later.
- Their first attempt delegated migration to an existing agent/Claude Code and treated the docs as enough; this missed important flow details.
- Long-lived agents become specialized around their old environment. Skills that look generic can depend on OpenClaw behavior.
- Key skills and cron jobs were a major pain point.
- Research/Twitter skills conflicted with Hermes built-ins or Hermes' own X/Twitter flow.
- Complex pipeline skills with many moving pieces needed case-by-case repair.
- Directory conflicts and stale OpenClaw directories confused the agent; one speaker ended up committing/backing up OpenClaw and deleting the active old directory to stop confusion.
- They discovered that the onboarding/install flow includes an OpenClaw migration prompt and felt they had missed a better path.
- `.env` and cron jobs did not feel fully transferred from their point of view, even though official docs describe some secrets and archived cron config. Treat this as a validation gap: verify what moved, what was archived, and what remains manual.
- Hermes' more vocal success/failure reporting was seen as a benefit, but migration still needed babysitting.
- Memory/Honcho did not magically preserve every operational detail; the agent forgot a recently built wiki/deployment URL. Validate memory with concrete facts.

How to use these lessons:

- Recommend a staged migration rather than a fast one-shot.
- Add a skill audit phase.
- Add a cron/manual rebuild phase.
- Add memory reality checks.
- Warn that imported skills may need Hermes-native rewrites.

## Google AI Mode Share

URL supplied by user: `https://share.google/aimode/RK180FZnMESHELFOK`

Fetch result during creation: blocked by Google CAPTCHA/429.

Fallback query extracted from the redirect page:

```text
how to stop openclaw to migrate to hermes
```

Search results surfaced:

- Official Hermes migration guide.
- GitHub issue #8502 about `hermes claw migrate + cleanup` and active OpenClaw services.
- Community/third-party advice emphasizing snapshots, service stop, skill conflict review, and side-by-side safety.

Use this source as a lead, not as direct evidence, because the AI Mode answer content was not retrievable.

## GitHub Issue #8502

URL: `https://github.com/NousResearch/hermes-agent/issues/8502`

Title: `hermes claw migrate + cleanup destroys OpenClaw multi-agent setup without stopping services`

Key points:

- Report described `hermes claw migrate` followed by archive prompt or `hermes claw cleanup` renaming `.openclaw/` while `openclaw-gateway.service` still ran.
- The running service recreated a small empty `~/.openclaw` skeleton with no config, making the active OpenClaw setup look gutted.
- Lost active surface included `openclaw.json`, Discord account config, agent routing bindings, skills, memory, triggers, extensions, credentials, workspace contents, proxy helper, and security/subagent directories.
- Root cause was cleanup/archival not checking/stopping running OpenClaw processes before renaming.
- Additional concerns included port conflict on gateway default port and `proxy-preload.cjs` missing after skeleton recreation.
- The issue was closed as fixed in PR #8663, which checks running processes and `openclaw-gateway.service` before archival.

Skill implication:

- Still recommend stopping OpenClaw services before cleanup because users may run older Hermes versions, local forks, or manual archive commands.
- Mention the fix without relying on it as the only guard.
- Keep recovery commands in the risk register.

## Third-Party Migration Walkthrough

URL: `https://lumadock.com/tutorials/migrate-from-openclaw-to-hermes`

Key advice:

- Take your own `~/.openclaw` snapshot before migration; Hermes' backup protects Hermes files, not the OpenClaw source.
- Stop running OpenClaw processes before migration.
- Dry-run first and inspect memory counts and skipped/conflicting skills.
- Choose `full` vs `user-data` based on whether Hermes replaces OpenClaw wholesale.
- Imported skills land under `~/.hermes/skills/openclaw-imports/`.
- Keep OpenClaw around for several days as a safety net.
- Bot silence often comes from old gateway still running, token/webhook contention, or allowed-user settings.
- Fresh server from tarball can be safer than in-place migration.

Note: this is a third-party hosting article with promotional content; use the operational advice only when it agrees with official docs or concrete failure reports.