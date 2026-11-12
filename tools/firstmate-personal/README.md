# Firstmate Personal commands

Apply an explicitly selected private Firstmate configuration and send milestone notifications through a local Telegram bot. This directory owns the reusable code and tests; personal preferences, routing choices and machine profiles belong in a separate private repository. Requires Python 3.11+ and Git on Linux or macOS. Uses only the Python standard library and runs no background service.

## Commands

Add this directory's `bin` to PATH, or create non-overwriting links to `bin/fm-personal` and `bin/fm-notify` in an existing PATH directory. Keep those links on a qualified stable checkout. The launchers locate their module relative to their own resolved path, independently of the caller's working directory.

```sh
fm-personal sync --repo /absolute/private-configuration --home /absolute/firstmate-home --machine workstation
fm-personal sync --repo /absolute/private-configuration --home /absolute/firstmate-home --machine workstation --apply
```

`sync` requires `--repo`: it never searches the public code checkout for private preferences. Preview is the default and writes nothing. The Firstmate home must contain its existing `AGENTS.md` and Git checkout. A private `profile.json` supplies `schemaVersion: 1`, a list of qualified full Firstmate Git revisions under `firstmateRevisions`, and a `files` mapping from configuration-source paths to home-relative targets. `profiles/<machine>.json` supplies another `files` mapping whose targets override common entries.

The finite target allowlist is `data/captain-shared.md`, `config/crew-dispatch.json`, `config/personal-machine` and `.agents/skills/firstmate-notify/SKILL.md`. The latter is an explicitly selected private Firstmate workflow, independent of global harness skill installations. Before creating it, add `/.agents/skills/firstmate-notify/` to that Firstmate checkout's local Git exclude file, resolved with `git rev-parse --git-path info/exclude`. Do not edit the shared Firstmate template's ignore file or instructions.

Existing unmanaged targets with different bytes require review and `--adopt-existing`; replaced bytes are backed up. Managed local divergence always refuses, including with adoption. Removed mappings require explicit reconciliation and never delete local files. Tracked Firstmate files, symlinks, hard links, path traversal and unqualified Firstmate revisions refuse. The application uses a nonblocking lock and verifies unchanged preflight bytes before writing.

The home-local `state/personal-profile/receipt.json` records desired-file digests, machine and Firstmate revision. Backups remain under `state/personal-profile/backups/`. Observed write failures restore completed writes; a crash or power failure can interrupt the multi-file operation and requires explicit recovery from the receipt and backups. These are local-user safeguards, not protection against a hostile process mutating the same filesystem concurrently.

## Telegram configuration and notifications

Create a bot with [BotFather](https://t.me/BotFather), then start its private chat with `/start`. Supply the token through the harness's secure input as an owner-only file. Never put credentials in shell arguments, chat, public examples or Git.

```sh
fm-personal telegram-setup --home /absolute/firstmate-home --token-file /protected/token-file
fm-notify --home /absolute/firstmate-home --project example-project --event validation-complete --message 'Required validation passed.' --link https://example.invalid/review
```

Setup discovers exactly one private chat that sent `/start`, writes `config/telegram.json` with mode 600 and sends nothing. For an ambiguous discovery, select a known private chat with `--chat-id`. If the update expired, send `/start` again. Existing configuration is preserved. Remove the temporary input file through its owning harness after successful setup. Configure each host separately; neither profile application nor this public tool transports credentials or runtime state.

The local file contains `token`, numeric `chatId` and an optional `apiBase`, defaulting to `https://api.telegram.org`. A chosen HTTPS Bot API endpoint or loopback-only HTTP server can be supplied with setup's `--api-base`; redirects are refused to protect credentials. Coordinate chat discovery with any existing update consumer.

Messages use a bold `Firstmate [hostname(machine-alias)]` header, a separate project/event line and spaced paragraphs. The OS supplies the hostname and `config/personal-machine` supplies the alias. Caller-provided fields are escaped and remain literal. The length check counts visible UTF-16 characters after formatting; link previews are disabled.

Success means the Telegram API returned `ok: true` and a valid message ID, not that a device displayed or sounded the message. Failures exit nonzero with a redacted error. No automatic retry occurs because an ambiguous network failure may follow an accepted send. Milestone selection, task acceptance and repeat-send prevention belong to the invoking Firstmate workflow and its existing outcome records.

## Validation and recovery

From this directory:

```sh
python3 -m unittest discover -s tests -v
```

The tests exercise real launchers, the production module, Git/filesystem fixtures and a loopback HTTP server. They cover split code/configuration paths, explicit source selection, preview/application/repetition, protected targets and conflict refusal, write-failure rollback, literal message formatting, length limits, HTTP/API/network errors and private configuration handling. Live Telegram connectivity, other hosts and device rendering require independent qualification.

Keep global harness instructions, agent definitions and skills under their existing owners; this command manages only the explicit Firstmate targets above. For rollback, inspect the receipt and backups and restore the selected source version and home files together. Do not delete ownership to force an overwrite. Changing installed command links back to the previous qualified checkout restores that code without deleting preferences, secrets or task state. No command upgrades Firstmate, merges Git branches or reloads an active agent's context.
