# Track Playback Hooks Guide

This guide documents how track playback hooks work across different contexts in the Tsunami music application, showing best practices for implementing audio playback functionality.

## Architecture Overview

The Tsunami music application uses a **Universal Audio Player Context** pattern that provides centralized, queue-based playback functionality. This system replaces older individual playback hooks with a unified approach that works across all contexts.

### Core Components

- **`UniversalAudioPlayerContext`** - Central state management for all audio playback
- **`useUniversalTrackPlayback`** - Hook for release-based playback scenarios
- **`useUniversalAudioPlayer`** - Direct access to global audio player state
- **`PersistentAudioPlayer`** - UI component providing playback controls

## Data Structures

### UniversalTrack Format

All tracks are normalized to this format for consistent playback:

```typescript
interface UniversalTrack {
  id: string;                    // Unique identifier
  title: string;                 // Track title
  artist?: string;               // Artist name
  audioUrl: string;              // Audio file URL
  duration?: number;             // Duration in seconds
  imageUrl?: string;             // Track artwork
  explicit?: boolean;            // Explicit content flag
  language?: string;             // Language code
  
  // Source context for navigation
  source?: {
    type: 'release' | 'profile' | 'playlist' | 'search';
    releaseId?: string;          // If from a release
    releaseTitle?: string;       // Release title for context
    artistPubkey?: string;       // Artist pubkey
  };
  
  // Metadata for features
  eventId?: string;              // For zapping/social features
  identifier?: string;           // Nostr identifier
}
```

### Track Conversion Helpers

```typescript
// Convert single track to universal format
const universalTrack = musicTrackToUniversal(track, { 
  type: 'profile', 
  artistPubkey: track.artistPubkey 
});

// Convert all tracks in a release
const universalTracks = releaseTracksToUniversal(release, 'release');
```

## Playback Hooks

### useUniversalTrackPlayback (Release Context)

**Purpose**: Manages playback for a specific release with full queue functionality.

**Usage**:
```typescript
const trackPlayback = useUniversalTrackPlayback(release);

// Available methods and state
const {
  isCurrentRelease,      // Is this release currently loaded?
  currentTrackIndex,     // Index of current track (-1 if not current)
  handleTrackPlay,       // (index: number) => void
  handleReleasePlay,     // () => void - Play from beginning
  isTrackPlaying,        // (index: number) => boolean
  isTrackCurrent,        // (index: number) => boolean
  hasPlayableTracks,     // boolean - Any tracks with audioUrl
  isReleaseLoading,      // boolean - Audio loading state
  isReleasePlaying       // boolean - Currently playing
} = trackPlayback;
```

**Best Practices**:
```typescript
// ✅ Always check for playable tracks before enabling play buttons
<Button 
  disabled={!trackPlayback.hasPlayableTracks}
  onClick={trackPlayback.handleReleasePlay}
>
  {trackPlayback.isReleasePlaying ? <Pause /> : <Play />}
</Button>

// ✅ Use track-specific state for individual track buttons
{release.tracks.map((track, index) => (
  <Button
    key={index}
    disabled={!track.audioUrl}
    onClick={() => trackPlayback.handleTrackPlay(index)}
  >
    {trackPlayback.isTrackPlaying(index) ? <Pause /> : <Play />}
  </Button>
))}
```

### useUniversalAudioPlayer (Direct Access)

**Purpose**: Direct access to global audio player for custom playback scenarios.

**Usage**:
```typescript
const { 
  state, 
  playTrack, 
  playQueue, 
  play, 
  pause, 
  stop,
  seekTo,
  setVolume,
  nextTrack,
  previousTrack,
  jumpToTrack
} = useUniversalAudioPlayer();

// State includes:
// - currentTrack: UniversalTrack | null
// - queue: UniversalTrack[]
// - queueTitle?: string
// - isPlaying: boolean
// - currentTime: number
// - duration: number
// - volume: number
// - shuffle: boolean
// - repeat: 'none' | 'one' | 'all'
```

