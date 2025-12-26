# Design Document

## Overview

This design document outlines the implementation approach for improving the Tsunami homepage layout. The redesign focuses on music discovery by reorganizing content in a logical flow: latest release → recent releases → featured artists → platform statistics → navigation.

## Architecture

### Component Structure

The homepage will maintain its existing `Layout` wrapper but reorganize the content sections:

```
Layout
├── Latest Release Hero Section (existing, repositioned)
├── Recent Releases Section (existing, repositioned) 
├── Featured Artists Section (existing, repositioned)
├── Tsunami Stats Section (new)
└── Explore Navigation Cards (existing, maintained)
```

### Data Flow

The homepage will use existing hooks and data sources:
- `useLatestReleaseCache()` - Latest release data
- `useStaticReleaseCache()` - All releases for statistics
- `useFeaturedArtists()` - Featured artists data
- `useCommunityStats()` - Community statistics
- `useArtistStats()` - Artist statistics

## Components and Interfaces

### 1. Latest Release Hero Section
**Status**: Existing component, no changes needed
- Maintains current blurred background design
- Keeps play/pause functionality
- Preserves responsive layout

### 2. Recent Releases Section
**Status**: Existing component, repositioned
- Uses existing `ReleaseList` component
- Filters out the latest release to avoid duplication
- Maintains 6-item limit and grid layout

### 3. Featured Artists Section
**Status**: Existing component, needs enhancement

The Featured Artists section requires significant updates:

```typescript
interface EnhancedFeaturedArtist {
  pubkey: string;
  name?: string;
  npub: string;
  image?: string;
  activityScore: number;
  releasedTrackCount: number;  // Only tracks released by artist
  latestTrack?: {
    title: string;
    audioUrl?: string;
    duration?: number;
    releaseDate: Date;
    identifier: string;
  };
}
```

**Key Changes Needed:**
- **Track Counting Logic**: Filter tracks to only count those where `track.artistPubkey === artist.pubkey`
- **Latest Track Detection**: Find the most recent track released by each artist
- **Track Preview**: Add play/pause functionality for the latest track
- **Enhanced UI**: Display latest track info and preview controls

**Track Counting Algorithm:**
```typescript
// Only count tracks where the artist is the actual creator
const artistReleasedTracks = allTracks.filter(track => 
  track.artistPubkey === artist.pubkey
);

// Find latest track by creation date
const latestTrack = artistReleasedTracks
  .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())[0];
```

### 4. Tsunami Stats Section
**Status**: New component to be created

```typescript
interface TsunamiStatsProps {
  className?: string;
}

interface PlatformStats {
  totalReleases: number;
  totalArtists: number;
  totalTracks: number;
  totalZaps: number;
  totalPosts: number;
  activeArtists: number;
}
```

The stats component will:
- Aggregate data from multiple hooks
- Display statistics in a responsive card grid
- Use semantic icons for each statistic
- Show loading states while data loads
- Handle empty/error states gracefully

### 5. Navigation Cards Section
**Status**: Existing component, maintained
- No changes to existing functionality
- Preserves current styling and hover effects

## Data Models

### Platform Statistics Data Model

```typescript
interface PlatformStats {
  // Music Statistics
  totalReleases: number;        // From useStaticReleaseCache
  totalTracks: number;          // Calculated from releases
  totalArtists: number;         // Unique artists from releases
  
  // Community Statistics  
  totalZaps: number;            // From useArtistStats
  totalPosts: number;           // From useCommunityStats
  activeArtists: number;        // From useCommunityStats
}
```

### Statistics Calculation Logic

