---
name: dependency-installation
description: Guide for installing dependencies and packages in any project. Use this when asked to install, add, or manage dependencies across Node.js (npm, pnpm, yarn, bun), PHP (composer), or Python (pip, uv, poetry) projects.
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
2. **Find the version**: Retrieve the *exact* `latest` version number from the registry or documentation.
   - Do NOT assume a version.
   - Do NOT just run `install <package>` without checking unless explicitly told to.
   - Ideally, target a specific stable version tag (e.g., `@1.2.3`).

### Step 3: Verify Package Manager Availability
Before running commands, verify the package manager is installed:
```bash
# Node.js
npm --version   # or pnpm --version, yarn --version, bun --version

# PHP
composer --version

# Python
pip --version   # or uv --version, poetry --version
```

### Step 4: Install Dependencies

#### For Node.js (npm)
```bash
# Install all dependencies
npm install

# Add a production dependency
npm install <package-name>

# Add a dev dependency
npm install --save-dev <package-name>

# Add a global package
npm install -g <package-name>
```

#### For Node.js (pnpm)
```bash
# Install all dependencies
pnpm install

# Add a production dependency
pnpm add <package-name>

# Add a dev dependency
pnpm add -D <package-name>

# Add a global package
pnpm add -g <package-name>
```

#### For Node.js (yarn)
```bash
# Install all dependencies
yarn install

# Add a production dependency
yarn add <package-name>

# Add a dev dependency
yarn add --dev <package-name>

# Add a global package
yarn global add <package-name>
```

#### For Node.js (bun)
```bash
# Install all dependencies
bun install

# Add a production dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>
```

#### For PHP (composer)
```bash
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
pip install -r requirements.txt

# Install a package and add to requirements
pip install <package-name>
pip freeze > requirements.txt  # Update requirements file

# Install in development mode
pip install -e .
```

#### For Python (uv)
```bash
# Sync all dependencies
uv sync

# Add a dependency
uv add <package-name>

# Add a dev dependency
uv add --dev <package-name>

# Run with specific Python version
uv run --python 3.11 python script.py
```

#### For Python (poetry)
```bash
# Install all dependencies
poetry install

# Add a dependency
poetry add <package-name>

# Add a dev dependency
poetry add --group dev <package-name>

# Update dependencies
poetry update
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

## Best Practices

1. **Never mix package managers**: If a project uses pnpm, always use pnpm. Mixing npm and pnpm will create conflicts.

2. **Commit lock files**: Always commit lock files (`package-lock.json`, `pnpm-lock.yaml`, `composer.lock`, `uv.lock`, etc.) to version control.

3. **Use exact versions in production**: Consider using exact version constraints for production dependencies.

4. **Clean install in CI**: Use clean install commands (`npm ci`, `pnpm install --frozen-lockfile`, `composer install --no-dev`) in CI/CD pipelines.

5. **Check for vulnerabilities**: Run security audits regularly:
   - `npm audit` / `pnpm audit` / `yarn audit`
   - `composer audit`
   - `pip-audit` / `safety check`

## Quick Reference

| Action      | npm                  | pnpm              | yarn              | composer                     | pip                               | uv                 | poetry                  |
| ----------- | -------------------- | ----------------- | ----------------- | ---------------------------- | --------------------------------- | ------------------ | ----------------------- |
| Install all | `npm install`        | `pnpm install`    | `yarn`            | `composer install`           | `pip install -r requirements.txt` | `uv sync`          | `poetry install`        |
| Add pkg     | `npm install pkg`    | `pnpm add pkg`    | `yarn add pkg`    | `composer require pkg`       | `pip install pkg`                 | `uv add pkg`       | `poetry add pkg`        |
| Add dev     | `npm install -D pkg` | `pnpm add -D pkg` | `yarn add -D pkg` | `composer require --dev pkg` | `pip install pkg`                 | `uv add --dev pkg` | `poetry add -G dev pkg` |
| Remove      | `npm uninstall pkg`  | `pnpm remove pkg` | `yarn remove pkg` | `composer remove pkg`        | `pip uninstall pkg`               | `uv remove pkg`    | `poetry remove pkg`     |
| Update      | `npm update`         | `pnpm update`     | `yarn upgrade`    | `composer update`            | `pip install -U pkg`              | `uv sync`          | `poetry update`         |
