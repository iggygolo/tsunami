# Design Document

## Overview

The unified music card component consolidates GlassReleaseCard and TrendingTrackCard into a single component that can display both music releases and individual tracks. This eliminates code duplication while providing consistent UI patterns across the platform.

## Architecture

### Component Structure

```
UnifiedMusicCard
├── CardContainer (glass styling + navigation link)
│   ├── ImageArea (square aspect ratio)
│   │   ├── Image or Music icon fallback
│   │   ├── Play/Pause button (center overlay)
│   │   ├── Social buttons (bottom-right)
│   │   └── Status badges (top-left)
│   └── ContentInfo
│       ├── Title (with link)
│       └── Artist name (ArtistLinkCompact)
```

## Components and Interfaces

### Main Component Props

```typescript
interface UnifiedMusicCardProps {
  // Content (discriminated union for type safety)
  content: MusicRelease | MusicTrackData;
  
  // Optional customization
  className?: string;
  showSocialActions?: boolean;
  
  // Performance options
  prefetchOnHover?: boolean;
}
```

### Content Type Detection

The component automatically detects content type using TypeScript's discriminated unions:

```typescript
function isRelease(content: MusicRelease | MusicTrackData): content is MusicRelease {
  return 'tracks' in content;
}

// Usage in component
const contentType = isRelease(content) ? 'release' : 'track';
```

### Playback Integration

Different playback systems based on content type:

```typescript
// For releases - use existing hook
const releasePlayback = isRelease(content) 
  ? useUniversalTrackPlayback(content) 
  : null;

// For tracks - use universal audio player directly  
const trackPlayback = !isRelease(content)
  ? useTrackPlayback(content)
  : null;
```

### Social Interactions

Reuse existing interaction hooks:

```typescript
// Use appropriate hook based on content type
const interactions = isRelease(content)
  ? useReleaseInteractions({ release: content, event: nostrEvent })
  : useTrackInteractions({ track: content, event: nostrEvent });
```

## Data Models

### Content Information Extraction

```typescript
// Extract display information from either content type
function getDisplayInfo(content: MusicRelease | MusicTrackData) {
  const isRelease = 'tracks' in content;
  
  return {
    title: content.title,
    artistName: isRelease ? content.artistName : content.artist,
    artistPubkey: content.artistPubkey,
    imageUrl: content.imageUrl,
    isExplicit: isRelease 
      ? content.tracks.some(track => track.explicit)
      : content.explicit,
    hasAudio: isRelease
      ? content.tracks.some(track => track.audioUrl)
      : !!content.audioUrl,
    navigationUrl: isRelease
      ? generateReleaseLink(content.artistPubkey, content.identifier)
      : generateTrackLink(content.artistPubkey || '', content.identifier)
  };
}
```

## Error Handling

The component handles missing or invalid data gracefully:

1. **Missing Images**: Show music icon fallback
2. **Missing Artist Info**: Show "Unknown Artist" 
3. **No Audio**: Disable play button with tooltip
4. **Failed Interactions**: Show error toast, maintain UI state

## Testing Strategy

### Unit Testing Approach

**Unit Tests** (using Vitest + React Testing Library):
- Component rendering with different content types
- User interaction handling (clicks, hovers, keyboard)
- Error state handling and fallbacks
- Accessibility compliance

**Property-Based Tests** (using fast-check):
- Content type detection and rendering
- Social interaction consistency
- Playback integration
- Link generation correctness

Each property-based test will run a minimum of 100 iterations and be tagged with:
```typescript
// Feature: unified-music-card, Property {number}: {property_text}
```

## Migration Strategy

### Implementation Plan

1. **Create UnifiedMusicCard** with feature parity to existing components
2. **Update TrendingTracksSection** to use the new component
3. **Replace GlassReleaseCard** usage across the application
4. **Remove old components** after successful migration

### Backward Compatibility

The component will accept legacy props during migration:

```typescript
interface LegacyProps {
  // Support old GlassReleaseCard props
  release?: MusicRelease;
  
  // Support old TrendingTrackCard props  
  track?: MusicTrackData;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Content Type Discrimination and Rendering
*For any* valid MusicRelease or MusicTrackData object passed to the UnifiedMusicCard, the component should correctly identify the content type and render appropriate metadata (track count for releases, duration for tracks) without errors.
**Validates: Requirements 1.1, 1.2, 3.1, 3.2**

### Property 2: Consistent Visual Styling
*For any* content passed to the UnifiedMusicCard, the component should apply consistent glass morphism styling including semi-transparent backgrounds, backdrop blur, square aspect ratio, hover effects, and typography hierarchy.
**Validates: Requirements 2.1, 2.2, 2.4, 2.5, 3.5, 6.3, 8.4, 9.1**

### Property 3: Image Display and Fallback Handling
*For any* content with or without an imageUrl, the UnifiedMusicCard should display the image when available with proper aspect ratio, or show the fallback music icon when the image is missing or fails to load.
**Validates: Requirements 2.3, 3.3, 3.4, 11.1**

### Property 4: Playback Integration Behavior
*For any* content type (release or track), when the play button is clicked, the UnifiedMusicCard should integrate with the appropriate playback system (useUniversalTrackPlayback for releases, universal audio player for tracks) and show correct button states (play/pause/loading) based on playback status and audio availability.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: Social Actions Integration
*For any* content type, the UnifiedMusicCard should display like, share, and zap buttons in the bottom-right corner with standardized colors (red, cyan, yellow), integrate with appropriate interaction hooks based on content type, and create correct Nostr events for social interactions.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Status Indicators Display
*For any* content with playing or explicit status, the UnifiedMusicCard should show appropriate status indicators in the top-left corner, prioritizing playing status over explicit badges, and applying correct animations (pulse for playing).
**Validates: Requirements 6.1, 6.2, 6.4, 6.5**

### Property 7: Navigation Link Generation
*For any* content type, the UnifiedMusicCard should generate correct navigation links using the appropriate link generation function (generateReleaseLink for releases, generateTrackLink for tracks) and make the entire card clickable while preventing event bubbling on interactive elements.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: Artist Attribution Handling
*For any* content with artist information (complete or incomplete), the UnifiedMusicCard should use the ArtistLinkCompact component, extract artist information appropriately from the content structure, and handle missing artist data gracefully by showing "Unknown Artist".
**Validates: Requirements 8.1, 8.2, 8.3, 8.5**

### Property 9: API Consistency Across Content Types
*For any* combination of props and content types, the UnifiedMusicCard should provide a consistent API that works the same way regardless of whether displaying a release or track, including backward compatibility with legacy props.
**Validates: Requirements 1.3, 1.4, 12.3**

### Property 10: Accessibility and Performance Features
*For any* rendered UnifiedMusicCard, the component should implement lazy loading for images, provide appropriate alt text, support keyboard navigation for interactive elements, and maintain proper focus management.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 11: Comprehensive Error Handling
*For any* error conditions (image loading failures, missing artist information, playback failures, social interaction failures), the UnifiedMusicCard should handle errors gracefully without breaking the interface and provide appropriate fallback states.
**Validates: Requirements 11.1, 11.2, 11.3, 11.4**

### Property 12: Responsive Design Adaptation
*For any* screen size or grid layout configuration, the UnifiedMusicCard should maintain square aspect ratio, scale interactive elements appropriately, adjust text sizing responsively, and work within flexible grid layouts (2, 3, 4, or 6 columns).
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**