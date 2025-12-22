# Demu.xml Implementation Plan

Based on analysis of demu.xml vs our current RSS generator and data structures.

## Currently Implemented ✅

Our RSS generator already implements many demu.xml elements:

### Channel Level
- ✅ `<title>` → PodcastConfig.podcast.artistName
- ✅ `<description>` → PodcastConfig.podcast.description  
- ✅ `<link>` → PodcastConfig.podcast.website
- ✅ `<copyright>` → PodcastConfig.podcast.copyright
- ✅ `<pubDate>` → Generated from current date
- ✅ `<lastBuildDate>` → Generated from current date
- ✅ `<ttl>` → PodcastConfig.rss.ttl
- ✅ `<generator>` → "Tsunami - Nostr Podcast Platform"
- ✅ `<podcast:guid>` → PodcastConfig.podcast.guid
- ✅ `<podcast:medium>` → PodcastConfig.podcast.medium
- ✅ `<podcast:publisher>` → PodcastConfig.podcast.publisher
- ✅ `<podcast:license>` → PodcastConfig.podcast.license
- ✅ `<podcast:location>` → PodcastConfig.podcast.location
- ✅ `<podcast:person>` → PodcastConfig.podcast.person
- ✅ `<podcast:value>` → PodcastConfig.podcast.value with recipients
- ✅ `<podcast:funding>` → PodcastConfig.podcast.funding

### Item Level
- ✅ `<title>` → PodcastRelease.title
- ✅ `<description>` → PodcastRelease.description
- ✅ `<pubDate>` → PodcastRelease.publishDate
- ✅ `<guid>` → Generated from artistPubkey:identifier
- ✅ `<enclosure>` → ReleaseTrack.audioUrl, audioType
- ✅ `<podcast:guid>` → Same as guid

## Easy to Add (Have Data) 🟡

These elements we can implement immediately because we have the data:

### High Priority
1. **`xmlns:itunes` namespace** - Add to RSS declaration
2. **`<itunes:author>`** - Use PodcastConfig.podcast.artistName
3. **`<itunes:duration>`** - Convert ReleaseTrack.duration to HH:MM:SS format
4. **`<podcast:transcript>`** - Use PodcastRelease.transcriptUrl when available
5. **`<podcast:episode>`** - Use track index (1-based) for episode numbering
6. **`<itunes:image>` at item level** - Use PodcastRelease.imageUrl when available

### Medium Priority
7. **Enhanced `<image>` element** - Use PodcastConfig.podcast.image with title/description
8. **`<podcast:value>` method fix** - Change from "lightning" to "keysend" to match demu.xml

## Cannot Implement (No Data) ❌

These elements we cannot implement without adding new data fields:

### Missing from PodcastConfig
- ❌ `<language>` - No language field
- ❌ `<managingEditor>` - No email field
- ❌ `<webMaster>` - No webmaster email field
- ❌ `<podcast:locked>` - No locked field or owner email
- ❌ `<itunes:category>` - No category/genre fields

### Missing from ReleaseTrack
- ❌ `<link>` at item level - No individual track URLs
- ❌ `<author>` at item level - No per-track author

## Implementation Order

### Phase 1: Quick Wins (Task 2)
1. Add iTunes namespace declaration
2. Add `<itunes:author>` at channel level
3. Add `<itunes:duration>` at item level (convert seconds to HH:MM:SS)
4. Add `<podcast:transcript>` when transcriptUrl is available
5. Add `<podcast:episode>` using track index
6. Add `<itunes:image>` at item level when imageUrl is available

### Phase 2: Enhancements (Task 4)
1. Fix `<podcast:value>` method attribute (lightning → keysend)
2. Enhance `<image>` element with title and description
3. Improve `<generator>` with version information

### Phase 3: Future Considerations
- Could add environment variables for missing elements if needed
- Could add new interface fields for per-track metadata

## Code Changes Required

### 1. Add iTunes Namespace
```typescript
// In generateRSSFeed function
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
```

### 2. Add iTunes Elements
```typescript
// Channel level
<itunes:author>${escapeXml(podcastConfig.podcast.artistName)}</itunes:author>

// Item level  
${item.duration ? `<itunes:duration>${item.duration}</itunes:duration>` : ''}
${item.image ? `<itunes:image href="${escapeXml(item.image)}" />` : ''}
```

### 3. Add Podcast Elements
```typescript
// Item level
${release.transcriptUrl ? `<podcast:transcript url="${escapeXml(release.transcriptUrl)}" type="text/plain" />` : ''}
<podcast:episode>${trackIndex + 1}</podcast:episode>
```

This plan focuses on implementing only what we have data for, which will significantly improve RSS compatibility with demu.xml standards while maintaining our current architecture.