**Best Practices**:
```typescript
// ✅ Play single track with context
const handleSingleTrackPlay = () => {
  const universalTrack = musicTrackToUniversal(track, {
    type: 'profile',
    artistPubkey: track.artistPubkey
  });
  playTrack(universalTrack, [universalTrack], 'Single Track');
};

// ✅ Play queue starting at specific index
const handleQueuePlay = (startIndex: number) => {
  const universalTracks = tracks.map(track => 
    musicTrackToUniversal(track, { type: 'profile' })
  );
  playQueue(universalTracks, startIndex, 'Profile Tracks');
};
```

## Context-Specific Implementations

### 1. Release Pages

**File**: `src/pages/ReleasePage.tsx`

**Pattern**: Use `useUniversalTrackPlayback` for full release functionality.

```typescript
const ReleasePage = () => {
  const trackPlayback = useUniversalTrackPlayback(release);

  return (
    <div>
      {/* Release header with play button */}
      <Button 
        disabled={!trackPlayback.hasPlayableTracks}
        onClick={trackPlayback.handleReleasePlay}
      >
        {trackPlayback.isReleasePlaying ? <Pause /> : <Play />}
        Play Album
      </Button>

      {/* Track list with individual play buttons */}
      <UniversalTrackList 
        release={release}
        showTrackNumbers={true}
      />
    </div>
  );
};
```

**Key Features**:
- Release play button starts from track 0
- Individual track buttons load full release queue at that index
- Pause/resume functionality for current release
- Visual indicators for current/playing tracks

### 2. Profile Pages

**File**: `src/components/music/UniversalTrackList.tsx` (tracks mode)

**Pattern**: Use `UniversalTrackList` with individual tracks array.

```typescript
const ProfilePage = () => {
  const { data: tracks } = useMusicTracks();

  return (
    <UniversalTrackList 
      tracks={tracks}
      showTrackNumbers={false}
    />
  );
};
```

**Key Features**:
- Each track plays independently
- Source context set to 'profile'
- Queue title: "Profile Tracks"
- No release-level play functionality

### 3. Trending Tracks Section

**File**: `src/components/music/TrendingTracksSection.tsx`

**Pattern**: Custom implementation with trending-specific logic.

```typescript
const TrendingTracksSection = ({ excludeTrackIds }: Props) => {
  const { data: trendingTracks } = useTrendingTracks({ 
    limit: 8, 
    excludeTrackIds 
  });
  const { playQueue, state } = useUniversalAudioPlayer();

  const handleTrackPlay = (index: number) => {
    const universalTracks = trendingTracks.map(({ track }) => 
      musicTrackToUniversal(track, { type: 'playlist' })
    );
    
    // Check if clicking current track
    const isCurrentTrack = state.currentTrack?.id === universalTracks[index].id;
    
    if (isCurrentTrack && state.isPlaying) {
      pause();
    } else if (isCurrentTrack && !state.isPlaying) {
      play();
    } else {
      playQueue(universalTracks, index, 'Trending Tracks');
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {trendingTracks.map((trendingTrack, index) => (
        <TrendingTrackCard
          key={trendingTrack.track.id}
          track={trendingTrack}
          index={index}
          onPlay={() => handleTrackPlay(index)}
          isCurrentTrack={state.currentTrack?.id === trendingTrack.track.id}
          isPlaying={state.isPlaying}
        />
      ))}
    </div>
  );
};
```

**Key Features**:
- Trending score-based ordering
- Artist diversity filtering (max 2 per artist)
- Exclusion of hero release tracks
- Square card layout with hover play buttons

### 4. Individual Track Pages

**File**: `src/pages/TrackPage.tsx`

**Pattern**: Direct `useUniversalAudioPlayer` for single track focus.

