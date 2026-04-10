---
name: dependency-installation
description: Guide for installing dependencies and packages in any project. Use this whenever asked to install, add, update, or manage dependencies across Node.js (npm, pnpm, yarn, bun), PHP (composer), or Python (pip, uv, poetry, pipenv) projects. This skill should be used by default for dependency changes because it enforces package-manager detection, version verification, and mandatory Socket Firewall (`sfw`) wrapping for supported ecosystems before networked installs.
---

# Dependency Installation Skill

This skill helps you install and manage dependencies across different project types and package managers.

## When to use this skill

Use this skill when you need to:

- Install a new dependency or package in a project
- Add dev/development dependencies
- Update existing packages
- Resolve dependency conflicts
- Set up a new project's dependencies

## Package Manager Detection

**IMPORTANT**: Before installing any dependency, you MUST detect the correct package manager for the project by checking for the presence of these files in the project root:

### Node.js Projects

| Lock File                | Package Manager | Install Command | Add Command         |
| ------------------------ | --------------- | --------------- | ------------------- |
| `pnpm-lock.yaml`         | pnpm            | `pnpm install`  | `pnpm add <pkg>`    |
| `yarn.lock`              | yarn            | `yarn install`  | `yarn add <pkg>`    |
| `bun.lockb`              | bun             | `bun install`   | `bun add <pkg>`     |
| `package-lock.json`      | npm             | `npm install`   | `npm install <pkg>` |
| `package.json` (no lock) | npm (default)   | `npm install`   | `npm install <pkg>` |

### PHP Projects

| Lock File                          | Package Manager | Install Command    | Add Command              |
| ---------------------------------- | --------------- | ------------------ | ------------------------ |
| `composer.lock` or `composer.json` | composer        | `composer install` | `composer require <pkg>` |

### Python Projects

| Lock/Config File                                       | Package Manager | Install Command                   | Add Command                                        |
| ------------------------------------------------------ | --------------- | --------------------------------- | -------------------------------------------------- |
| `uv.lock` or `pyproject.toml` with `[tool.uv]`         | uv              | `uv sync`                         | `uv add <pkg>`                                     |
| `poetry.lock` or `pyproject.toml` with `[tool.poetry]` | poetry          | `poetry install`                  | `poetry add <pkg>`                                 |
| `Pipfile.lock` or `Pipfile`                            | pipenv          | `pipenv install`                  | `pipenv install <pkg>`                             |
| `requirements.txt`                                     | pip             | `pip install -r requirements.txt` | `pip install <pkg>` (then update requirements.txt) |
| `pyproject.toml` (generic)                             | pip             | `pip install .`                   | Edit pyproject.toml                                |

## Socket Firewall Policy

**IMPORTANT**: Socket Firewall is mandatory for every supported networked dependency install, add, sync, update, or restore command.

Socket Firewall Free currently supports:

- `npm`
- `pnpm`
- `yarn`
- `pip`
- `uv`
- `cargo`

It does **not** directly cover:

- `bun`
- `composer`
- `poetry`
- `pipenv`

### Required behavior

1. **Before any supported install command, check for `sfw`** with `sfw --version`.
2. **If `sfw` is missing, install it first** using the official recommended path:
   ```bash
   npm i -g sfw
   sfw --version
   ```
3. **Prefix every supported package-manager command with `sfw`**.
4. **Do not silently bypass Socket Firewall** for supported package managers.
5. **If the ecosystem is unsupported by Socket Firewall, refuse by default.**
6. For unsupported ecosystems, proceed **only if the user explicitly approves bypassing `sfw`** after being told that the install cannot be protected by Socket Firewall with the current toolchain.
7. Never treat silence, urgency, or implied consent as approval to bypass `sfw`.
8. If cached artifacts could bypass protection, prefer clearing the relevant cache first or explain the limitation to the user. Socket Firewall blocks network fetches, so it cannot block already-cached artifacts.

## Installation Process

Follow these steps when installing dependencies:

### Step 1: Detect Project Type and Package Manager

