---
name: youtube-analysis
description: Use when you need to analyze, summarize, or extract learnings from a YouTube video. Also triggers for YouTube research tasks like finding creators on a topic, surveying videos, deep-diving a channel, or mining a playlist.
---

# YouTube Analysis

## Overview
This skill handles **any** YouTube-related request: single-video analysis, creator discovery, topic surveys, channel deep-dives, and playlist mining. It uses the **YouTube MCP Server** (`zubeid-youtube-mcp-server` package) as the primary tool suite, with the legacy `youtube-transcript` MCP as a fallback for transcript/metadata fetching when the primary tools fail.

## When to Use
- User asks for a summary, insights, or breakdown of a specific YouTube video.
- User wants to discover creators, channels, or videos on a topic.
- User asks to analyze or profile a YouTube channel or creator.
- User wants to explore or summarize a YouTube playlist or course.
- You need YouTube context to perform a larger task (e.g., "implement the technique from this video").

## When NOT to Use
- User is asking about a non-YouTube video platform (Vimeo, Loom, etc.).
- User wants to *publish* or *upload* videos (this skill is read-only analysis).

---

## Tool Reference

### Primary: YouTube MCP Server (`zubeid-youtube-mcp-server`)

| Category | Tool | Required Param | Optional Params | Purpose |
|---|---|---|---|---|
| **Channels** | `channels_findCreators` | `query` | `creatorOnly`, `channelMinSubscribers`, `channelMaxSubscribers`, `sampleVideosPerChannel`, `videoPublishedAfter/Before`, `channelLastUploadAfter/Before`, `sortBy`, `maxResults` | Discover creator channels from a topic query |
| | `channels_searchChannels` | `query` | `creatorOnly`, `channelType`, `minSubscribers`, `maxSubscribers`, `lastUploadAfter/Before`, `sortBy`, `maxResults` | Find channels by name, handle, or query |
| | `channels_getChannel` | `channelId` | — | Full profile + stats + `normalizedMetadata` (country, emails, brand-vs-creator heuristic) |
| | `channels_getChannels` | `channelIds[]` | `parts`, `includeLatestUpload` | Batch fetch multiple channels |
| | `channels_listVideos` | `channelId` | `maxResults` | Get uploads from a channel |
| **Videos** | `videos_searchVideos` | `query` | `publishedAfter/Before`, `channelId`, `uniqueChannels`, `channelMinSubscribers`, `channelMaxSubscribers`, `creatorOnly`, `sortBy`, `order`, `maxResults` | Search videos across YouTube |
| | `videos_getVideo` | `videoId` | `parts` | Full metadata (tags, duration, stats, description) |
| **Transcripts** | `transcripts_getTranscript` | `videoId` | `language` | Spoken content. Note: payloads can be 30KB+ per video |
| **Playlists** | `playlists_getPlaylist` | `playlistId` | — | Playlist metadata |
| | `playlists_getPlaylistItems` | `playlistId` | `maxResults` | Videos in a playlist |

### `sortBy` values (for discovery tools)
`relevance` (default) · `subscribers_asc` · `subscribers_desc` · `indie_priority` (rising creators) · `recent_activity`

### Fallback: `youtube-transcript` MCP
Use **only** if a primary tool fails:
- `youtube-transcript:get_video_info(url)` — fallback for `videos_getVideo`
- `youtube-transcript:get_transcript(url)` — fallback for `transcripts_getTranscript`
- `youtube-transcript:get_timed_transcript(url)` — use when timestamps are explicitly required (primary server does not expose timed transcripts)

---

## Input Normalization

The YouTube MCP Server accepts **IDs, not URLs**. When the user pastes a URL, extract the right ID first.

| URL form | Extract | Example |
|---|---|---|
| `youtube.com/watch?v=VIDEO_ID` or `youtu.be/VIDEO_ID` | `videoId` | `watch?v=FwOTs4UxQS4` → `FwOTs4UxQS4` |
| `youtube.com/channel/CHANNEL_ID` | `channelId` | `/channel/UCwAnu01qlnVg1Ai2AbtTMaA` |
| `youtube.com/@handle` | — | Use `channels_searchChannels(query: "@handle")` to resolve to a `channelId` |
| `youtube.com/playlist?list=PLAYLIST_ID` | `playlistId` | `list=PLrAXtmRdnEQy6nuLMfO6tylsfRA0p_9mQ` |

