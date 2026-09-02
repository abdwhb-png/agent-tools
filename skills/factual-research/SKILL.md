---
name: factual-research
description: Conduct factual research, official documentation lookup, solution comparison, web page content extraction, video analysis, and user clarification. Use when verifying facts, finding current best practices, fetching web content, consulting official API docs, or comparing technical solutions.
---

# Factual Research

Select and apply the appropriate research tools to verify facts, extract web data, consult official documentation, compare technical solutions, analyze video content, or clarify ambiguous requirements.

## When to Use

- Verifying current best practices, industry benchmarks, or modern implementation patterns.
- Looking up official package, SDK, framework, or API documentation.
- Extracting full text, structured data, or markdown from specific web URLs.
- Conducting buy-versus-build assessments or comparing competing technologies and vendors.
- Analyzing YouTube videos or multimedia resources for technical information.
- Clarifying ambiguous, underspecified, or conflicting user requests before research.

## When Not to Use

- Local code refactoring, local bug fixing, or workspace navigation where local files provide sufficient ground truth.
- Creating skills from scratch (use `writing-skills`).
- Executing pure implementation tasks without an open research or verification question.

---

## Tool Selection Matrix

Choose the appropriate tool based on the research objective:

| Research Objective | Primary Tool Capability | When to Use | Complementary Tools |
|---|---|---|---|
| **Factual Searches & Best Practices** | Web search (`exa`) | Finding current trends, community benchmarks, implementation patterns, and comparison articles. | Web page extraction (`firecrawl`) when search snippets are insufficient. |
| **Web Page Content Extraction** | Web extraction (`firecrawl` / fetch) | Reading full article text, converting pages to clean markdown, or extracting structured JSON from a known URL. | Web search (`exa`) to discover target URLs first. |
| **Official Documentation** | Package docs (`context7`) | Reading official API references, setup guides, and framework documentation. | Web search (`exa`) + web extraction (`firecrawl`) for external reviews and benchmarks. |
| **Solution & Vendor Comparison** | Web search (`exa`) + Web extraction (`firecrawl`) | Comparing tools, evaluating buy-vs-build, or checking real-world developer sentiment. | Package docs (`context7`) for official capability validation. |
| **Video Content Analysis** | Video analysis tools | Extracting transcripts, timestamps, summaries, or citations from video links. | Web search (`exa`) to cross-reference video claims. |
| **Ambiguity Resolution** | User question tool (`askUserQuestion`) | User prompt is vague, lacks scale/constraints, or allows multiple contradictory interpretations. | Run before external research to narrow the scope. |

---

## Decision Flow

```
Is the research task clear and well-scoped?
├─ NO: Missing critical constraints or ambiguous → Ask clarifying questions (askUserQuestion)
└─ YES: What is the information source?
   ├─ Specific known URL → Extract content or structured data (firecrawl / fetch)
   ├─ Official library or framework API → Consult package docs (context7)
   ├─ Current practices, benchmarks, or ecosystem status → Run web search (exa)
   ├─ Comparing competing solutions / Buy vs Build → Combine web search + extraction + package docs
   └─ Video content or reference → Run video analysis
```

---

## Research Workflows

### 1. Finding Current Trends and Best Practices

- **Problem / Goal:** Establish what is currently true in a fast-evolving ecosystem (framework versions, architectural patterns, benchmarks).
- **Intended Result:** Objective, up-to-date recommendations backed by recent real-world sources.
- **Why It Matters:** Training data goes stale; architectural patterns and library capabilities change rapidly.
- **Decision Conditions:** Use web search tools (`exa`) whenever assessing current state-of-the-art, migration patterns, or community consensus.
- **Procedure:**
  1. Execute a natural-language query targeting the specific topic or benchmark.
  2. If search highlights provide sufficient signal, synthesize the findings directly.
  3. If deeper context is required, extract full content from the most authoritative returned URLs using web extraction tools.

### 2. Consulting Official Documentation

- **Problem / Goal:** Retrieve authoritative API signatures, configuration schemas, or supported options for a library or framework.
- **Intended Result:** Accurate, syntax-correct usage instructions directly from vendor documentation.
- **Why It Matters:** Guessing API contracts produces syntax errors and deprecated pattern usage.
- **Decision Conditions:** Use documentation tools (`context7`) for targeted package or API lookups.
- **Procedure:**
  1. Resolve the package identifier and query the official documentation.
  2. Extract exact parameter names, types, and supported methods.
  3. For comparison tasks, never rely on official documentation alone.

