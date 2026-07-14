---
name: factual-research
description: Choose the right tool (exa, firecrawl, context7, askUserQuestion, youtube-analysis) for factual research, documentation, and solution comparison. Use when fact-checking, finding current best practices, extracting web content, reading official docs, comparing tools/vendors, analyzing videos, or clarifying ambiguous requests
---

# Tools & Resources Handoff

This skill guides you on which tools and resources to use for different types of investigation, verification, and decision-making tasks. It's your reference when you need to:

- Find factual information or verify current practices
- Look up official documentation
- Compare multiple solutions or vendors
- Extract and transform data from web pages
- Analyze video content
- Clarify ambiguous or incomplete user requests

---

## Tool Selection Matrix

Use this table to choose the right tool for your task:

| **Task Type** | **Primary Tool** | **When to Use** | **Complementary Tools** |
|---|---|---|---|
| **Factual searches** (best practices, current trends, market research, benchmarks, code examples) | `exa` | Whenever you need to find what's currently true about a domain — recent blog posts, benchmarks, user reviews, implementation patterns, comparison articles | Combine with `firecrawl` if highlights are too brief |
| **Web page content extraction** (reading an article, scraping structured data, getting page markdown) | `firecrawl` | When you have a specific URL and need to extract/transform the full content, or run web searches and need to inspect results in depth | Use after `exa` search results if you need more detail |
| **Official package/API documentation** | `context7` | Only for finding and reading the official docs of a specific package, library, or framework. **Never use alone for arbitrage or comparisons** | Must pair with `exa` (for external reviews, benchmarks) and `firecrawl` (for product pages) if evaluating buy vs build |
| **Solution comparison / Buy vs Build** | `exa` + `firecrawl` + external sources | Use `exa` to find comparisons, reviews, and benchmarks; use `firecrawl` to read product pages and detailed articles; cross-reference with external voices (HN, Reddit, GitHub issues) | `context7` only for official docs of options you're comparing |
| **Clarifying ambiguous requests** | `askUserQuestion` | User's request is vague, missing critical details, or you don't understand the desired output format. Ask before proceeding | Often follows the user clarifying, not replacing other tools |
| **Video content analysis** | `youtube-analysis` (skill) | Extract key points, citations, timestamps, and external links from YouTube videos relevant to the task | Rarely primary; use when the user references a video or you find one that contains critical info |

---

## Decision Flowchart

```
Is the user asking for information?
├─ YES: Do they have a specific URL in mind?
│  ├─ YES → Use firecrawl (with markdown or JSON format as needed)
│  └─ NO: What kind of info?
│     ├─ "What's the current best practice?" → exa
│     ├─ "Read the official docs for X" → context7
│     ├─ "Compare tool A vs tool B" → exa + firecrawl (+ external sources)
│     └─ "Analyze this YouTube video" → youtube-analysis
├─ NO: Is the request ambiguous or incomplete?
│  ├─ YES → askUserQuestion
│  └─ NO: Proceed with the main task
```

---

## Specific Patterns

### Pattern 1: Finding Current Trends & Best Practices

Use `exa` for:
- "What's the current state of X?" (LLM frameworks, deployment strategies, frontend patterns)
- Recent blog posts, GitHub trending projects
- Community benchmarks, real-world comparisons
- Code examples and implementation patterns from multiple sources

**Example:** "Should we use FastAPI or Django for our new service?" → `exa` to find recent comparisons, benchmarks, and real-world advice.

### Pattern 2: Reading Official Documentation

Use `context7` for:
- Official API references
- Package setup guides
- Framework documentation

**Important:** `context7` only shows official docs. If you're doing a **comparison** (buy vs build, tool A vs tool B), you must supplement with:
- `exa` (for external benchmarks, reviews, GitHub discussions)
- `firecrawl` (for product landing pages, pricing pages, detailed blog posts from vendors)

**Example:** "Should we use Pydantic AI or LangChain?" → 
1. Use `context7` to read the official docs of each
2. Use `exa` to find comparisons, GitHub issues, community feedback
3. Use `firecrawl` to read blog posts or detailed reviews from each vendor

### Pattern 3: Extracting Data from a Known URL

Use `firecrawl` with the right format:
- **Markdown:** for reading articles, understanding page content, summarizing
- **JSON + prompt:** for structured data extraction (e.g., "extract all features from this pricing page")
- **HTML:** if you need the raw DOM structure (rare, usually markdown is better)
- **Screenshot:** if visual inspection matters (e.g., UI changes, layout, branding)

**Example:** "Extract the API endpoints from this OpenAPI spec page" → `firecrawl` with JSON format and a schema describing the endpoints you want.

### Pattern 4: Comparing Multiple Solutions (Buy vs Build)

1. **Don't use `context7` alone** — it only shows official docs, not comparisons or real-world tradeoffs.
2. **Use `exa`** to find independent comparisons, benchmarks, GitHub discussions, reviews.
3. **Use `firecrawl`** for detailed product pages, pricing, feature matrices.
4. **Cross-reference** with external voices (HN, Reddit, GitHub issues) if the choice is critical.

**Example:** "Compare Vercel's deployment platform vs self-hosted options" →
- `exa` for independent comparisons and cost analyses
- `firecrawl` for Vercel's pricing page and feature docs
- `firecrawl` for self-hosted platform pages (Dokploy, Railway, Render, etc.)
- Cross-check on GitHub and community forums for real-world feedback

