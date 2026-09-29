# Pi Harness Reference

Read this file only when running inside the **pi** harness (earendil-works/pi-coding-agent). It maps the generic delegation step of the main SKILL.md onto pi-specific capabilities.

The main SKILL.md names review *angles*. This file is where each angle becomes a real agent and a real toolset. Never hardcode an agent name or a `@tool-group` here either: both are the operator's configuration, not this skill's.

## Resolve angles to agents before launching

List what the host actually exposes, then match the user-confirmed angles onto it:

1. Call `subagent({ action: "list", capabilities: true })`.
2. Match each confirmed angle to an executable reviewer by its declared purpose. Ignore agents that are not executable, and ignore external-CLI agents whose runner is unavailable.
3. If an angle has no matching reviewer, say so and drop that angle from the report. Do not silently substitute a different reviewer for it.

## Delegation via `subagent` and `workflowScript`

Orchestrate the resolved lanes through a `workflowScript`. Every lane runs with clean context and read-only tools; the agent's own declaration supplies the toolset.

Resolve lane assignments before building the script, then emit them as data:

```typescript
// `lanes` is the output of the resolution step above, not a hardcoded list.
// Each entry: { key, agent, task }, where `agent` is a name the host reported executable.
subagent({
  workflowScript: `
    const lanes = ${JSON.stringify(lanes)};
    const reviews = await runs.all(lanes);
    return reviews;
  `
})
```

Keep each `key` stable and tied to the review angle it covers, not to its position in the array. Stable keys are what make a partial fan-out recoverable: you can identify and revive the lane that failed instead of re-running the whole set.

## Child tool contracts

Read this before choosing a reviewer or changing any reviewer configuration.

- A child agent's `tools` field is a **strict allowlist of names**. It does not load the extension that registers an extension-owned tool.
- An allowlist naming an extension-owned tool is safe in the parent and **transport-dependent in a child**: foreground children never load the parent's ambient extensions, while background children do. Pi refuses to start the run and names the unavailable tool when the provider is missing.
- Foreground children also cannot resolve `@tool-group` aliases, because group expansion travels through a private child policy binding rather than the agent file.
- When a run fails with an unavailable-tool error, the fix belongs in the toolset or the agent's child-only extension configuration, not in the launch arguments. Do not retry the same launch.

## Deadlines

- A composite workflow has **no default parent deadline**. Do not set one.
- Never set a deadline shorter than the expected review duration. A fan-out of fresh-context lanes over a large diff routinely needs far more than a couple of minutes, and a deadline short enough to expire kills lanes that were making progress and destroys their partial evidence.
- When a bound is genuinely required, set it deliberately and pair it with `checkpointBeforeDeadlineMs` on each child so the child reports what it has before the deadline instead of dying mid-turn.

## Rules specific to pi

- Review lanes run with clean context and read-only tools only.
- A lane failure, whether from an unavailable tool, a provider error, or a deadline, is reported as incomplete coverage. Never substitute self-review for a failed lane.

## Known risk in this harness

The `@review` and `@review-max` tool groups in this installation include a think-extension tool (`think_artifact_search`). That makes every agent whose frontmatter names those groups parent-safe but transport-dependent in a child.

- Observed: reviewer lanes failed with `requested unavailable child tools` on 2026-09-19 and 2026-09-28.
- Not reproducing: the same agents passed the capability audit on 2026-09-29, when lanes were launched as background children.
- Two available fixes, neither applied: give the child the provider through the agent's child-only extension list, or split the group so the read-only reviewer set contains only builtin and always-loaded tools.

Until it recurs, prefer the group split: one change, no extension loaded into children that never call it, and no dependence on foreground versus background.
