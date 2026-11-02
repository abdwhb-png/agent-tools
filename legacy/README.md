# Legacy Retained Sources

This tree holds retired canonical content. Nothing here is loaded by `harness-sync`, rendered into a harness, or kept under ownership tracking. The files are preserved so the reasoning and prompts remain inspectable, and so a retirement can be reversed deliberately instead of reconstructed from memory.

To restore an entry, move its directory back under `agents/`, then run `agent-sync sync` and adopt the resulting targets. Restoring is a normal catalog change and re-creates native profiles in every enabled harness.

## Retired roles

| Role | Reason |
| --- | --- |
| `videographer` | Video analysis moved to the direct YouTube tools and the `youtube-analysis` skill. The role added two MCP server bindings and a per-harness profile surface without unique responsibility, and the owning user retired it from all harnesses. |
