# Output Templates

Use the files under [example](example/) as a coherent fictional template set. Replace identifiers, revisions, repository path and proof/approval details before use. Preserve relative reference semantics when adopting another documentation layout. The example is draft material, not approval, a real test report or a launched mission.

- [Roadmap](example/docs/roadmaps/example/r1.md): omit it for a one-mission change.
- [Mission Contract](example/docs/missions/example/r1.md): retain the section responsibilities.
- [State](example/.missions/example/state.json) and [initial journal](example/.missions/example/history.jsonl): create together.
- [Packet](example/.missions/example/packet-r1.md): create only when the next assignment is ready; this illustrative file is deliberately not active in the example state.
- [Result](example/.missions/example/result-r1.json): replace with an actual independently authored result; never relabel this illustration as evidence.
- [Handoffs](handoffs.md): transmit verified context when an authorized fresh context is available, or let the user launch it.

Run the bundled validator on copied state and contracts after adapting paths. Presence of a field does not make its content sufficient for execution. Do not copy the entire example directory into every project: create only the artifacts needed for the present destination.