**Fallback**: If a URL doesn't match any pattern, search by title with `videos_searchVideos` (video) or `channels_searchChannels` (channel).

---

## Tool Selection Guide

| User intent | Primary path |
|---|---|
| "Summarize this video [URL]" | `videos_getVideo` → `transcripts_getTranscript` |
| "Find creators talking about X" | `channels_findCreators` → `channels_getChannel` |
| "Find channels named/about X" | `channels_searchChannels` → `channels_getChannel` |
| "Survey current videos on X" | `videos_searchVideos` (optionally `transcripts_getTranscript` on top picks) |
| "Analyze this channel [URL/handle]" | `channels_getChannel` → `channels_listVideos` |
| "Summarize playlist / course [URL]" | `playlists_getPlaylist` → `playlists_getPlaylistItems` |
| "Compare these creators" | `channels_getChannels(ids[])` |
| "Find timestamped moment in video" | `videos_getVideo` → `youtube-transcript:get_timed_transcript` (fallback) |

---

## Core Process: Single-Video Analysis

For "summarize this video", "break down this video", or analyzing a specific known video.

### 1. Extract Video ID
Parse the URL → `videoId`. If user gave just a title, use `videos_searchVideos` first.

### 2. Retrieve Rich Metadata
- **Tool:** `videos_getVideo(videoId)` (primary) → `youtube-transcript:get_video_info(url)` (fallback on failure)
- **Why:** Returns title, channel, tags, duration, view/like counts, and the **description** with citation links. Description analysis is critical for technical/tutorial videos.

### 3. Retrieve Transcript
- **Tool:** `transcripts_getTranscript(videoId)` (primary) → `youtube-transcript:get_transcript(url)` (fallback)
- **Why:** Spoken content is the core. Transcripts may fail if captions are disabled; that's when the fallback kicks in.

### 4. Analyze Description for External Context
- Parse the description.
- **Keep** informational links: GitHub repos, arxiv papers, blog posts, official docs.
- **Ignore** social profiles, sponsor/affiliate links, merch.
- **Rule:** For a deep dive or technical/tutorial video, you **MUST** fetch 1-2 of the most relevant informational links.

### 5. Fetch External Content (if found)
- **Tools:** `read_url_content` (fast, text-only) or `firecrawl:scrape` (richer DOM).
- **Fallback:** On 403/shortlink failures, `search_web` with the link's anchor text.

### 6. Synthesize
Combine video metadata + transcript + external sources. Cite whether each finding came from the video or an external link.

---

## Workflow A: Creator Discovery

For "find YouTube creators talking about X" or influencer/landscape research.

### 1. Find Creators
- **Tool:** `channels_findCreators`
- **Recommended defaults:** `creatorOnly: true`, `sampleVideosPerChannel: 1-2`, `channelMinSubscribers: 1000` (filters noise)
- **Rising creators:** add `sortBy: "indie_priority"`
- **Active creators:** add `channelLastUploadAfter: <ISO date - 6 months>`

### 2. Enrich Top Picks
- For the top 2-3 channels returned, call `channels_getChannel(channelId)` to get full `normalizedMetadata` (country, subscriber tier, contact links, confidence score).

### 3. Output Structure
Ranked list per creator:
- Channel name + handle + subscriber tier + country
- Why they match the query (cited from `matchedVideos[].title`)
- Content cadence (latest video date) + sample video titles
- Business email or contact links if present in `normalizedMetadata`

---

## Workflow B: Topic Video Search

For "what does YouTube say about X" or surveying current thinking on a topic.

### 1. Search Broadly
- **Tool:** `videos_searchVideos`
- **Recommended defaults:** `maxResults: 5-10`
- **Diversity:** set `uniqueChannels: true` to avoid one channel dominating
- **Recency:** add `publishedAfter` (ISO date)
- **Quality floor:** `channelMinSubscribers: 5000`

### 2. Triage by Metadata
- Read titles/descriptions from the results; rank by viewCount and relevance to user intent.

### 3. Deepen on Top Picks
- **Caution:** `transcripts_getTranscript` returns 30KB+ per video. Only fetch transcripts for the **top 2-3 results**, not all.
- Use `videos_getVideo(videoId)` for stats (viewCount, likeCount) before deciding which to deepen.

