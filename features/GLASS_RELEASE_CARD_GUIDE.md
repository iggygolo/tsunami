# Glass Release Card Component Guide

This guide provides comprehensive documentation for the `GlassReleaseCard` component, which displays music releases with a modern glass morphism design and integrated social functionality.

## Overview

The `GlassReleaseCard` is a sophisticated UI component that displays music release information with:
- Modern glass morphism design with backdrop blur effects
- Integrated audio playback controls
- Social interaction features (like, zap, share)
- Responsive layout options (vertical/horizontal)
- Real-time playing status indicators
- Dark theme optimized styling

## Component Location

```
src/components/music/GlassReleaseCard.tsx
```

## Basic Usage

### Import

```tsx
import { GlassReleaseCard } from '@/components/music/GlassReleaseCard';
```

### Simple Implementation

```tsx
<GlassReleaseCard 
  release={musicRelease} 
/>
```

### With Custom Layout

```tsx
<GlassReleaseCard 
  release={musicRelease}
  layout="horizontal"
  className="custom-styling"
/>
```

## Props Interface

```tsx
interface GlassReleaseCardProps {
  release: MusicRelease;           // Required: Release data object
  className?: string;              // Optional: Additional CSS classes
  layout?: 'vertical' | 'horizontal'; // Optional: Card layout mode (default: 'vertical')
}
```

## MusicRelease Data Structure

The component expects a `MusicRelease` object with the following structure:

```tsx
interface MusicRelease {
  // Core identifiers
  id: string;                      // Unique release ID
  eventId: string;                 // Nostr event ID
  artistPubkey: string;            // Artist's Nostr pubkey
  identifier: string;              // Release identifier ('d' tag)
  
  // Display information
  title: string;                   // Release title
  imageUrl?: string;               // Cover art URL
  description?: string;            // Release description
  
  // Track data
  tracks: ReleaseTrack[];          // Array of tracks
  
  // Metadata
  publishDate: Date;               // Publication date
  createdAt: Date;                 // Creation timestamp
  tags: string[];                  // Genre/category tags
  genre?: string;                  // Primary genre
  
  // Social metrics (optional)
  zapCount?: number;               // Number of zaps received
  totalSats?: number;              // Total sats received
  commentCount?: number;           // Number of comments
  repostCount?: number;            // Number of reposts
}
```

## Layout Options

### Vertical Layout (Default)

Best for grid displays and main content areas:

```tsx
<GlassReleaseCard 
  release={release}
  layout="vertical"
/>
```

**Features:**
- Square aspect ratio cover image
- Full metadata display
- Complete social stats
- Description text (if available)
- Optimal for 2-4 column grids

### Horizontal Layout

Best for list views and compact displays:

```tsx
<GlassReleaseCard 
  release={release}
  layout="horizontal"
/>
```

**Features:**
- Rectangular cover image (24x24)
- Compact metadata
- Essential social actions
- No description text
- Optimal for single column lists

## Visual Features

### Glass Morphism Design

The component uses modern glass morphism effects:

```css
/* Glass container */
bg-card/40 border border-border/60 backdrop-blur-xl

/* Hover states */
hover:bg-card/50 hover:border-border/80

/* Social action containers */
bg-black/30 border border-white/20 backdrop-blur-xl
```

### Playing Status Indicator

When a release is currently playing:

```tsx
{trackPlayback?.isReleasePlaying && (
  <div className="absolute top-3 right-3">
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/90 text-white rounded-full text-xs font-medium backdrop-blur-sm shadow-lg">
      <Volume2 className="w-3 h-3 animate-pulse" />
      <span>Playing</span>
    </div>
  </div>
)}
```

### Social Action Buttons

Three main social actions are available:

1. **Like Button**: Toggle like/unlike with visual feedback
2. **Zap Button**: Opens ZapDialog for Bitcoin payments
3. **Share Button**: Copies release link to clipboard

## Integration Requirements

### Required Hooks and Contexts

The component requires these to be available in the React context:

```tsx
// Audio playback
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';

// Social interactions
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';

// Configuration
import { useMusicConfig } from '@/hooks/useMusicConfig';

// Prefetching
import { useReleasePrefetch } from '@/hooks/useReleasePrefetch';
```

### Provider Requirements

Ensure these providers wrap your app:

```tsx
<UniversalAudioPlayerProvider>
  <NostrProvider>
    <QueryClientProvider client={queryClient}>
      {/* Your app with GlassReleaseCard */}
    </QueryClientProvider>
  </NostrProvider>
</UniversalAudioPlayerProvider>
```

## Usage Examples

### Grid Layout (Releases Page)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {releases.map((release) => (
    <GlassReleaseCard
      key={release.id}
      release={release}
      layout="vertical"
    />
  ))}
</div>
```

### List Layout (Search Results)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {releases.map((release) => (
    <GlassReleaseCard
      key={release.id}
      release={release}
      layout="horizontal"
    />
  ))}
</div>
```

### Featured Release (Hero Section)

```tsx
<div className="max-w-md mx-auto">
  <GlassReleaseCard
    release={featuredRelease}
    layout="vertical"
    className="shadow-2xl"
  />
</div>
```

## Responsive Behavior

The component adapts to different screen sizes:

### Mobile (< 640px)
- Single column layout
- Larger touch targets
- Simplified metadata display