### 3. Extracting Content from Known URLs

- **Problem / Goal:** Ingest raw web pages, documentation articles, or API specifications into clean, structured context.
- **Intended Result:** Clean markdown or schema-validated JSON without HTML boilerplate or navigation noise.
- **Why It Matters:** Parsing uncleaned HTML wastes context tokens and obscures core content.
- **Decision Conditions:** Use web extraction tools (`firecrawl` / fetch) when a specific, verified URL is available.
- **Procedure:**
  1. Select output format: markdown for reading and synthesis; JSON with schema for structured data extraction.
  2. Fetch the content and verify response status.
  3. If extraction fails or URL returns 404, return to discovery rather than guessing alternative URLs.

### 4. Comparing Solutions and Buy-vs-Build Decisions

- **Problem / Goal:** Evaluate trade-offs between competing technologies, services, or custom implementations.
- **Intended Result:** Balanced, multi-perspective evaluation covering capabilities, pricing, operational complexity, and developer feedback.
- **Why It Matters:** Official documentation reflects marketing claims and omits production edge cases, bugs, and hidden costs.
- **Decision Conditions:** Required whenever selecting between competing frameworks, databases, or cloud vendors.
- **Procedure:**
  1. Query official documentation (`context7`) for feature availability and official specs of each candidate.
  2. Search external sources (`exa`) for independent benchmarks, community post-mortems, and discussions (GitHub issues, Hacker News, Reddit).
  3. Scrape pricing pages and feature matrices (`firecrawl`) for commercial solutions.
  4. Cross-reference claims and synthesize verified trade-offs.

### 5. Analyzing Video Content

- **Problem / Goal:** Extract technical insights, architecture breakdowns, or tutorial steps from video resources.
- **Intended Result:** Timestamped summaries, key takeaways, and code references extracted from video material.
- **Why It Matters:** High-value architecture walkthroughs, conference talks, and release demos often exist exclusively in video format.
- **Decision Conditions:** Use when the user supplies a video link or when the primary authoritative demonstration is hosted on video platforms.
- **Procedure:**
  1. Query video analysis tools to retrieve metadata, chapters, and full transcripts.
  2. Extract key timestamps and referenced external links.
  3. Cross-reference critical technical claims with official documentation or web search.

### 6. Clarifying Ambiguity

- **Problem / Goal:** Prevent wasted research execution when the user's objective is underspecified.
- **Intended Result:** Explicit operating constraints (target scale, platform, budget, latency requirements).
- **Why It Matters:** Researching the wrong problem wastes tool calls and produces unhelpful recommendations.
- **Decision Conditions:** Trigger interactive user questions (`askUserQuestion`) when multiple conflicting interpretations exist or key requirements are omitted.
- **Procedure:**
  1. Formulate focused, specific questions presenting concrete options.
  2. Identify the single highest-impact unknown before proceeding with deep research.

---

## Non-Negotiable Verification Boundaries

### 1. Mandatory URL Verification (Strict Anti-Hallucination)

Fabricating, guessing, or reconstructing URLs is strictly prohibited. Subdomains (`docs.example.com`), path structures (`/api/v1`), and package registry routes must be confirmed before fetching.

**Verified URL sources only:**
- Direct `sitemap.xml` entries (e.g. `https://<domain>/sitemap.xml`).
- Verified `robots.txt` paths (e.g. `https://<domain>/robots.txt`).
- Site discovery mappings (e.g. `firecrawl map <domain>`).
- Direct links extracted from previously fetched, verified web pages.
- Exact `url` fields returned in search tool results (`exa`).
- Exact URLs explicitly provided by the user.

**Discovery protocol for unexplored domains:**
1. Fetch `/sitemap.xml` and `/robots.txt` first.
2. Identify real paths from sitemap contents.
3. Fetch only confirmed URLs.
4. If a fetch returns 404 or DNS resolution fails, do not guess alternative subdomains or paths; return to discovery.

### 2. Multi-Source Rule for Arbitrage and Comparisons

Official documentation tools (`context7`) must never be used in isolation for comparative evaluation or buy-vs-build recommendations. All comparisons require multi-source verification:
- Official documentation for capability claims.
- Independent search results for operational trade-offs and developer experience.
- Verified pricing and specification pages for vendor cost structures.

### 3. Discovery Before Extraction

Never use single-page web extractors (`firecrawl`) as a replacement for search tools (`exa`). Use search tools to discover relevant pages across the web; use extractors only once target URLs are identified.