```typescript
const TrackPage = () => {
  const { data: track } = useTrackResolver(pubkey, identifier);
  const { playTrack, state, play, pause } = useUniversalAudioPlayer();

  const handleTrackPlay = () => {
    if (!track?.audioUrl) return;

    const universalTrack = musicTrackToUniversal(track, {
      type: 'search',
      artistPubkey: track.artistPubkey
    });

    const isCurrentTrack = state.currentTrack?.id === universalTrack.id;
    
    if (isCurrentTrack && state.isPlaying) {
      pause();
    } else if (isCurrentTrack && !state.isPlaying) {
      play();
    } else {
      playTrack(universalTrack, [universalTrack], track.title);
    }
  };

  return (
    <div>
      <Button 
        disabled={!track?.audioUrl}
        onClick={handleTrackPlay}
      >
        {state.currentTrack?.id === track?.id && state.isPlaying ? 
          <Pause /> : <Play />
        }
        Play Track
      </Button>
    </div>
  );
};
```

**Key Features**:
- Single track focus
- Shows playlists containing the track
- Direct play/pause toggle
- Minimal queue (single track)

### 5. Main Index Page (Hero Section)

**File**: `src/pages/Index.tsx`

**Pattern**: Latest release hero with `useUniversalTrackPlayback`.

```typescript
const Index = () => {
  const { data: latestRelease } = useLatestReleaseCache();
  const trackPlayback = useUniversalTrackPlayback(latestRelease);

  // Exclude latest release tracks from trending
  const excludeTrackIds = latestRelease?.tracks
    ?.map(track => track.eventId)
    .filter(Boolean) || [];

  return (
    <div>
      {/* Hero section */}
      <div className="hero-section">
        <Button 
          disabled={!trackPlayback.hasPlayableTracks}
          onClick={trackPlayback.handleReleasePlay}
        >
          {trackPlayback.isReleasePlaying ? <Pause /> : <Play />}
          Play Latest Release
        </Button>
      </div>

      {/* Trending tracks (excluding hero release) */}
      <TrendingTracksSection excludeTrackIds={excludeTrackIds} />
    </div>
  );
};
```

**Key Features**:
- Hero release playback
- Trending tracks exclusion
- Seamless integration between sections

## Audio Player UI Component

### PersistentAudioPlayer

**File**: `src/components/audio/PersistentAudioPlayer.tsx`

**Features**:
- Fixed bottom position
- Responsive design (mobile/desktop layouts)
- Current track info with artwork
- Playback controls: play/pause, skip, rewind/forward 15s
- Volume control with mute
- Progress bar with seek functionality
- Zap current track functionality
- Queue title display

**Usage**:
```typescript
// Automatically renders when state.currentTrack exists
// No manual integration required - context handles everything

const App = () => (
  <UniversalAudioPlayerProvider>
    <Router>
      <Routes>
        {/* Your routes */}
      </Routes>
    </Router>
    <PersistentAudioPlayer /> {/* Always present */}
  </UniversalAudioPlayerProvider>
);
```

## Best Practices

### ✅ DO

1. **Always use the universal system**:
   ```typescript
   // ✅ Use universal hooks
   const trackPlayback = useUniversalTrackPlayback(release);
   const { playQueue } = useUniversalAudioPlayer();
   ```

2. **Check for playable tracks**:
   ```typescript
   // ✅ Disable buttons for tracks without audio
   <Button disabled={!track.audioUrl || !trackPlayback.hasPlayableTracks}>
   ```

3. **Include source context**:
   ```typescript
   // ✅ Provide source context for navigation
   const universalTrack = musicTrackToUniversal(track, {
     type: 'profile',
     artistPubkey: track.artistPubkey
   });
   ```

4. **Use appropriate queue titles**:
   ```typescript
   // ✅ Descriptive queue titles
   playQueue(tracks, 0, 'Blue Album');
   playQueue(tracks, 0, 'Profile Tracks');
   playQueue(tracks, 0, 'Trending Tracks');
   ```

