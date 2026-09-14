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
| **Package Release Metadata** | Live official package registry or vendor release API | Verifying versions, dist-tags, publication dates, peer dependencies, engines, and package compatibility. | Tagged source, release notes, and official versioned documentation for behavior changes. |
| **GitHub-Hosted Documentation and Implementation** | Repository documentation (`DeepWiki`) | Reading library documentation, implementation, architecture, and repository conventions. | Repository source at an identified tag or commit for decision-critical verification. |
| **Other Official Documentation** | Official vendor documentation; package docs (`Context7`) as fallback | Reading API references, setup guides, and framework documentation when `DeepWiki` does not apply or is unavailable. | Verify source URL, target version, and freshness; use web extraction for known official URLs. |
| **Solution & Vendor Comparison** | Web search (`exa`) + Web extraction (`firecrawl`) | Comparing tools, evaluating buy-vs-build, or checking real-world developer sentiment. | `DeepWiki` first for GitHub-hosted official capabilities; official vendor docs or `Context7` fallback otherwise. |
| **Video Content Analysis** | Video analysis tools | Extracting transcripts, timestamps, summaries, or citations from video links. | Web search (`exa`) to cross-reference video claims. |
| **Ambiguity Resolution** | User question tool (`askUserQuestion`) | User prompt is vague, lacks scale/constraints, or allows multiple contradictory interpretations. | Run before external research to narrow the scope. |

---

## Decision Flow

