# RSS Feed System for Tsunami

This document explains how the RSS feed system works in Tsunami, including automatic updates when releases are added, edited, or deleted.

## Overview

The RSS feed system automatically generates and updates an RSS feed at `/rss.xml` that follows both standard RSS 2.0 specifications and Podcasting 2.0 enhancements. The feed is automatically updated whenever podcast releases are added, edited, or deleted.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Actions  │───▶│  Release Hooks   │───▶│ RSS Generator   │
│ (Add/Edit/Delete)│    │ (Invalidate RSS) │    │ (Update Feed)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   RSS Feed      │
                       │   Component     │
                       │   (/rss.xml)    │
                       └─────────────────┘
```

## Automatic Update Mechanism

### 1. **Trigger Points**

The RSS feed is automatically updated in these scenarios:

#### **A. New Release Published**
- **Hook**: `usePublishRelease`
- **Trigger**: After successful release creation
- **Action**: Invalidates `rss-feed-generator` query
- **Result**: New release appears in RSS feed

#### **B. Release Edited**
- **Hook**: `useUpdateRelease`
- **Trigger**: After successful release update
- **Action**: Invalidates `rss-feed-generator` query
- **Result**: Updated release content in RSS feed

#### **C. Release Deleted**
- **Hook**: `useDeleteRelease`
- **Trigger**: After successful release deletion
- **Action**: Invalidates `rss-feed-generator` query
- **Result**: Release removed from RSS feed

### 2. **Update Flow**

```typescript
// 1. User action (e.g., publish release)
await publishRelease(releaseData);

// 2. Hook automatically invalidates RSS cache
await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

// 3. RSS generator refetches and regenerates feed
const events = await nostr.query([{ kinds: [54], authors: [pubkey] }]);

// 4. Feed is stored and served at /rss.xml
await genRSSFeed(releases);
```

## RSS Feed Generation Process

### 1. **Data Fetching**

The `useRSSFeedGenerator` hook:

```typescript
// Fetch NIP-54 podcast releases
const events = await nostr.query([{
  kinds: [PODCAST_KINDS.EPISODE], // kind:30054
  authors: [getArtistPubkeyHex()],
  limit: 100
}]);
```

### 2. **Deduplication**

Applies the same title-based deduplication as the main release feed:

```typescript
// Identify edited events and their originals
validEvents.forEach(event => {
  if (isEditEvent(event)) {
    const originalId = getOriginalEventId(event);
    if (originalId) originalEvents.add(originalId);
  }
});

// Only show latest version of each title
validEvents.forEach(event => {
  if (originalEvents.has(event.id)) return; // Skip superseded versions
  // Keep newest version for each title
  releasesByTitle.set(title, event);
});
```

### 3. **RSS Generation**

Converts releases to RSS 2.0 format with Podcasting 2.0 enhancements:

```typescript
const rssContent = generateRSSFeed(releases, {
  title: "Tsunami Podcast",
  description: "A Nostr-powered podcast",
  // ... full podcast configuration
});
```

### 4. **Storage and Caching**

Generated RSS content is stored for fast delivery:

```typescript
// Store in localStorage for fast access
localStorage.setItem('podcast-rss-content', rssContent);
localStorage.setItem('podcast-rss-updated', Date.now().toString());
```

## RSS Feed Features

### 1. **Standard RSS 2.0 Compliance**
- ✅ Valid RSS 2.0 XML structure
- ✅ Proper `channel` and `item` elements
- ✅ Required fields: `title`, `description`, `link`, `pubDate`
- ✅ Enclosure tags for audio files
- ✅ GUIDs for release identification

### 2. **Podcasting 2.0 Enhancements**
- ✅ Value tags for Lightning payments
- ✅ Funding tags for support options
- ✅ Person tags for host/guest information
- ✅ Location tags for geographic data
- ✅ License tags for content licensing
- ✅ Locked feed support
- ✅ Remote item references

### 3. **NIP-19 Integration**
- ✅ Uses `nevent1` identifiers with relay hints
- ✅ Better discoverability for podcast platforms
- ✅ Relay hints for improved reliability
- ✅ Author pubkey for verification

## Feed Content Structure

### **Channel Level**
```xml
<channel>
  <title>Tsunami Podcast</title>
  <description>A Nostr-powered podcast</description>
  <link>https://tsunami.example</link>
  <language>en-us</language>
  <podcast:guid>npub1...</podcast:guid>
  <podcast:value type="BTC" method="lightning">
    <podcast:valueRecipient name="Host" type="node" address="..." split="100"/>
  </podcast:value>