```typescript
// Total releases: Direct count from cache
const totalReleases = allReleases?.length || 0;

// Total tracks: Sum of tracks across all releases
const totalTracks = allReleases?.reduce((sum, release) => 
  sum + (release.tracks?.length || 0), 0) || 0;

// Total artists: Unique artist pubkeys
const totalArtists = new Set(
  allReleases?.map(r => r.artistPubkey).filter(Boolean)
).size;

// Community stats from existing hooks
const { totalZaps, totalPosts, activeArtists } = communityStats || {};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Section Ordering Consistency
*For any* homepage load, the sections should appear in the exact order: Latest Release → Recent Releases → Featured Artists → Tsunami Stats → Navigation Cards
**Validates: Requirements 1.1, 2.1, 3.1, 5.1, 6.1**

### Property 2: Data Consistency Across Sections
*For any* platform state, the statistics displayed in different sections should be mathematically consistent (e.g., total releases count should match between stats and navigation cards)
**Validates: Requirements 5.2, 5.3, 5.4, 6.3**

### Property 3: Artist Track Count Accuracy
*For any* featured artist, the displayed track count should only include tracks where the artist is the original creator (artistPubkey matches), not tracks they've added to playlists
**Validates: Requirements 3.3, 3.4**

### Property 4: Latest Track Selection
*For any* featured artist with released tracks, the latest track shown should be the most recently published track by that artist based on creation date
**Validates: Requirements 3.5, 3.8**

### Property 5: No Duplicate Content Display
*For any* homepage render, the latest release should not appear in both the hero section and recent releases section
**Validates: Requirements 1.1, 2.3**

### Property 6: Removed Sections Absence
*For any* homepage render, the page should not contain Top Supporters, Recent Activity, Community Feed, or Community CTA sections
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 7: Statistics Accuracy
*For any* set of platform data, the calculated statistics should accurately reflect the sum/count of the underlying data (releases, tracks, artists, etc.)
**Validates: Requirements 5.2, 5.3, 5.4, 5.5**

### Property 8: Loading State Coverage
*For any* data loading state, each section should display appropriate skeleton/loading UI until data is available
**Validates: Requirements 7.1, 7.2**

## Error Handling

### Data Loading Errors
- **Empty States**: Each section handles empty data gracefully with appropriate messaging
- **Network Errors**: Failed data loads show retry options or fallback content
- **Partial Data**: Sections render independently, so partial failures don't break the entire page

### Statistics Calculation Errors
- **Division by Zero**: Handle cases where no releases exist
- **Invalid Data**: Filter out malformed release data before calculations
- **Missing Fields**: Provide sensible defaults for missing track counts, artist info, etc.

### Component Error Boundaries
- Each major section wrapped in error boundaries
- Graceful degradation when individual sections fail
- Error reporting for debugging without breaking user experience

## Testing Strategy

### Unit Tests
- Test statistics calculation functions with various data sets
- Test component rendering with different data states (loading, empty, error)
- Test section ordering and layout structure
- Test responsive behavior across screen sizes

### Property-Based Tests
- **Statistics Accuracy**: Generate random release data and verify calculated statistics match expected values
- **Section Ordering**: Verify consistent section order across different data states
- **Data Consistency**: Ensure statistics remain consistent across multiple renders with same data
- **No Duplicates**: Verify latest release exclusion from recent releases list

### Integration Tests
- Test complete homepage flow from data loading to final render
- Test interaction between different sections and shared data
- Test navigation from homepage to other pages
- Test performance with large datasets

### Accessibility Tests
- Verify proper heading hierarchy (h1 → h2 → h3)
- Test keyboard navigation through all sections
- Verify screen reader compatibility
- Test color contrast ratios in dark theme

## Implementation Plan

### Phase 1: Remove Unwanted Sections
1. Remove Community CTA banner
2. Remove Top Supporters section
3. Remove Recent Activity section  
4. Remove Community Feed section
5. Clean up unused imports and hooks

### Phase 2: Reorder Existing Sections
1. Move Recent Releases section after Latest Release
2. Move Featured Artists section after Recent Releases
3. Ensure proper spacing and layout

### Phase 3: Create Tsunami Stats Section
1. Create `TsunamiStats` component
2. Implement statistics calculation logic
3. Add responsive card layout with icons
4. Integrate with existing data hooks

### Phase 4: Testing and Polish
1. Add comprehensive test coverage
2. Verify responsive design
3. Test loading states and error handling
4. Performance optimization

## Migration Considerations

### Backward Compatibility
- No breaking changes to existing components
- Existing routes and navigation remain unchanged
- Component APIs remain stable

### Performance Impact
- Reduced data fetching (removing social sections)
- Improved initial load time
- Better caching utilization

### User Experience
- Cleaner, more focused homepage
- Better music discovery flow
- Reduced cognitive load
- Maintained familiar navigation patterns