1. List files in the project root directory
2. Look for lock files and configuration files listed above
3. Identify the correct package manager based on the detection table
4. If multiple ecosystems exist (e.g., Node.js + Python), handle each separately

### Step 2: Verify Package & Version (MANDATORY)

**Before running any install command, if the package version is not explicitly specified by the user, you MUST:**

1. **Search for the official package**: Ensure you have the correct package name (check official docs or registry).
   - Avoid "package squatting" or similar names.
   - Confirm it is the actual library requested.
2. **Find the version**: Retrieve the _exact_ `latest` version number from the registry or documentation.
   - Do NOT assume a version.
   - Do NOT just run `install <package>` without checking unless explicitly told to.
   - Ideally, target a specific stable version tag (e.g., `@1.2.3`).

### Step 3: Verify Package Manager Availability

Before running commands, verify the package manager is installed. If the package manager is supported by Socket Firewall, also verify `sfw` is installed:

```bash
# Node.js
npm --version   # or pnpm --version, yarn --version, bun --version
sfw --version

# PHP
composer --version

# Python
pip --version   # or uv --version, poetry --version
```

### Step 4: Enforce Socket Firewall

For supported ecosystems (`npm`, `pnpm`, `yarn`, `pip`, `uv`), install Socket Firewall if needed and run dependency commands through `sfw`.

```bash
npm i -g sfw
sfw --version
```

If the command will fetch packages from the network and the package manager is supported, the command should look like `sfw <package-manager> ...`.

If the ecosystem is unsupported by Socket Firewall (`bun`, `composer`, `poetry`, `pipenv`), stop and request explicit approval before running any networked dependency command without `sfw`.

### Step 5: Install Dependencies

#### For Node.js (npm)

```bash
# Install all dependencies
sfw npm install

# Add a production dependency
sfw npm install <package-name>

# Add a dev dependency
sfw npm install --save-dev <package-name>

# Add a global package
sfw npm install -g <package-name>
```

#### For Node.js (pnpm)

```bash
# Install all dependencies
sfw pnpm install

# Add a production dependency
sfw pnpm add <package-name>

# Add a dev dependency
sfw pnpm add -D <package-name>

# Add a global package
sfw pnpm add -g <package-name>
```

#### For Node.js (yarn)

```bash
# Install all dependencies
sfw yarn install

# Add a production dependency
sfw yarn add <package-name>

# Add a dev dependency
sfw yarn add --dev <package-name>

# Add a global package
sfw yarn global add <package-name>
```

#### For Node.js (bun)

```bash
# Socket Firewall Free does not currently support bun directly.
# Refuse by default. Only proceed if the user explicitly approves bypassing sfw.

# Install all dependencies
bun install

# Add a production dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>
```

#### For PHP (composer)

```bash
# Socket Firewall Free does not currently support composer directly.
# Refuse by default. Only proceed if the user explicitly approves bypassing sfw.

# Install all dependencies
composer install

# Add a production dependency
composer require <package-name>

# Add a dev dependency
composer require --dev <package-name>

# Update dependencies
composer update
```

#### For Python (pip)

```bash
# Install from requirements.txt
sfw pip install -r requirements.txt

# Install a package and add to requirements
sfw pip install <package-name>
pip freeze > requirements.txt  # Update requirements file

# Install in development mode
sfw pip install -e .
```

#### For Python (uv)

```bash
# Sync all dependencies
sfw uv sync

# Add a dependency
sfw uv add <package-name>

# Add a dev dependency
sfw uv add --dev <package-name>

# Run with specific Python version
uv run --python 3.11 python script.py
```

#### For Python (poetry)

```bash
# Socket Firewall Free does not currently support poetry directly.
# Refuse by default. Only proceed if the user explicitly approves bypassing sfw.

# Install all dependencies
poetry install

# Add a dependency
poetry add <package-name>

# Add a dev dependency
poetry add --group dev <package-name>

# Update dependencies
poetry update
```

#### For Python (pipenv)

