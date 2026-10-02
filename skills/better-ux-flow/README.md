# better-ux-flow

An independent skill for making application tasks easier to understand, complete, and recover. It covers forms and journeys without forms. It follows the requested mode: diagnosis, specification, or implementation.

## Use

Preserve this whole directory when installing through your harness's supported skill mechanism. The skill needs no package, script, network lookup, companion skill, or particular product-document filename at runtime.

Standalone requests:

> Use better-ux-flow to simplify this account setup. New users cannot tell which information is required or what happens after Continue. Inspect the existing implementation, preserve the business rules, and implement the improvement with our current components.

> Use better-ux-flow to assess this 12-field contact form. Explain whether separate steps would help. Do not edit code.

> Use better-ux-flow to improve the task of comparing failed jobs and rerunning selected ones. There is no data-entry form. Keep the current design system.

Optional composition:

> Use better-ux-flow to define the decisions, transitions, and recovery behavior for this setup task. Use Impeccable for its visual composition, preserving those functional requirements and our existing design system.

Impeccable is optional. Without it, the skill completes the requested work using the project's components and conventions. It neither loads nor installs another skill automatically. A purely visual request belongs to the selected design workflow and does not need a flow redesign.

## Files

- [SKILL.md](SKILL.md): scope, task analysis, path selection, implementation, and verification.
- [Input and decision design](references/input-and-decision-design.md): control selection, mobile/autofill semantics, repeatable groups, and question wording. Load when designing or changing data entry.
- [Form behavior and recovery](references/form-behavior-and-recovery.md): conditional data, validation, focus, asynchronous checks, submission, destructive-action recovery, and persistence. Load only for relevant tasks.
- [Evaluation cases](evals/evals.json): self-contained prompts with observable expectations, including ambiguity and scope boundaries.

## Source decisions

The operational guidance is an original synthesis of selected practices, not a concatenation of upstream skills. No upstream code, design-system generator, or runtime dependency is bundled. These pinned revisions identify the material inspected for the initial version.

| Source | Material considered | Adaptation |
| --- | --- | --- |
| [better-web-ui/forms](https://github.com/aladicf/better-web-ui/blob/af21dcfa71d83104a9e0beb04ffedf79f800f53c/skills/forms/SKILL.md), plus its linked [validation](https://github.com/aladicf/better-web-ui/blob/af21dcfa71d83104a9e0beb04ffedf79f800f53c/skills/frontend-design/reference/form-validation-patterns.md), [live feedback](https://github.com/aladicf/better-web-ui/blob/af21dcfa71d83104a9e0beb04ffedf79f800f53c/skills/frontend-design/reference/live-validation-ux.md), [recovery](https://github.com/aladicf/better-web-ui/blob/af21dcfa71d83104a9e0beb04ffedf79f800f53c/skills/frontend-design/reference/error-recovery.md), and [disabled-action](https://github.com/aladicf/better-web-ui/blob/af21dcfa71d83104a9e0beb04ffedf79f800f53c/skills/frontend-design/reference/disabled-buttons-ux.md) references | Necessary information, timing, recovery, understandable blockers | Remove mandatory frontend-design/setup loading, fixed field-count thresholds, and universal conversion claims. Distinguish advisory checks from mandatory verification. |
| [form-ux-patterns](https://github.com/Bbeierle12/Skill-MCP-Claude/blob/ca3aef077400c3d75a9b594b4e7fb2f95ea54eef/skills/form-ux-patterns/SKILL.md) | Grouping, conditional fields, step navigation | Use task dependencies instead of a 5–7-field rule. Do not import React hooks, schemas, layout prescriptions, or a generic wizard abstraction. |
| [user-flows-and-guided-paths](https://github.com/dembrandt/dembrandt-skills/blob/b05848a01092232f869329cebf155ee802511765/skills/user-flows-and-guided-paths/SKILL.md) | Guided versus exploratory work, orientation, meaningful completion | Allow independent task lists. Avoid disabled-by-default progression, fixed minimum step counts, unconditional deep-link access, and assumed autosave. |
| [UI UX Pro Max quick reference](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/09170eec67eefd46a7ae85de61b40c194020f997/.claude/skills/ui-ux-pro-max/references/quick-reference.md) | Redundant entry, predictable back, status, error summary and focus | Retain functional accessibility and feedback guidance. Exclude palettes, typography rules, design-system generation, search tooling, and platform-specific styling. |
| [Designing with Impeccable](https://impeccable.style/designing/) (consulted 2026-10-02) | Explicit design authority and existing product/design context | Support optional composition without making Impeccable or its document names prerequisites. |

Upstream licensing differs. The inspected better-web-ui revision uses a [custom license](https://github.com/aladicf/better-web-ui/blob/af21dcfa71d83104a9e0beb04ffedf79f800f53c/LICENSE), while [form-ux-patterns](https://github.com/Bbeierle12/Skill-MCP-Claude/blob/ca3aef077400c3d75a9b594b4e7fb2f95ea54eef/LICENSE), [Dembrandt](https://github.com/dembrandt/dembrandt-skills/blob/b05848a01092232f869329cebf155ee802511765/LICENSE), and [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/09170eec67eefd46a7ae85de61b40c194020f997/LICENSE) use MIT licenses. Future maintainers should check the applicable terms before copying upstream text or code. This bundle does not redistribute those source files.

The input-design extension was checked against [MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode), [MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete), the [WAI combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), and GOV.UK guidance for [radios](https://design-system.service.gov.uk/components/radios/) and [text inputs](https://design-system.service.gov.uk/components/text-input/) on 2026-10-02. Use these as maintainer provenance, not runtime dependencies. The extension adds decision guidance without adopting those sources' visual systems.

## Validation

From the repository root, run the existing frontmatter validator with a Python environment that already provides PyYAML:

```sh
python3 skills/writing-skills/reference-skill-creator/scripts/quick_validate.py skills/better-ux-flow
python3 -m json.tool skills/better-ux-flow/evals/evals.json > /dev/null
```

Also check local Markdown links and the task diff. The frontmatter validator checks structure, not UX quality or trigger selection.

Run each evaluation prompt with the skill, inspecting the response against its expectations. For the first version, use local qualitative exercises with the authoring agent and record actual outputs and limitations under the ignored `skills/better-ux-flow-workspace/` directory. These exercises are neither an independent benchmark nor browser or user testing. Do not report comparative improvement, trigger accuracy, or usability gains from them.