</channel>
```

### **Release Level**
```xml
<item>
  <title>Release Title</title>
  <description>Release description</description>
  <link>https://tsunami.example/naddr1...</link>
  <guid>release-event-id</guid>
  <pubDate>Tue, 21 Nov 2023 12:00:00 GMT</pubDate>
  <enclosure url="https://.../release.mp3" length="0" type="audio/mpeg"/>
  <podcast:guid>release-event-id</podcast:guid>
</item>
```

## Performance Optimizations

### 1. **Caching Strategy**
- **LocalStorage**: Fast client-side caching
- **Query Cache**: React Query caching with 5-minute stale time
- **Conditional Updates**: Only regenerate when releases change

### 2. **Efficient Updates**
- **Targeted Invalidation**: Only RSS-related queries are invalidated
- **Background Updates**: RSS generation happens in background
- **Fast Loading**: Cached content served immediately

### 3. **Deduplication Benefits**
- **Reduced Processing**: Only latest versions processed
- **Smaller Feed Size**: No duplicate releases
- **Faster Generation**: Fewer releases to convert

## Monitoring and Debugging

### 1. **Console Logging**
```typescript
console.log('RSS feed generated with releases:', rssData.releases.length);
console.log('RSS feed updated at:', new Date().toISOString());
```

### 2. **Cache Inspection**
```javascript
// Check browser console
localStorage.getItem('podcast-rss-content');
localStorage.getItem('podcast-rss-updated');
```

### 3. **Feed Validation**
- **W3C Feed Validator**: https://validator.w3.org/feed/
- **Castos Podcast Validator**: https://castos.com/podcast-feed-validator/
- **Apple Podcasts Connect**: Built-in feed validation

## Error Handling

### 1. **Graceful Degradation**
- Empty feed generated when no releases exist
- Cached content served when generation fails
- Error messages logged for debugging

### 2. **Recovery Mechanisms**
- Automatic retry on failed generation
- Cache invalidation on errors
- Fallback to empty feed if needed

### 3. **User Feedback**
- Loading states during generation
- Error messages in development
- Success confirmation in logs

## Integration Points

### 1. **Podcast Directories**
- **Apple Podcasts**: Full compatibility
- **Spotify**: RSS 2.0 compliance
- **Google Podcasts**: Standard support
- **Stitcher**: Basic compatibility
- **Overcast**: Full feature support

### 2. **Analytics Platforms**
- **Chartable**: Track downloads and rankings
- **Podtrac**: Measure audience size
- **Backtracks**: Advanced analytics
- **Simplecast**: Hosting platform integration

### 3. **Social Media**
- **Twitter**: Automatic podcast card generation
- **Facebook**: Open Graph tags support
- **LinkedIn**: Professional sharing
- **Instagram**: Story sharing support

## Future Enhancements

### 1. **Advanced Features**
- **Transcript Support**: Full text transcripts in RSS
- **Chapter Marks**: Enhanced navigation support
- **Geo-blocking**: Regional content restrictions
- **Premium Content**: Paid release support

### 2. **Performance Improvements**
- **Static Generation**: Pre-generated feeds at build time
- **CDN Distribution**: Edge caching for faster delivery
- **Incremental Updates**: Only update changed releases
- **Compression**: Gzip compression for smaller feeds

### 3. **Monitoring and Analytics**
- **Feed Analytics**: Track subscriber growth
- **Download Metrics**: Measure release popularity
- **Error Tracking**: Monitor feed health
- **Performance Metrics**: Track generation times

## Conclusion

The Tsunami RSS feed system provides a robust, automatically updating RSS feed that:

- ✅ **Updates Automatically**: When releases are added, edited, or deleted
- ✅ **Standards Compliant**: RSS 2.0 + Podcasting 2.0
- ✅ **Performance Optimized**: Caching and efficient updates
- ✅ **Feature Rich**: Lightning payments, transcripts
- ✅ **Well Integrated**: Works with all major podcast platforms

The system ensures that podcast directories and subscribers always have access to the latest release content while maintaining high performance and reliability.