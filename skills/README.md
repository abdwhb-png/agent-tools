# Agent Skills

Reusable, standalone workflows and specialist domain capabilities for AI coding agents following the [Agent Skills standard](https://skills.sh/).

Each directory in this folder defines a self-contained skill anchored by a `SKILL.md` entrypoint, accompanied by its supporting references, evaluation suites, or automation scripts.

## Discovering Skills

To list all available skills in this repository without maintaining a static list:

```bash
# List all skills with their descriptions from the repository root
npx skills add . --list

# Or list skills directly from the local path
npx skills add /path/to/agent-tools --list
```

You can also inspect the installed skills across your environment:

```bash
# List globally installed skills and linked agents
npx skills ls -g

# List skills installed in the current project
npx skills ls
```

## Installation & Synchronization

Skills can be installed and synchronized across all supported agent harnesses (Codex, Antigravity, Claude Code, Gemini CLI, Pi, Cursor, etc.) using the [`skills` CLI](https://skills.sh/).

### Global Installation (User Level)

Installed to `~/.agents/skills/` and symlinked to supported agent directories.

#### 1. Local Repository (Immediate Development Sync)
When editing or testing skills locally without pushing to GitHub:

```bash
# Sync a specific skill
npx skills add /path/to/agent-tools -g --skill <skill-name> -y

# Sync all skills
npx skills add /path/to/agent-tools -g --skill '*' -y
```

#### 2. Remote Repository (GitHub)
When pulling updates from the canonical remote:

```bash
# Install or re-install a specific skill
npx skills add abdwhb-png/agent-tools -g --skill <skill-name> -y

# Update all globally installed skills to their latest versions
npx skills update -g
```

### Project-Level Installation

Installs a skill locally into the active project workspace (`.agents/skills/`):

```bash
# Add to current project
npx skills add /path/to/agent-tools --skill <skill-name>

# Restrict installation to specific agents
npx skills add /path/to/agent-tools --skill <skill-name> --agent claude-code codex
```

---

## Skill Authoring Guidelines

Every skill in this directory follows the [Agent Skills standard](https://skills.sh/):

1. **`SKILL.md` Entrypoint:**
   - **Frontmatter**: Must include `name` and `description` (used by agents for semantic intent matching).
   - **Overview & Role**: The core operational mindset of the skill.
   - **When to Use / When Not to Use**: Clear activation boundaries to avoid inappropriate triggering.
   - **The Process / Protocol**: Actionable, step-by-step instructions.
   - **Key Principles & Mandatory Rules**: Guardrails enforcing evidence verification and tool usage.

2. **Supporting Directories (Optional):**
   - `evals/`: Evaluation prompts, expected outputs, and verification benchmarks.
   - `references/`: Domain references, cheat sheets, or background documents consulted during execution.
   - `scripts/`: Deterministic helper scripts used by the skill.

3. **Development Workspaces (`*-workspace/`):**
   - Sandbox directories used for skill testing, evals, and iteration. Keep workspaces separate from the canonical skill folders.
