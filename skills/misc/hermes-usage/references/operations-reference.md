# Hermes Operations Reference

This reference covers installation, first run, updating, backups, uninstalling, and troubleshooting for Hermes Agent. Docs crawled May 31, 2026.

## Supported Platforms

Documented platforms:

| Platform                    | Notes                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Linux                       | Primary supported path.                                                                              |
| macOS                       | Supported; launchd gateway service supported.                                                        |
| WSL2                        | Recommended on Windows for stability. Prefer `hermes gateway run` in `tmux` for gateway persistence. |
| Native Windows / PowerShell | Early beta. Some features have limitations; PortableGit/bash handling matters.                       |
| Android via Termux          | Supported by installer path.                                                                         |

## Installation Paths

One-line installer for Linux, macOS, WSL2, and Termux:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

The installer handles `uv`, Python 3.11, Node.js 22, ripgrep, ffmpeg, a virtual environment, and PATH wiring. For native Windows it also provisions Portable Git Bash and installs under `%LOCALAPPDATA%\hermes\hermes-agent`.

Windows PowerShell installer, documented as early beta:

```powershell
iex (irm https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1)
```

Python package path:

```bash
pip install hermes-agent
hermes postinstall
```

For pip installs, Python 3.11+ is the main prerequisite. For git-installer paths, Git is the main prerequisite; the installer provisions the rest.

Unprivileged or service-user install notes:

```bash
sudo npx playwright install-deps chromium
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-browser
```

Use `--skip-browser` when root/sudo is unavailable and browser system dependencies cannot be installed during setup. Install browser dependencies separately when browser automation is needed.

Tracking `main` during install:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

After install, reload the shell if needed:

```bash
source ~/.bashrc
# or
source ~/.zshrc
```

Verify:

```bash
hermes --version
hermes doctor
hermes
```

## Postinstall

`hermes postinstall` is the internal bootstrap run after `pip install hermes-agent` and during pip-style updates. It installs non-Python dependencies pip cannot provide, including Node.js runtime, headless browser, ripgrep, and ffmpeg, then triggers setup if the profile has not been configured. It is safe to re-run idempotently.

```bash
hermes postinstall
```

## First Run

Hermes expects a model with at least 64K tokens of context. If a user chooses a small-context model, recommend switching in `hermes model` before debugging unrelated symptoms.

Fast Nous Portal path:

```bash
hermes setup --portal
```

Manual provider setup:

```bash
hermes model
```

Start classic CLI:

```bash
hermes
```

Start TUI:

```bash
hermes --tui
```

Resume latest session:

```bash
hermes --continue
hermes -c
```

Useful first in-chat commands:

```text
/help
/tools
/save
```

Multi-line input can use Alt+Enter, Ctrl+J, or Shift+Enter depending on the terminal.

## Updating

Preview only:

```bash
hermes update --check
```

Standard update:

```bash
hermes update
```

Update against another branch for git installs:

```bash
hermes update --branch release-candidate
hermes update --check --branch experimental
```

Opt into a full pre-update backup:

```bash
hermes update --backup
```

Set the backup default in `config.yaml`:

```yaml
updates:
  pre_update_backup: true
```

For pip installs, Hermes detects the pip path and queries PyPI, then runs an upgrade instead of `git pull`:

```bash
hermes update --check
hermes update
pip install --upgrade hermes-agent
```

Post-update validation:

```bash
git status --short
hermes doctor
hermes --version
hermes gateway status
```

If the terminal disconnects mid-update, Hermes ignores `SIGHUP` and logs progress:

```bash
tail -f ~/.hermes/logs/update.log
```

Windows update blocker:

- If another `hermes.exe` is running, the updater refuses to run.
- Close the listed processes.
- Use `hermes update --force` only when you intentionally accept that risk.

Messaging platform update:

```text
/update
```

The docs mention `/update` from Telegram, Discord, Slack, WhatsApp, or Teams.

Manual git update:

```bash
cd /path/to/hermes-agent
export VIRTUAL_ENV="$(pwd)/venv"
git pull origin main
uv pip install -e ".[all]"
hermes config check
hermes config migrate
```

Rollback from git checkout:

```bash
git log --oneline -10
git checkout <commit-hash>
git submodule update --init --recursive
uv pip install -e ".[all]"
hermes gateway restart
```

Warn that rollback may cause config incompatibilities; run `hermes config check` after rollback.

Nix users update through Nix:

```bash
nix flake update hermes-agent
nix profile upgrade hermes-agent
nix profile rollback
```

## Backups And Restores

Full backup:

```bash
hermes backup
hermes backup -o /tmp/hermes.zip
```

Quick state-only backup:

```bash
hermes backup --quick
hermes backup --quick --label "pre-upgrade"
```

Backup includes Hermes configuration, skills, sessions, and data, but excludes the hermes-agent codebase. SQLite files are copied using SQLite's backup API so the snapshot is safe while Hermes is running.

Excluded from backup:

- SQLite WAL/shared-memory/journal sidecars.
- `checkpoints/` trajectory caches.
- The Hermes codebase itself.

Restore:

```bash
hermes import ~/hermes-backup-20260423.zip
hermes import ~/hermes-backup-20260423.zip --force
```

Stop the gateway before importing to avoid conflicts with running processes.

## Uninstall

Maintenance command documented:

```bash
hermes uninstall [--full] [--yes]
```

Use `--full` only when the user intends to delete config/data. Recommend `hermes backup` first.

Pip install uninstall path:

```bash
pip uninstall hermes-agent
```

## Troubleshooting Flow

General read-only sequence:

```bash
hermes --version
hermes config check
hermes status --all
hermes doctor
hermes logs errors --since 1h
hermes dump
```

Then targeted checks:

```bash
hermes gateway status
hermes logs gateway -n 100
hermes auth list
hermes mcp list
hermes mcp test <name>
hermes prompt-size --json
hermes security audit --json
```

Support bundle:

```bash
hermes debug share
hermes debug share --lines 500
hermes debug share --local
```

`hermes debug share` uploads system info and recent logs to a paste service. Keys are redacted. Use `--local` when upload is not acceptable.

## Common Symptoms

| Symptom                        | Safer diagnosis                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `hermes` command not found     | Reload shell, check PATH, verify install path, rerun installer or `hermes postinstall`. |
| API key not set                | Run `hermes model`, `hermes config set <KEY> <value>`, then `hermes config check`.      |
| Empty responses                | Check provider auth/model selection with `hermes model`, then `hermes doctor`.          |
| Gateway unreliable on WSL      | Use `hermes gateway run` inside `tmux` instead of service start.                        |
| Need shareable setup summary   | Use `hermes dump`, optionally `--show-keys` for redacted prefixes.                      |
| Need recent errors             | Use `hermes logs errors --since 1h` or filter by session/component.                     |
| Prompt too large               | Use `hermes prompt-size --json`, then reduce skills/toolsets/rules files.               |
| Need to bisect personal config | Run `hermes chat --ignore-user-config --ignore-rules -q "..."`.                         |
| Windows encoding bug           | Try `HERMES_DISABLE_WINDOWS_UTF8=1` only as a diagnostic workaround.                    |

## WSL And Windows Notes

- Native Windows support is early beta.
- WSL2 is recommended for the most stable Windows experience.
- The installer may provision PortableGit and set `HERMES_GIT_BASH_PATH`.
- 32-bit Windows may have limitations with PortableGit.
- The dashboard browser Chat tab requires WSL2/POSIX PTY support when using `--tui`.