# Demu.xml Elements We CAN Implement

This document lists all demu.xml elements that we have corresponding data for in our PodcastRelease or PodcastConfig interfaces.

## Channel Level Elements (We Have Data For)

### Basic RSS Elements
- ✅ `<title>` → PodcastConfig.podcast.artistName
- ✅ `<description>` → PodcastConfig.podcast.description  
- ✅ `<link>` → PodcastConfig.podcast.website
- ✅ `<copyright>` → PodcastConfig.podcast.copyright
- ✅ `<pubDate>` → Generated from most recent release
- ✅ `<lastBuildDate>` → Generated at build time
- ✅ `<ttl>` → PodcastConfig.rss.ttl
- ✅ `<generator>` → Can be enhanced with version info

### iTunes Elements
- ✅ `<itunes:author>` → PodcastConfig.podcast.artistName

### Podcast 2.0 Elements
- ✅ `<podcast:guid>` → PodcastConfig.podcast.guid
- ✅ `<podcast:medium>` → PodcastConfig.podcast.medium
- ✅ `<podcast:person>` → PodcastConfig.podcast.person (array)
- ✅ `<podcast:value>` → PodcastConfig.podcast.value (with recipients)
- ✅ `<podcast:location>` → PodcastConfig.podcast.location
- ✅ `<podcast:license>` → PodcastConfig.podcast.license (if we add it to interface)

### RSS Image Element
- ✅ `<image>` → PodcastConfig.podcast.image (can be enhanced with title, link, description)

## Item Level Elements (We Have Data For)

### Basic RSS Elements
- ✅ `<title>` → PodcastRelease.title
- ✅ `<description>` → PodcastRelease.description
- ✅ `<pubDate>` → PodcastRelease.publishDate
- ✅ `<guid>` → Generated from artistPubkey:identifier
- ✅ `<enclosure>` → ReleaseTrack.audioUrl, audioType, duration

### iTunes Elements
- ✅ `<itunes:duration>` → ReleaseTrack.duration (convert seconds to HH:MM:SS)
- ✅ `<itunes:image>` → PodcastRelease.imageUrl

### Podcast 2.0 Elements
- ✅ `<podcast:transcript>` → PodcastRelease.transcriptUrl
- ✅ `<podcast:episode>` → Track index in tracks array (1-based)
- ✅ `<podcast:person>` → PodcastRelease.guests (if we map PodcastGuest to person format)
- ✅ `<podcast:value>` → Can inherit from channel or be item-specific

## Implementation Priority

### High Priority (Easy to implement)
1. `<itunes:duration>` - Convert ReleaseTrack.duration to HH:MM:SS format
2. `<podcast:transcript>` - Use PodcastRelease.transcriptUrl
3. `<podcast:episode>` - Use track index for episode numbering
4. `<itunes:image>` at item level - Use PodcastRelease.imageUrl
5. `<podcast:person>` at channel level - Use PodcastConfig.podcast.person
6. `<podcast:location>` - Use PodcastConfig.podcast.location

### Medium Priority (Requires minor interface updates)
7. `<podcast:license>` - Add to PodcastConfig if not present
8. Enhanced `<image>` element with title/description
9. Enhanced `<generator>` with version information

### Low Priority (Complex but doable)
10. `<podcast:person>` at item level - Map PodcastRelease.guests to person format
11. Item-level `<podcast:value>` - Allow per-track value splits