5. **Handle loading and error states**:
   ```typescript
   // ✅ Show loading indicators
   {trackPlayback.isReleaseLoading && <Spinner />}
   ```

### ❌ DON'T

1. **Don't use legacy hooks**:
   ```typescript
   // ❌ Deprecated
   const trackPlayback = useTrackPlayback(release);
   ```

2. **Don't create multiple audio elements**:
   ```typescript
   // ❌ Use context's single audio element
   const audioRef = useRef<HTMLAudioElement>();
   ```

3. **Don't forget error handling**:
   ```typescript
   // ❌ Always check for audioUrl
   onClick={() => playTrack(track)} // What if no audioUrl?
   ```

4. **Don't mix playback systems**:
   ```typescript
   // ❌ Stick to one system per component
   const trackPlayback = useUniversalTrackPlayback(release);
   const { playTrack } = useUniversalAudioPlayer(); // Confusing
   ```

## Trending Tracks Implementation

### Scoring Algorithm

Trending tracks use a weighted scoring system:

- **60% Zap Amounts** (logarithmic scaling)
- **25% Zap Count** (logarithmic scaling)  
- **15% Recency** (linear decay over 7 days)

```typescript
const trendingScore = 
  Math.log(zapAmount + 1) * 0.6 +
  Math.log(zapCount + 1) * 0.25 +
  recencyScore * 0.15;
```

### Filtering & Diversity

```typescript
// Artist diversity: max 2 tracks per artist
const diverseTracks = applyDiversityFilter(tracks, 2);

// Exclude hero release tracks
const filteredTracks = excludeTracks(tracks, excludeTrackIds);
```

### Data Fetching

```typescript
const { data: trendingTracks } = useTrendingTracks({
  limit: 8,
  excludeTrackIds: heroReleaseTrackIds,
  timeWindow: 7 // days
});
```

## Error Handling

### Common Scenarios

1. **No Audio URL**:
   ```typescript
   if (!track.audioUrl) {
     // Disable play button, show "No Audio Available"
     return <Button disabled>No Audio Available</Button>;
   }
   ```

2. **Network Errors**:
   ```typescript
   // Audio player context handles network errors
   // Shows error state in PersistentAudioPlayer
   if (state.error) {
     toast.error(`Playback error: ${state.error}`);
   }
   ```

3. **Missing Track Data**:
   ```typescript
   // Graceful fallback for missing tracks
   const releaseTrack = track || {
     title: `Track ${index + 1}`,
     audioUrl: '', // Indicates missing
     // ... other defaults
   };
   ```

## Performance Considerations

### Caching Strategy

- **Static Cache**: Pre-built data from SSG (instant loading)
- **Runtime Cache**: 5-minute stale time for active data
- **Query Deduplication**: Automatic with React Query
- **Memory Management**: Proper cleanup of unused data

### Optimization Tips

1. **Batch Queries**: Fetch multiple tracks in single requests
2. **Lazy Loading**: Only resolve tracks when needed
3. **Abort Signals**: Proper cleanup of cancelled requests
4. **Efficient Lookups**: Use Map-based track resolution

## Migration from Legacy System

### Old Pattern (Deprecated)
```typescript
// ❌ Old way
const { isPlaying, handlePlay } = useTrackPlayback(release);
```

### New Pattern (Recommended)
```typescript
// ✅ New way
const trackPlayback = useUniversalTrackPlayback(release);
const { handleReleasePlay, isReleasePlaying } = trackPlayback;
```

### Migration Checklist

- [ ] Replace `useTrackPlayback` with `useUniversalTrackPlayback`
- [ ] Update play button handlers to use new methods
- [ ] Add source context to track conversions
- [ ] Update loading and error state handling
- [ ] Test queue functionality across contexts
- [ ] Verify responsive audio player behavior

This guide provides comprehensive coverage of the track playback system, enabling developers to implement consistent, reliable audio playback across all contexts in the Tsunami music application.