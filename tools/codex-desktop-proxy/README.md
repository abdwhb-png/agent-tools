# Codex Desktop developer instruction proxy (A1)

This tool extends the already-installed Windows/WSL project-path proxy so that Codex Desktop's `developerInstructions` includes the complete effective `developer_instructions` from the backend configuration. The canonical source lives in `agent-tools`. The installed proxy and the historical installer's source copy are generated deployment copies.

## Behavior

Desktop's host override takes precedence over configured developer instructions in the tested backend, `codex-cli 0.162.0-alpha.2`. Synchronizing `config.toml` alone therefore does not guarantee delivery in Desktop. For `thread/start`, `thread/resume`, and `thread/fork` requests with a string `developerInstructions`, this proxy asks the same running backend for `config/read`, preserves the host text, and appends the entire configured block in the same developer role.

The backend resolves its own configuration layers, active profile and project trust. An explicit request `config.developer_instructions` string wins over that resolved value. For resume/fork without an explicit `cwd`, `thread/read` supplies the source thread's working directory. Other request parameters remain intact. Requests with absent or null host instructions pass through, allowing the backend's normal configuration behavior.

An owned block includes its character count and SHA-256 so subsequent requests can replace it without duplication. An empty configured value removes a previous owned block. A complete unwrapped configured block already present in the host text is retained once. Invalid owned blocks fail explicitly. Internal RPC identifiers and responses stay inside the proxy. Client replies, backend notifications and unrelated requests continue flowing while configuration is resolved.

Resolution waits for the backend response without an additional proxy deadline. Slow reads keep the thread request pending while unrelated requests, notifications and client replies continue flowing. Backend rejection, disconnection, missing source metadata and invalid types return an explicit JSON-RPC error to the original caller without forwarding the target thread request. Desktop retains its own request timeout behavior. Experimental `path` or `history` resume/fork requests require an explicit `cwd`. Logs contain method names, stages, internal RPC identifiers, elapsed time, lengths, hashes and controlled diagnostic messages. The proxy does not log instruction content or raw configuration errors.

The existing Windows/UNC project-root translation and ordinary CLI delegation remain available. A1 applies to Desktop launches that use this proxy. It does not modify native Windows CLI installations, global configuration files, or the question-card UI. Delivery cannot guarantee that a model follows every instruction.

## Requirements and installation

Use Python 3.11+ for installation and verification, with no third-party dependencies. The runtime proxy itself supports Python 3.10+. This installer upgrades an existing `codex-wsl-project-fix` installation. It expects both the runtime proxy and `source/codex-app-server-proxy`, and checks the original upstream checksum or the checksum from its previous installation record. It rejects unknown edits and symlink destinations.

From the repository root, run:

```sh
python3 tools/codex-desktop-proxy/install.py install \
  --install-dir /mnt/c/Users/winne/CodexFixes
```

The installer writes each replacement atomically, keeps executable permissions, saves both previous copies and its owned documents in `backups/instruction-merge-<timestamp>-<id>/`, and records checksums in `instruction-merge-installation.json`. A failed installation restores the snapshot. Repeating an unchanged installation reuses its existing backup. It does not change `CODEX_CLI_PATH`, edit Codex configuration, or stop processes. Run one installation or rollback at a time.

The existing Windows user environment variable must continue pointing to `C:\Users\winne\CodexFixes\codex-app-server-proxy`. The historical source mirror is updated so running the old installer again uses the extended proxy. Its original README and installation records describe the original path-only fix. `A1-INSTRUCTIONS.md` and `instruction-merge-installation.json` describe this extension.

**Activation:** finish any ongoing tasks, fully quit Codex Desktop including its tray process, then reopen it. The already-running Python proxy keeps its loaded code until restart. A thread already loaded by the backend may ignore resume overrides. Cold start/resume/fork were validated with the actual binary, but activation in the user's reopened Desktop session must be confirmed separately.

## Verification

Run the focused suite from the repository root:

```sh
python3 -m unittest discover -s tools/codex-desktop-proxy/tests -v
```

