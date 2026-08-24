---
name: mcp-development-best-practices
description: >
  Best practices and design philosophy for high-quality, agent-native Model
  Context Protocol (MCP) servers, applicable to any language SDK. Use when
  planning, auditing, or reviewing MCP server designs to ensure tools are
  optimized for LLM agent selection, usage, and reliability. For hands-on
  implementation guidance, delegate to the mcp-builder skill (local or fetched).
---

# MCP Development — Best Practices & Philosophy

This skill provides the design philosophy and quality standards for building agent-native MCP servers. It is intentionally **not** an implementation guide: it defines what a good MCP server looks like and why, not step-by-step build instructions.

## When to Use

- Planning or designing an MCP server before writing code (this skill).
- Reviewing or auditing an existing MCP server against quality standards (this skill).
- Building, scaffolding, or refactoring MCP server code (delegate to mcp-builder per the scope boundary above).

## When Not to Use

- Step-by-step server creation: use the `mcp-builder` skill directly.
- General API design unrelated to agent-tool interaction.

## Scope Boundary: Philosophy vs Implementation

- **This skill covers**: design principles, tool-discovery philosophy, primitives taxonomy, review checklists.
- **This skill does not cover**: SDK setup, scaffolding, code templates, language-specific workflows.

For actual development guidance:

1. **If the `mcp-builder` skill is available locally** (e.g. `.agents/skills/mcp-builder/SKILL.md`), use it for implementation. This skill provides the quality bar; mcp-builder provides the procedure.
2. **If it is not available locally**, fetch and read the source from [anthropics/skills — mcp-builder](https://github.com/anthropics/skills/tree/main/skills/mcp-builder), then follow its SKILL.md for the implementation workflow.

**Success criteria**: The implementation work starts from the local mcp-builder skill or its fetched source — never from ad-hoc invented steps.

## 1. Core Philosophy: Agent-Native Design

Treat your MCP server as a **product** where the "user" is an AI Agent. Agents are not just HTTP clients; they operate in a loop of **Thought -> Action -> Observation**. Your server must facilitate this loop.

### The Three Pillars

1.  **Discovery (Finding Tools)**
    *   **Naming Matters:** Use clear, "verb-noun" conventions (e.g., `search_web`, `create_ticket`). Names are the primary keyword for tool selection.
    *   **Description SEO:** Treat descriptions as SEO for agents. Explain *what* the tool does and *when* to use it.
    *   **Granularity:** Avoid "God Tools" (too complex) and "Micro-Tools" (too many steps). Aim for "Task-Sized" tools that represent a coherent unit of work.

2.  **Iteration (Using Tools)**
    *   **Feedback is Fuel:** Return rich, structured output. Instead of "200 OK", return the ID of the created object or a summary of the action.
    *   **Instructional Errors:** When a tool fails, provide error messages that guide the agent to a fix (e.g., "User ID not found. Available users: [A, B]").

3.  **Context (Knowing Information)**
    *   **Curated Context:** Don't dump everything into the prompt.
    *   **Use Resources:** Expose reference data (logs, docs, schemas) via `resources` so the agent can *read* them on demand.
    *   **Use Prompts:** Use `prompts` to guide the agent with specific Standard Operating Procedures (SOPs).

## 2. MCP Primitives

Understand the distinct role of each underlying primitive:

| Primitive     | Role                                                                               | Example                                       |
| :------------ | :--------------------------------------------------------------------------------- | :-------------------------------------------- |
| **Tools**     | **Actions**. Model-controlled functions that perform side effects or computations. | `search_flights`, `query_database`            |
| **Resources** | **Context**. Application-controlled data sources for reading information.          | `file:///logs/error.txt`, `postgres://schema` |
| **Prompts**   | **Workflows**. User-controlled templates to guide the model.                       | `review_code`, `debug_error`                  |

## 3. Implementation Rules (General)

Regardless of the language (Python, TypeScript, Go, Java), follow these rules:

1.  **Single Source of Truth**: Always adhere to the official SDK documentation for your language. Do not invent custom patterns that deviate from the standard protocol.
2.  **Transport Layer**:
    *   Default to **stdio transport** for local servers and desktop app integration (Claude Desktop, etc.).
    *   Ensure your server handles strict JSON-RPC message framing as managed by the SDK.
3.  **Error Handling**:
    *   Use the SDK's standard error reporting mechanisms.
    *   Return structured errors that help the LLM recover.
4.  **Security**:
    *   Treat all tool inputs as untrusted user input.
    *   Implement confirmation steps for sensitive actions if the SDK supports "human in the loop" or "confirmation" flags.

## 4. SDK Selection Philosophy

The choice of SDK is an implementation decision — mcp-builder covers the specifics. The philosophy that applies regardless of language:

1. **Single Source of Truth**: Always adhere to the official SDK documentation for your language. Do not invent custom patterns that deviate from the standard protocol.
2. **Match SDK to workload**: declarative frameworks (FastMCP, McpServer) for standard tool servers; low-level server classes only when you need fine-grained async or transport control.
3. **Validate at the boundary**: use the schema library idiomatic to the SDK (zod for TypeScript, pydantic via FastMCP for Python) so bad inputs are rejected before business logic runs.

Official SDKs and references:

- [MCP Documentation](https://modelcontextprotocol.io)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Java SDK](https://github.com/modelcontextprotocol/java-sdk)
- [Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk)

## 5. Development Checklist

Use this checklist to audit any MCP server design or implementation:

1.  [ ] **Tool Names**: unambiguous verb-noun pairs?
2.  [ ] **Descriptions**: clear purpose and trigger conditions?
3.  [ ] **Schemas**: simple, typed arguments?
4.  [ ] **Outputs**: descriptive, actionable return values?
5.  [ ] **Error Messages**: suggest fixes?
6.  [ ] **Resources**: reference data exposed as resources, not hardcoded context?
7.  [ ] **Prompts**: reusable workflows provided as prompts?
8.  [ ] **Transport**: stdio for local servers, SDK-managed JSON-RPC framing?
9.  [ ] **Security**: inputs treated as untrusted; sensitive actions gated?

## 6. Official Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Java SDK](https://github.com/modelcontextprotocol/java-sdk)
- [Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk)