```
Is the research task clear and well-scoped?
├─ NO: Missing critical constraints or ambiguous → Ask clarifying questions (askUserQuestion)
└─ YES: What claim needs evidence?
   ├─ Local project fact → Inspect manifests, lockfiles, installed metadata, config, source, or tests
   ├─ Package version, release, dist-tag, publication date, peer dependency, or engine → Query live official registry or release API
   ├─ GitHub-hosted library documentation, implementation, or convention → Use DeepWiki, then verify critical claims against tagged source
   ├─ Other official library, framework, SDK, API, CLI, or cloud behavior → Use official versioned docs; use Context7 only as fallback
   ├─ Specific known URL → Extract content or structured data (firecrawl / fetch)
   ├─ Current practices, benchmarks, or ecosystem status → Run web search (exa)
   ├─ Comparing competing solutions / Buy vs Build → Combine official capability evidence, web search, and extraction
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

### 2. Verifying Package Releases and Compatibility

- **Problem / Goal:** Establish current package versions, release status, dist-tags, publication dates, peer dependencies, engines, and compatibility constraints.
- **Intended Result:** Recommendations based on live metadata owned by the package registry or vendor release system.
- **Why It Matters:** Documentation indexes, migration guides, examples, and model memory can lag current releases and produce false compatibility conclusions.
- **Decision Conditions:** Required before recommending, editing, or installing a package when the decision depends on current release metadata or compatibility.
- **Procedure:**
  1. Inspect local manifests, lockfiles, and installed package metadata to establish the current project state.
  2. Query the live official package registry or vendor release API for dist-tags, latest version, publication times, peer dependencies, and engines. For npm, query both package-level metadata and the exact candidate version, for example `npm view <package> dist-tags version time --json` and `npm view <package>@<version> peerDependencies engines --json`.
  3. Compare the exact candidate metadata with the project's resolved dependency graph and runtime versions.
  4. Use tagged source, release notes, and version-matched official documentation to verify behavior changes not represented in registry metadata.
  5. Record what was queried and when. Re-query after long delays, session compaction, or any evidence that a newer release may exist.
  6. If live authoritative metadata is unavailable, report the claim as unknown and stop before a compatibility recommendation or dependency change.

`Context7` and `DeepWiki` must never establish latest versions, complete version lists, dist-tags, publication dates, peer dependencies, engines, or current package compatibility.

### 3. Consulting Official Documentation

- **Problem / Goal:** Retrieve authoritative API signatures, configuration schemas, supported options, implementation details, or repository conventions for a library or framework.
- **Intended Result:** Accurate, version-matched guidance traceable to official documentation or source.
- **Why It Matters:** Guessing API contracts produces syntax errors and deprecated patterns, while documentation indexes may serve stale snapshots.
- **Decision Conditions:** For GitHub-hosted projects, use `DeepWiki` first. Use current official vendor documentation directly when available. Use `Context7` only when `DeepWiki` is unavailable, the project is not hosted on GitHub, or Context7 better exposes the required official documentation.
- **Procedure:**
  1. Identify the project's official repository or documentation site and the version relevant to the user's project.
  2. For GitHub-hosted projects, query `DeepWiki` for documentation, implementation, architecture, or conventions.
  3. Verify decision-critical DeepWiki claims against repository source at an identified tag or commit.
  4. When using `Context7`, resolve the package identifier, inspect source reputation and available versions, query one focused concept, and verify the returned source URL, target version, and freshness.
  5. Treat Context7 library version lists as index metadata only, never as complete or current releases.
  6. Extract exact parameter names, types, supported methods, and version constraints from the verified source.
  7. For comparison tasks, never rely on official documentation alone.

### 4. Extracting Content from Known URLs

- **Problem / Goal:** Ingest raw web pages, documentation articles, or API specifications into clean, structured context.
- **Intended Result:** Clean markdown or schema-validated JSON without HTML boilerplate or navigation noise.
- **Why It Matters:** Parsing uncleaned HTML wastes context tokens and obscures core content.
- **Decision Conditions:** Use web extraction tools (`firecrawl` / fetch) when a specific, verified URL is available.
- **Procedure:**
  1. Select output format: markdown for reading and synthesis; JSON with schema for structured data extraction.
  2. Fetch the content and verify response status.
  3. If extraction fails or URL returns 404, return to discovery rather than guessing alternative URLs.

### 5. Comparing Solutions and Buy-vs-Build Decisions

- **Problem / Goal:** Evaluate trade-offs between competing technologies, services, or custom implementations.
- **Intended Result:** Balanced, multi-perspective evaluation covering capabilities, pricing, operational complexity, and developer feedback.
- **Why It Matters:** Official documentation reflects marketing claims and omits production edge cases, bugs, and hidden costs.
- **Decision Conditions:** Required whenever selecting between competing frameworks, databases, or cloud vendors.
- **Procedure:**
  1. For GitHub-hosted candidates, query `DeepWiki` first for feature availability and official implementation context, then verify decision-critical claims against tagged source. For other candidates, use current official vendor documentation directly or `Context7` as fallback.
  2. Query live official registries or release APIs for any version, release, engine, or compatibility claims.
  3. Search external sources (`exa`) for independent benchmarks, community post-mortems, and discussions (GitHub issues, Hacker News, Reddit).
  4. Scrape pricing pages and feature matrices (`firecrawl`) for commercial solutions.
  5. Cross-reference claims and synthesize verified trade-offs.

### 6. Analyzing Video Content

- **Problem / Goal:** Extract technical insights, architecture breakdowns, or tutorial steps from video resources.
- **Intended Result:** Timestamped summaries, key takeaways, and code references extracted from video material.
- **Why It Matters:** High-value architecture walkthroughs, conference talks, and release demos often exist exclusively in video format.
- **Decision Conditions:** Use when the user supplies a video link or when the primary authoritative demonstration is hosted on video platforms.
- **Procedure:**
  1. Query video analysis tools to retrieve metadata, chapters, and full transcripts.
  2. Extract key timestamps and referenced external links.
  3. Cross-reference critical technical claims with official documentation or web search.

### 7. Clarifying Ambiguity

- **Problem / Goal:** Prevent wasted research execution when the user's objective is underspecified.
- **Intended Result:** Explicit operating constraints (target scale, platform, budget, latency requirements).
- **Why It Matters:** Researching the wrong problem wastes tool calls and produces unhelpful recommendations.
- **Decision Conditions:** Trigger interactive user questions (`askUserQuestion`) when multiple conflicting interpretations exist or key requirements are omitted.
- **Procedure:**
  1. Formulate focused, specific questions presenting concrete options.
  2. Identify the single highest-impact unknown before proceeding with deep research.

---

## Non-Negotiable Verification Boundaries

### 1. Source Must Own the Claim

Match each material claim to the source that directly owns it:

- Local manifests, lockfiles, installed metadata, configuration, source, and tests own current project facts.
- Live official registries and vendor release APIs own package releases, dist-tags, publication dates, peer dependencies, and engines.
- Official versioned documentation and tagged source own API and behavior contracts.
- `DeepWiki`, `Context7`, search snippets, AI summaries, and migration examples are discovery or navigation aids, not authoritative evidence for volatile metadata.

Do not convert a tool's library list, indexed version list, example version, branch name, or migration guide into a “latest version” claim. If the owning source cannot be checked, state that the claim is unknown and stop before making a compatibility recommendation or dependency change.

### 2. Mandatory URL Verification (Strict Anti-Hallucination)

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

### 3. Multi-Source Rule for Arbitrage and Comparisons

Repository documentation tools (`DeepWiki`), package documentation tools (`Context7`), and official vendor documentation must never be used in isolation for comparative evaluation or buy-vs-build recommendations. All comparisons require multi-source verification:
- Official documentation or tagged source for capability claims.
- Live registries or release APIs for package release and compatibility claims.
- Independent search results for operational trade-offs and developer experience.
- Verified pricing and specification pages for vendor cost structures.

### 4. Discovery Before Extraction

Never use single-page web extractors (`firecrawl`) as a replacement for search tools (`exa`). Use search tools to discover relevant pages across the web; use extractors only once target URLs are identified.
