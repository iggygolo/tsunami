# Design Document: Trending Tracks Discovery

## Overview

This design implements individual track discovery on the main page of the Tsunami music application. The feature adds a "Trending Tracks" section that showcases popular individual tracks from all artists on the platform, providing better exposure for standalone tracks and improving content discoverability.

The design leverages existing Nostr music event infrastructure (Kind 36787 for individual tracks) and integrates seamlessly with the current UI components and audio playback system. The trending algorithm combines engagement metrics (zaps) with recency to surface the most relevant content.

## Architecture

### Simple Component Structure

```
Index Page
├── Hero Section (Latest Release)
├── TrendingTracksSection (NEW)
│   └── TrackCard[] (reuse existing ReleaseCard pattern)
├── Recent Releases Section
└── Featured Artists Section
```

### Data Flow

1. **Fetch Tracks**: Use existing `useMusicTracks()` hook to get all tracks
2. **Calculate Scores**: Simple trending score based on zaps + recency
3. **Filter & Sort**: Apply diversity filter and sort by score
4. **Render**: Display using existing card components

## Components and Interfaces

### TrendingTracksSection
```typescript
interface TrendingTracksSectionProps {
  limit?: number; // Default: 8
}

// Simple component that:
// - Fetches tracks using existing hooks
// - Calculates trending scores
// - Renders using existing ReleaseCard components
```

### Reuse Existing Components
- **ReleaseCard**: Convert individual tracks to release format using `trackToRelease()`
- **ArtistLinkCompact**: Already handles multi-artist attribution
- **Universal Audio Player**: Already integrated with ReleaseCard

## Data Models

### Use Existing Infrastructure
- **MusicTrackData**: Already supports all required fields
- **MusicRelease**: Convert tracks using existing `trackToRelease()` function
- **Existing Hooks**: Leverage `useMusicTracks()` and `useMusicTracksWithStats()`

### Simple Trending Score
```typescript
function calculateTrendingScore(track: MusicTrackData): number {
  const zapScore = (track.totalSats || 0) * 0.6 + (track.zapCount || 0) * 0.25;
  const recencyScore = getRecencyScore(track.createdAt) * 0.15;
  return zapScore + recencyScore;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Trending Score Calculation
*For any* track with engagement data, the trending score should combine zap amounts (60%), zap count (25%), and recency (15%)
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: Artist Diversity
*For any* trending tracks list, no artist should have more than 2 tracks
**Validates: Requirements 3.4**

### Property 3: Track Display Consistency  
*For any* track card, it should use the same visual styling as release cards
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 4: Section Positioning
*For any* main page load, the trending tracks section should appear between hero and recent releases
**Validates: Requirements 8.1**

## Error Handling

### Simple Error Strategy
- **Network Failures**: Show error message, fall back to empty state
- **Missing Data**: Use existing fallback patterns from ReleaseCard
- **Invalid Tracks**: Filter out using existing `validateMusicTrack()`

## Testing Strategy

### Focused Testing Approach

**Unit Tests**:
- Trending score calculation with sample data
- Artist diversity filtering
- Component rendering with mock data
- Error handling scenarios

**Property-Based Tests**:
- Trending algorithm correctness across random inputs
- UI consistency validation
- Minimum 100 iterations per property test
- Tagged with: **Feature: trending-tracks-discovery, Property {number}**

**Key Test Areas**:
1. Trending score calculation accuracy
2. Artist diversity enforcement  
3. Visual consistency with existing components
4. Error handling and fallbacks