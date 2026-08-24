# Pi Harness Reference

Read this file only when running inside the **pi** harness (earendil-works/pi-coding-agent). It maps the generic delegation step of the main SKILL.md onto pi-specific capabilities.

## Delegation via `subagent` and `workflowScript`

Orchestrate review lanes through pi subagents using `workflowScript`. Always run review lanes in parallel with clean context and read-only toolsets (`@review-max`).

Construct the `workflowScript` dynamically to include `code-reviewer` plus the companion reviewers chosen via the decision matrix:

```typescript
subagent({
  workflowScript: `
    const scout = await runs.run("scout", {
      agent: "scout",
      task: "Inspect git diff, touched modules, and potential risk areas for scope: [scope]"
    });

    const reviews = await runs.all([
      {
        key: "code",
        agent: "code-reviewer",
        task: "Review diff and implementation against requirements.\\nScout Context:\\n" + scout.output
      },
      // Include companion reviewers based on selection matrix:
      {
        key: "security",
        agent: "security-reviewer",
        task: "Audit auth, input handling, and vulnerability risks.\\nScout Context:\\n" + scout.output
      },
      {
        key: "architect",
        agent: "architect",
        task: "Assess architectural boundaries, coupling, and tradeoffs.\\nScout Context:\\n" + scout.output
      }
    ]);

    return reviews;
  `
})
```

### Pi reviewer agents referenced by this skill

| Agent | Role in review |
| --- | --- |
| `code-reviewer` | Primary baseline lane (always) |
| `security-reviewer` | Security-focused companion lane |
| `architect` | Architecture/coupling companion lane |

### Rules specific to pi

- Review lanes run with clean context and read-only toolsets only.
- If a lane fails or its agent is unavailable, report the review as incomplete — never substitute self-review for a failed delegation lane.
