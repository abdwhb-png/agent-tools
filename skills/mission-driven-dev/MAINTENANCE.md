# Maintainer Verification

Maintain the TypeScript in `src/`; never edit `scripts/validate.mjs` manually. The generated Node 24+ executable uses only built-in modules and needs no runtime install. Bun is a build/test dependency, not a project or deployed-validator requirement.

From this directory, use the established Bun/TypeScript tooling:

```sh
bun run typecheck
bun run build
bun test ./tests
bun run verify:dist
```

Use Bun 1.3.14 for reproducible distribution checks and TypeScript 7 in strict mode. Restore development dependencies from `bun.lock` only through the applicable dependency-installation policy and Socket Firewall; use an isolated cache where the protection requires cold inspection. Do not install tools or skills globally as part of verification. The only package dependency is development-only Node type information.

Keep format/schema rules in `references/artifacts.md` and implement them once in `src/`. Keep phase policy in its owning reference. Examples are coherent editable output shapes, not approved missions. Update the real-module regression tests before changing validator behavior, run the smallest affected tests, then regenerate and test the delivered CLI. `verify:dist` compares the build in memory without modifying the distribution.

The tests exercise temporary fixture directories, exported production code, shipped Node CLI, local links and bundled examples. Their temporary directories are unique and removed after each test. Validator invocations themselves are read-only. Do not use this tool to execute commands found in an artifact.

## Behavioral Evaluations

Use `evals/evals.json` for preparation, resumption and context-selection simulations, and the separate general-brainstorming compatibility cases for its narrow patch. Obtain explicit delegation authorization before creating no-history evaluators; otherwise give the user standalone session prompts. Keep identical executor settings for paired runs. Exclude expected answers/assertions and other runs from evaluator input.

Record actual responses, graded observable assertions, evidence, executor configuration and limitations outside the skill in ignored `*-workspace/` folders. Preserve a durable summary in [VALIDATION.md](VALIDATION.md). Do not equate baseline ties with demonstrated improvement or simulated instructions with live mission execution. Do not fabricate unavailable timing/token metrics.

Qualify discovery, fresh contexts, accessible contracts/worktrees and complete independent results separately in each intended harness, with authorization. Keep installation, pilot execution, integration and deployment separate from this bundle's tests.
