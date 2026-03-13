---
name: youtube-analysis
description: Use when you need to analyze, summarize, extract learnings from, or understand a YouTube video.
---

# YouTube Analysis

## Overview
This skill outlines the process for fully analyzing a YouTube video by leveraging transcripts, metadata, and external context referenced in the video description. It transforms a simple "summarize this video" request into a comprehensive analysis.

## When to Use
- User asks for a summary of a YouTube video.
- User wants to learn from a YouTube video or extract key insights.
- User asks questions about the content of a specific YouTube video.
- You need to understand a video's content to perform a task (e.g., "implement the technique from this video").

## Core Process

### 1. Retrieve Video Metadata
First, get the high-level context of the video.
- **Tool:** `youtube_transcript:get_video_info`
- **Action:** Call with the video URL.
- **Why:** To get the title, channel name, and importantly, the **description**. The description often contains valid citation links, project repos, or related articles that are crucial for full understanding.

### 2. Retrieve Transcript
Get the actual content of the video.
- **Tool:** `youtube_transcript:get_transcript` (preferred for general analysis) OR `youtube_transcript:get_timed_transcript` (if timestamps are explicitly needed).
- **Action:** Call with the video URL.
- **Why:** The transcript provides the spoken content.

### 3. Analyze Description for External Context
Don't just rely on the video; look at what the author linked.
- **Action:** Parse the `description` from Step 1.
- **Filter:** Identify *informational* links (e.g., GitHub repos, blog posts, documentation, news articles).
- **Ignore:** Social media profiles (Twitter/Instagram), sponsor links (Patreon, Merch), and generic platform links unless relevant to the user's specific query.
- **Instruction:** If the user wants a "full analysis" or "deep dive," or if the video is technical/tutorial-based, you **MUST** fetch content from 1-2 of the most relevant informational links.

### 4. Fetch External Content (Contextual)
If relevant links were found and are needed for the analysis:
- **Tool:** `firecrawl:scrape` (for single pages) or `read_url_content` (faster, text-only).
- **Fallback:** Iffetching fails (e.g., URL shorteners, 403 errors), use `search_web` with the title or citation text from the description to find the resource.
- **Action:** Fetch the content of the selected links.
- **Why:** To cross-reference claims, get code samples that might be hard to read from a transcript, or understand the broader context.

### 5. Synthesize & Analyze
Combine all sources to generate the final response.
- **Context Sources:** 
  1. Video Metadata (Who, What, When)
  2. Transcript (The Core Content)
  3. External Links (Validation/Deep Dive/Code)
- **Output:** Structure the analysis based on the user's request (e.g., "Key Takeaways," "Step-by-Step Guide," "Code Implementation"). 
- **Citation:** Explicitly mention if information came from the video or an external link found in the description.

## Example Workflow

User: "Summarize this lecture on new AI agents: [URL]"

**Agent Actions:**
1. `get_video_info(url)` -> Returns title "AI Agents 2.0" and description with specific links to a paper and a GitHub repo.
2. `get_transcript(url)` -> Returns the lecture text.
3. **Internal Logic:** Identify the paper link (arxiv.org) and GitHub link as high-value context.
4. `read_url_content(paper_url)` -> Fetches abstract/intro of the paper.
5. **Synthesis:** Generates a summary that integrates the lecture's points with the formal definitions from the paper, providing a verified and richer answer than the transcript alone.

## Common Mistakes
- **Ignoring the Description:** Failing to check links means missing code repos or source papers.
- **Fetching Irrelevant Links:** Wasting tokens on sponsor links or social media.
- **Over-Reliance on Transcript:** Transcripts can have errors or lack visual context; external documentation links often resolve this ambiguity.