### Tablet (640px - 1024px)
- 2-3 column grids work well
- Full feature set available

### Desktop (> 1024px)
- 3-4 column grids optimal
- All features and hover effects active

## Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Proper tab order maintained
- Focus indicators visible

### Screen Readers
- Semantic HTML structure
- Proper ARIA labels and descriptions
- Alt text for images

### Color Contrast
- All text meets WCAG AA standards
- High contrast mode compatible
- Color-blind friendly design

## Performance Considerations

### Image Optimization
```tsx
// Lazy loading is handled automatically
<img
  src={release.imageUrl}
  alt={release.title}
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
/>
```

### Prefetching
```tsx
const handleMouseEnter = () => {
  // Prefetch release data when hovering for instant navigation
  prefetchRelease(release);
};
```

### Optimistic Updates
Social interactions use optimistic updates for immediate feedback:

```tsx
// Like button provides instant visual feedback
// Network request happens in background
// Reverts on error
```

## Error Handling

### Missing Data
```tsx
// Graceful fallback for missing cover art
{release.imageUrl ? (
  <img src={release.imageUrl} alt={release.title} />
) : (
  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
    <Music className="w-16 h-16 text-muted-foreground/50" />
  </div>
)}
```

### Network Errors
```tsx
// Zap button shows disabled state when event data unavailable
{releaseEvent ? (
  <ZapDialog target={releaseEvent}>
    <Button>Zap</Button>
  </ZapDialog>
) : (
  <Button disabled title="Zap not available">
    <Zap />
  </Button>
)}
```

## Styling Customization

### CSS Classes
```tsx
<GlassReleaseCard
  release={release}
  className="custom-shadow hover:scale-105 transition-transform"
/>
```

### Theme Variables
The component uses semantic color tokens:

```css
/* Primary colors */
--foreground: 210 40% 98%;
--muted-foreground: 215 20% 65%;
--primary: 187 85% 48%;

/* Glass effects */
--card: 210 10% 10%;
--border: 217 32% 18%;
```

## Common Patterns

### Loading States
```tsx
{isLoading ? (
  <div className="rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl overflow-hidden animate-pulse">
    <div className="w-full aspect-square bg-muted" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </div>
) : (
  <GlassReleaseCard release={release} />
)}
```

### Empty States
```tsx
{releases.length === 0 ? (
  <div className="py-12 px-8 text-center rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl">
    <Music className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
    <h3 className="text-foreground font-medium mb-2">No releases found</h3>
    <p className="text-muted-foreground">Try adjusting your search criteria.</p>
  </div>
) : (
  releases.map(release => (
    <GlassReleaseCard key={release.id} release={release} />
  ))
)}
```

## Best Practices

### Data Validation
Always validate release data before passing to component:

```tsx
const isValidRelease = (release: any): release is MusicRelease => {
  return release && 
         typeof release.id === 'string' && 
         typeof release.title === 'string' &&
         Array.isArray(release.tracks);
};

// Usage
{isValidRelease(release) && (
  <GlassReleaseCard release={release} />
)}
```

### Performance Optimization
```tsx
// Use React.memo for list items
const MemoizedGlassReleaseCard = React.memo(GlassReleaseCard);

// Use keys properly in lists
{releases.map(release => (
  <MemoizedGlassReleaseCard 
    key={`${release.id}-${release.eventId}`} 
    release={release} 
  />
))}
```

### Error Boundaries
Wrap in error boundaries for production:

```tsx
<ErrorBoundary fallback={<ReleaseCardError />}>
  <GlassReleaseCard release={release} />
</ErrorBoundary>
```

## Troubleshooting

### Common Issues

**1. ZapDialog Not Opening**
- Ensure proper `Event` type from `nostr-tools`
- Check that `releaseEvent` has required fields
- Verify no parent click handlers interfering

**2. Audio Not Playing**
- Check `UniversalAudioPlayerProvider` is available
- Verify tracks have valid `audioUrl` fields
- Ensure audio files are accessible

**3. Social Actions Not Working**
- Verify user is logged in for like/zap actions
- Check Nostr provider is properly configured
- Ensure network connectivity

**4. Styling Issues**
- Verify Tailwind CSS is properly configured
- Check CSS variable definitions
- Ensure backdrop-filter support in browser

### Debug Information

Enable debug logging:

```tsx
// Add to component for debugging
console.log('GlassReleaseCard debug:', {
  releaseId: release.id,
  hasAudio: release.tracks.some(t => t.audioUrl),
  hasEvent: !!releaseEvent,
  isPlaying: trackPlayback?.isReleasePlaying
});
```

## Migration Guide

### From ReleaseCard to GlassReleaseCard

```tsx
// Old implementation
<ReleaseCard 
  release={release}
  showPlayer={true}
/>

// New implementation
<GlassReleaseCard 
  release={release}
  layout="vertical"
/>
```

### Breaking Changes
- `showPlayer` prop removed (always available)
- `onPlayRelease` prop removed (handled internally)
- Different CSS class structure
- New social action requirements

## Future Enhancements

Planned improvements:
- Playlist support
- Advanced filtering options
- Customizable social actions
- Enhanced accessibility features
- Performance optimizations

---

This component represents the modern standard for displaying music releases in the application. It combines beautiful design with comprehensive functionality while maintaining excellent performance and accessibility standards.