```bash
# Socket Firewall Free does not currently support pipenv directly.
# Refuse by default. Only proceed if the user explicitly approves bypassing sfw.

# Install all dependencies
pipenv install

# Add a dependency
pipenv install <package-name>

# Add a dev dependency
pipenv install --dev <package-name>
```

## Common Issues and Solutions

### Issue: Lock file mismatch

If you see errors about lock file conflicts:

- Delete the existing lock file
- Run the install command again
- Commit the new lock file

### Issue: Permission denied

For global installations that fail:

- Use `sudo` on Linux/macOS (not recommended)
- Configure npm/pnpm to use a user directory
- Consider using a version manager (nvm, pyenv)

### Issue: Version conflicts

- Check the error message for conflicting packages
- Update conflicting packages or adjust version constraints
- Use `--force` or `--legacy-peer-deps` (npm) as last resort

### Issue: Package not found

- Verify the package name is correct
- Check if the package exists in the correct registry
- For private packages, ensure authentication is configured

### Issue: Socket Firewall is not installed

- Install it with `npm i -g sfw`
- Verify with `sfw --version`
- Retry the dependency command with the `sfw` prefix

### Issue: Socket Firewall did not block a malicious dependency

- Check whether the dependency was already cached locally
- Clear the package-manager cache if appropriate, then retry with `sfw`
- Remember that Socket Firewall Free only blocks supported package managers and known malicious artifacts fetched over the network

### Issue: The project uses an unsupported package manager

- Refuse the install by default
- Explain that `sfw` does not currently protect that ecosystem
- Ask the user for explicit approval to bypass Socket Firewall
- Only proceed after the user clearly approves the bypass

## Best Practices

1. **Never mix package managers**: If a project uses pnpm, always use pnpm. Mixing npm and pnpm will create conflicts.

2. **Treat Socket Firewall as required safety gear**: For supported package managers, never run raw install/update commands without the `sfw` prefix.

3. **Commit lock files**: Always commit lock files (`package-lock.json`, `pnpm-lock.yaml`, `composer.lock`, `uv.lock`, etc.) to version control.

4. **Use exact versions in production**: Consider using exact version constraints for production dependencies.

5. **Clean install in CI**: Use clean install commands (`sfw npm ci`, `sfw pnpm install --frozen-lockfile`, `composer install --no-dev`) in CI/CD pipelines where supported.

6. **Unsupported ecosystems require explicit risk acceptance**: For `bun`, `composer`, `poetry`, and `pipenv`, do not proceed with dependency fetches unless the user explicitly approves bypassing `sfw`.

7. **Check for vulnerabilities**: Run security audits regularly:
   - `npm audit` / `pnpm audit` / `yarn audit`
   - `composer audit`
   - `pip-audit` / `safety check`

## Quick Reference

| Action      | npm                      | pnpm                  | yarn                  | composer                     | pip                                   | uv                     | poetry                  |
| ----------- | ------------------------ | --------------------- | --------------------- | ---------------------------- | ------------------------------------- | ---------------------- | ----------------------- |
| Install all | `sfw npm install`        | `sfw pnpm install`    | `sfw yarn`            | `composer install`           | `sfw pip install -r requirements.txt` | `sfw uv sync`          | `poetry install`        |
| Add pkg     | `sfw npm install pkg`    | `sfw pnpm add pkg`    | `sfw yarn add pkg`    | `composer require pkg`       | `sfw pip install pkg`                 | `sfw uv add pkg`       | `poetry add pkg`        |
| Add dev     | `sfw npm install -D pkg` | `sfw pnpm add -D pkg` | `sfw yarn add -D pkg` | `composer require --dev pkg` | `sfw pip install pkg`                 | `sfw uv add --dev pkg` | `poetry add -G dev pkg` |
| Remove      | `npm uninstall pkg`      | `pnpm remove pkg`     | `yarn remove pkg`     | `composer remove pkg`        | `pip uninstall pkg`                   | `uv remove pkg`        | `poetry remove pkg`     |
| Update      | `sfw npm update`         | `sfw pnpm update`     | `sfw yarn upgrade`    | `composer update`            | `sfw pip install -U pkg`              | `sfw uv sync`          | `poetry update`         |