### Pattern 5: Clarifying Ambiguous Requests

Use askUserQuestion tool when:
- The user's request is vague ("research this")
- You don't understand the desired output format
- Multiple interpretations are possible
- Key details are missing (scope, time constraint, budget, use case)

**Example:** User says "Help me choose a database." Ask:
- Scale? (hobby project vs production at 1M QPS)
- Data shape? (structured, time-series, documents, graphs)
- Constraints? (budget, latency, hosting)
- Replacement cost if you pick wrong?

---

## Anti-Patterns — What NOT to Do

### ❌ NEVER invent or guess URLs
- **This is the most critical rule in this skill.** Fabricating URLs (subdomains, paths, query params) is strictly forbidden.
- Common mistakes: guessing `docs.<domain>` exists, guessing `/<word>` routes, hallucinating npm package scopes, inventing GitHub org names.
- **Every URL you fetch MUST first be verified to exist** via one of:
  - `sitemap.xml` (e.g., `https://<domain>/sitemap.xml`) — the authoritative list of real pages
  - `robots.txt` (e.g., `https://<domain>/robots.txt`) — often references sitemaps and special sections
  - `firecrawl map <domain>` — discovers real URLs from a site
  - A link found inside already-fetched, verified content
  - An `exa` search result (only the `url` field — never reconstruct it)
  - The user gave you the exact URL
- **If a fetch fails** (404, ENOTFOUND, DNS error) → the URL you tried was wrong. Do NOT retry with another guess. Go back to discovery (sitemap/robots/map/exa) to find the real URL.
- **Verification order for a new domain you've never explored:**
  1. Fetch `/sitemap.xml` and `/robots.txt` first (cheap, authoritative)
  2. Read what pages actually exist
  3. Fetch only those real URLs
- **Anti-example (real failure):** User says "compare with omp.sh". Wrong: guessing `docs.omp.sh` (subdomain doesn't exist) then `omp.sh/docs` (unverified path). Right: fetch `omp.sh/sitemap.xml` → discover real routes → fetch confirmed URLs.
- **Subdomains are never free.** `docs.X`, `api.X`, `blog.X` are separate DNS records that may or may not exist. Always verify.

### ❌ Don't use `context7` for arbitrage or comparisons
- `context7` only covers official docs. To compare solutions, you need `exa` + external sources.
- Using `context7` alone will give you biased, incomplete information.

### ❌ Don't use `brainstorming` skill outside ideation
- `brainstorming` is for exploring ideas and requirements before you have a clear direction.
- **Do not use it** during implementation, research, or decision-making phases.
- If you catch yourself wanting to brainstorm mid-project, it's a signal to stop, clarify requirements, and then resume execution.

### ❌ Don't skip the user clarification step
- If a request is ambiguous, using askUserQuestion is faster than guessing and iterating.
- Three minutes of clarification beats three hours of solving the wrong problem.

### ❌ Don't let `firecrawl` replace `exa` for exploration
- `firecrawl` requires a specific URL. If you don't know which pages to read, use `exa` first to discover them.
- `exa` is for "what should I look at?" — `firecrawl` is for "read this specific page."

### ❌ Don't use `youtube-analysis` for general web research
- YouTube videos are useful for deep dives and educational content, not as a substitute for current news or benchmarks.
- Only use when the user explicitly references a video or you've found one that contains critical information.

---

## Checklist: Before You Proceed

Before launching into research, ask yourself:

- [ ] Do I understand what the user is actually asking for?
  - If no → use askUserQuestion first
- [ ] Do I have specific URLs to read, or do I need to discover them?
  - If discover → start with `exa`
  - If specific → start with `firecrawl`
- [ ] Is this a comparison or arbitrage task?
  - If yes → use `exa` + `firecrawl` + external sources (never `context7` alone)
- [ ] Am I about to use `brainstorming` outside of ideation?
  - If yes → stop, reconsider the phase you're in

---

## Examples in Action

### Example 1: "What's the best way to structure a FastAPI project?"

1. Use `exa` to find current best practices, blog posts, GitHub repos with good examples
2. Read 2–3 of the most useful articles with `firecrawl` if the highlights are insufficient
3. Synthesize into advice

### Example 2: "Should we migrate from our custom auth to OAuth2?"

1. Use `askUserQuestion` to clarify: scale, compliance needs, team capacity
2. Use `exa` to find comparisons, migration guides, cost estimates
3. Use `context7` to read OAuth2 official specs if needed for technical details
4. Use `firecrawl` to read your current provider's migration docs

### Example 3: "Compare Anthropic Claude API vs OpenAI GPT-4 for our use case"

1. Use `exa` to find independent comparisons, benchmarks, cost analyses, GitHub discussions
2. Use `context7` to read official API docs for both
3. Use `firecrawl` for pricing pages, feature matrices, and detailed comparisons from each vendor
4. Do a test call to each API (outside this skill's scope) for real-world latency/quality comparison

### Example 4: "Clarify what the user needs from a new feature"

- User says: "Make the dashboard better."
- You: askUserQuestion → "What specific pain point?" / "Who's the user?" / "What metric matters most?"
- After clarification, proceed with the real research or design task

---

## When Not to Use This Skill

This skill is **context and guidance only** — it doesn't produce files, code, or direct outputs. Once you've chosen your tool(s), invoke them directly. This skill's job is just to help you pick the right one.

If you're doing something that doesn't involve research, tool selection, or clarification, you probably don't need this skill.
