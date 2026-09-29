---
{
  "schemaVersion": 1,
  "kind": "packet",
  "id": "example-attempt-1",
  "revision": 1,
  "mission": { "kind": "mission", "id": "example", "revision": 1, "path": "../../docs/missions/example/r1.md" },
  "baseCommit": "0000000000000000000000000000000000000000"
}
---
# Example packet — not launched

## Objective and Prerequisites

Specify one bounded assignment. Replace the illustrative all-zero baseCommit with the verified accepted Git object id. Verify the actual worktree and contract before launch.

## File Scope and Exclusions

List the relevant owning modules, expected changes and exclusions. Do not expand scope to make a test pass.

## Validation and Handoff

State required RED/GREEN evidence, focused regressions, applicable real-use checks, provenance and checks not run. Return a report to the coordinator; do not self-accept.

## Authority

Record explicit permissions and prohibitions, including delegation and Git actions. This example grants none.