### 4. Output Structure
- Topic landscape summary
- Per-video: title + channel + views + key insight (1-2 sentences)
- Source-of-truth notes: which videos had transcripts vs metadata-only

---

## Workflow C: Channel Deep-Dive

For "analyze this channel [URL/handle]" or understanding a creator's coverage.

### 1. Resolve the Channel
- URL with `/channel/ID` → use directly
- URL with `/@handle` → call `channels_searchChannels(query: "@handle")` → extract `channelId`
- Plain name → `channels_searchChannels(query: name)`

### 2. Get Profile
- **Tool:** `channels_getChannel(channelId)`
- Extract: description, subscriberCount, videoCount, `normalizedMetadata.country`, joined date, keywords, creator-vs-brand heuristic

### 3. Get Content Map
- **Tool:** `channels_listVideos(channelId, maxResults: 20)`
- Scan titles for recurring themes and topics.

### 4. Selective Deepening
- Pick 2-3 most relevant videos (by title-match to user intent or by viewCount) and fetch transcripts + metadata with `videos_getVideo` + `transcripts_getTranscript`.

### 5. Output Structure
- Channel profile (who, size, niche, country, cadence)
- Content themes (derived from video title clustering)
- Notable videos: title + why it matters + 1-line summary

---

## Workflow D: Playlist Mining

For "summarize this course/playlist [URL]" or extracting structure from a curated collection.

### 1. Extract Playlist ID
Parse URL `list=PLAYLIST_ID` → `playlistId`.

### 2. Get Playlist Metadata
- **Tool:** `playlists_getPlaylist(playlistId)`
- Returns title, description, channel owner, total `itemCount`.

### 3. Get Items
- **Tool:** `playlists_getPlaylistItems(playlistId, maxResults: 10-20)`
- **Note:** Playlists can have 100+ items. Use `maxResults` to bound the scope; recommend batching if the user wants the full list.

### 4. Selective Deepening
- Decide transcript-depth priority based on user intent (title relevance, position in playlist, or video stats).
- Use `videos_getVideo` to pull stats before transcript fetching.

### 5. Output Structure
- Playlist overview (title, owner, item count)
- Structured video list (position + title + channel + key insight)
- Track coverage: which videos received deep analysis vs metadata-only

---

## Common Mistakes

- **Passing full URLs to `videoId`/`channelId` params** — The YouTube MCP Server rejects URLs. Always extract IDs first (see Input Normalization).
- **Calling `transcripts_getTranscript` on every search result** — Payloads are 30KB+ each. Limit deep transcript fetches to the top 2-3 results.
- **Skipping `creatorOnly: true` in discovery workflows** — Without it, brand channels and official accounts pollute creator-focused results.
- **Ignoring the `sortBy: "indie_priority"` option** — Critical for discovering rising creators rather than just the biggest channels.
- **Forgetting the `youtube-transcript` fallback** — When `transcripts_getTranscript` fails (rare, but happens when captions are disabled), fall back to `youtube-transcript:get_transcript`.
- **Ignoring the description links** — Missing code repos, source papers, or documentation mentioned in the video.
- **Fetching irrelevant description links** — Wasting tokens on sponsor links, social profiles, or merch.
- **Over-reliance on transcripts** — Transcripts have errors and lack visual context; description links and `videos_getVideo` metadata often resolve ambiguity.

---

## Example Workflows

### Example 1: Single-Video Analysis
User: "Summarize this AI agents lecture: https://youtube.com/watch?v=FwOTs4UxQS4"

1. Parse URL → `videoId: "FwOTs4UxQS4"`
2. `videos_getVideo("FwOTs4UxQS4")` → title + description with a link to an arxiv paper and a GitHub repo
3. `transcripts_getTranscript("FwOTs4UxQS4")` → lecture text
4. `read_url_content(arxiv_link)` → fetches paper abstract
5. **Synthesis**: summary integrating lecture points with formal paper definitions, cited.

### Example 2: Creator Discovery
User: "Find me 3 rising AI agents creators on YouTube"

1. `channels_findCreators(query: "AI agents", creatorOnly: true, channelMinSubscribers: 1000, sortBy: "indie_priority", sampleVideosPerChannel: 2, maxResults: 3)`
2. For each of the 3 returned channels: `channels_getChannel(channelId)` → full profile
3. **Output**: ranked creator list with subscriber tier, country, sample video titles, and why each matches "AI agents" topic.
