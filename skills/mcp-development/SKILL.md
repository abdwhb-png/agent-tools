---
name: mcp-development
description: Design principles and best practices for building high-quality, agent-native Model Context Protocol (MCP) servers in any language. Use this skill when planning, building, or refactoring MCP servers to ensure they are optimized for LLM agent selection, usage, and reliability.
---

# MCP Development Guide

This skill provides a unified framework for building high-quality MCP servers. It combines "Agent-Native Product Design" principles with rigorous implementation standards, applicable to any language SDK (Python, TypeScript, Go, etc.).

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

## 4. SDK-Specific Guidelines

### Python (`python-sdk`)
**Best for**: General automation, AI agents, data science integration.
- **Package**: `mcp`
- **Installation**: `uv add mcp` (recommended) or `pip install mcp`
- **Key Concepts**:
  - Use `FastMCP` for quick, declarative server creation.
  - Use low-level `Server` for complex, asynchronous workflows.
- **Reference**: [python-sdk README](https://github.com/modelcontextprotocol/python-sdk)
- **Quick Start**:
  ```python
  from mcp.server.fastmcp import FastMCP
  
  mcp = FastMCP("weather")
  
  @mcp.tool()
  def get_weather(location: str) -> str:
      return f"Sunny in {location}"
  
  if __name__ == "__main__":
      mcp.run()
  ```

### TypeScript / Node.js (`typescript-sdk`)
**Best for**: Web integrations, browser-based tools, heavy I/O operations.
- **Package**: `@modelcontextprotocol/sdk`
- **Installation**: `npm install @modelcontextprotocol/sdk zod`
- **Key Concepts**:
  - `McpServer` class for managing capabilities.
  - `zod` for robust schema validation.
- **Reference**: [typescript-sdk README](https://github.com/modelcontextprotocol/typescript-sdk)
- **Quick Start**:
  ```typescript
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  import { z } from "zod";
  
  const server = new McpServer({ name: "weather-server", version: "1.0.0" });
  
  server.tool(
    "get_weather",
    { location: z.string() },
    async ({ location }) => ({ content: [{ type: "text", text: `Sunny in ${location}` }] })
  );
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  ```

### Java (`java-sdk`)
**Best for**: Enterprise integrations, Spring Boot applications, high-performance services.
- **Artifacts**: `io.modelcontextprotocol:mcp` (Core), `io.modelcontextprotocol:mcp-spring` (Spring support).
- **Build Tool**: Maven or Gradle.
- **Key Concepts**:
  - Sync and Async (Reactor) APIs.
  - Spring Boot starters for rapid development.
- **Reference**: [java-sdk README](https://github.com/modelcontextprotocol/java-sdk)
- **Quick Start (Spring)**:
  ```xml
  <dependency>
      <groupId>io.modelcontextprotocol</groupId>
      <artifactId>mcp-spring</artifactId>
      <version>${mcp.version}</version>
  </dependency>
  ```

### Kotlin (`kotlin-sdk`)
**Best for**: Modern JVM applications, Multiplatform targeting (JVM, JS, Native).
- **Artifacts**: `io.modelcontextprotocol:kotlin-sdk`
- **Installation**:
  ```kotlin
  implementation("io.modelcontextprotocol:kotlin-sdk:$mcpVersion")
  ```
- **Key Concepts**:
  - Coroutine-native API.
  - DSL for defining tools and resources.
- **Reference**: [kotlin-sdk README](https://github.com/modelcontextprotocol/kotlin-sdk)
- **Quick Start**:
  ```kotlin
  val server = Server(
      serverInfo = Implementation("my-server", "1.0"),
      options = ServerOptions(components = ServerComponents(logging = true))
  )
  ```

## 5. Development Checklist

1.  [ ] **Tool Names**: unambiguous verb-noun pairs?
2.  [ ] **Descriptions**: clear purpose and trigger conditions?
3.  [ ] **Schemas**: simple, typed arguments?
4.  [ ] **Outputs**: descriptive, actionable return values?
5.  [ ] **Error Messages**: suggest fixes?
6.  [ ] **Resources**: reference data exposed as resources, not hardcoded context?
7.  [ ] **Prompts**: reusable workflows provided as prompts?
8.  [ ] **SDK Best Practices**: adhere to the specific guidelines for your chosen language?

## 6. Official Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Java SDK](https://github.com/modelcontextprotocol/java-sdk)
- [Kotlin SDK](https://github.com/modelcontextprotocol/kotlin-sdk)