The subprocess tests execute the actual proxy against a controllable external backend. They cover instruction delivery, existing host preservation, Unicode, refresh/idempotence, trust-context routing, explicit overrides, failure boundaries, reads exceeding ten seconds, concurrency, client replies and EOF. The original upstream path/delegation tests are retained. Installer tests cover install, repeat install, upgrade, rollback, checksum protection, symlink rejection, corrupted backups and filesystem failure recovery.

Verify the selected binary without changing the current app process:

```sh
CODEX_HOME=/mnt/c/Users/winne/.codex \
  /mnt/c/Users/winne/CodexFixes/codex-app-server-proxy --codex-fixes-doctor
```

Verify actual outbound model requests using the installed backend and proxy:

```sh
python3 tools/codex-desktop-proxy/verify-model-delivery.py \
  --binary /mnt/c/Users/winne/.codex/bin/wsl/a9192f889b509711/codex \
  --proxy /mnt/c/Users/winne/CodexFixes/codex-app-server-proxy \
  --instruction-config /mnt/c/Users/winne/.codex/config.toml
```

The probe reads only the developer instruction value from the supplied configuration and places it in an isolated temporary Codex home. It captures requests at a credential-free localhost model stub and intentionally returns HTTP 400 to stop generation. It validates complete instruction text in the developer role for start, cold resume, fork, explicit overrides and trusted/untrusted project configuration. Output contains hashes, lengths and validation results. It does not send real model requests, expose configuration contents, or alter live threads. Recheck the binary path after upgrading Desktop.

## Rollback A1

Read the `backup` field in `instruction-merge-installation.json`, then run:

```sh
python3 tools/codex-desktop-proxy/install.py rollback \
  --backup /mnt/c/Users/winne/CodexFixes/backups/instruction-merge-<timestamp>-<id>
```

Rollback verifies current ownership and backup checksums before restoring both proxy copies and prior A1 metadata/documents. It refuses subsequent local edits. A failed rollback restores the installed files so it can be retried. Fully quit and reopen Desktop afterward to load the restored proxy. This removes only the selected A1 upgrade. The historical `rollback.ps1` and `remove-fix.ps1` remove the entire WSL workaround and serve a different purpose.

## Provenance

The original proxy and its twelve tests were imported from [husseinkaraki/codex-wsl-project-fix](https://github.com/husseinkaraki/codex-wsl-project-fix/tree/8e98be6d385ae3e8bc991463ec4c880ac2cdd3e6), revision `8e98be6d385ae3e8bc991463ec4c880ac2cdd3e6`, version `1.0.0`. The original proxy SHA-256 is `1c6f75bbe033944cec8745525f0f83e0410eecbd3738d8c752f0180721faa8ae`. This extension is version `1.1.1` and retains the upstream marker used for recursive-proxy detection. Changes and future fixes belong in this canonical directory, followed by testing and reinstalling the generated copies.

## Version 1.1.1: premature resolution failure

Version 1.1.0 added a shared ten-second deadline across thread metadata and configuration reads. In the user's active Desktop session, valid `thread/resume` requests failed with `Codex Fixes: instruction resolution timed out; thread request was not forwarded`, although Desktop allowed 120–240 seconds. Backend logs also showed an ordinary `config/read` spending about 25 seconds before its configuration-layer diagnostics. Independent read-only probes against the same real configuration and Desktop environment returned the target thread metadata and configuration in under two seconds. The latency is therefore dependent on the active connection or its workload. The exact cause of that live connection's delay remains unconfirmed.

The regression test demonstrated that a healthy configuration reply after 10.3 seconds was rejected. Version 1.1.1 removes the extra proxy timer instead of increasing its threshold. The same test now completes the resume with both instruction blocks, and another test covers six seconds of metadata lookup followed by six seconds of configuration lookup. Transport failures and backend rejection remain explicit errors. Query-stage and elapsed-time diagnostics allow future live failures to be traced without logging prompts. Activation in the user's restarted Desktop session remains a separate check from these controlled tests and read-only probes.
