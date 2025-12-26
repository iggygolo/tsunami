# Requirements Document

## Introduction

This feature enhances the main page of the Tsunami music application by adding individual track discovery alongside existing release discovery. Users will be able to discover trending individual tracks from all artists on the platform, providing better exposure for standalone tracks and improving content discoverability.

## Glossary

- **Track**: An individual music track (Nostr event kind 36787) that can exist independently or as part of a release
- **Release**: A collection of tracks (playlist/album) that represents a cohesive musical work
- **Trending**: Tracks that have high engagement (zaps, recent activity) within a specific time period
- **Discovery_Section**: A dedicated area on the main page for showcasing content
- **Main_Page**: The homepage/index page of the Tsunami application
- **Zap**: Lightning Network micropayment used to support artists on the platform

## Requirements

### Requirement 1: Trending Tracks Section

**User Story:** As a music listener, I want to discover trending individual tracks on the main page, so that I can find popular standalone tracks that might not be part of major releases.

#### Acceptance Criteria

1. WHEN a user visits the main page, THE Main_Page SHALL display a "Trending Tracks" section below the hero section
2. WHEN the trending tracks section loads, THE Discovery_Section SHALL show up to 8 individual tracks in a horizontal scrollable grid
3. WHEN tracks are displayed, THE Track_Display SHALL show the same visual treatment as releases (cover art, title, artist, engagement stats)
4. WHEN a user clicks on a track, THE System SHALL navigate to the individual track page
5. WHEN a user hovers over a track, THE Track_Display SHALL show a play button overlay for immediate playback

### Requirement 2: Track Ranking Algorithm

**User Story:** As a platform curator, I want tracks to be ranked by engagement and recency, so that the most relevant and popular content appears first.

#### Acceptance Criteria

1. WHEN calculating trending scores, THE Ranking_Algorithm SHALL weight zap amounts with 60% influence on the final score
2. WHEN calculating trending scores, THE Ranking_Algorithm SHALL weight zap count with 25% influence on the final score  
3. WHEN calculating trending scores, THE Ranking_Algorithm SHALL weight recency with 15% influence on the final score
4. WHEN tracks have equal engagement, THE System SHALL prioritize more recently published tracks
5. WHEN no tracks have zaps, THE System SHALL fall back to sorting by publication date (newest first)

### Requirement 3: Multi-Artist Track Discovery

**User Story:** As a music listener, I want to discover tracks from all artists on the platform, so that I can find diverse content beyond just featured artists.

#### Acceptance Criteria

1. WHEN fetching trending tracks, THE Track_Fetcher SHALL query tracks from all artists on the platform, not just configured artists
2. WHEN displaying tracks, THE Track_Display SHALL show artist attribution for each track using existing artist link components
3. WHEN tracks are from different artists, THE System SHALL ensure diverse representation in the trending list
4. WHEN an artist has multiple trending tracks, THE System SHALL limit to maximum 2 tracks per artist in the trending section
5. WHEN filtering tracks, THE System SHALL exclude tracks that are already featured in the latest release hero section

### Requirement 4: Track Playback Integration

**User Story:** As a music listener, I want to play trending tracks immediately from the main page, so that I can quickly sample music without navigating away.

#### Acceptance Criteria

1. WHEN a user clicks the play button on a track, THE Audio_Player SHALL start playing the track using the universal audio player
2. WHEN a track is playing, THE Track_Display SHALL show a pause button instead of a play button
3. WHEN a track finishes playing, THE Audio_Player SHALL automatically continue to the next track in the trending list
4. WHEN a user plays a track, THE System SHALL create a temporary playlist from the trending tracks for continuous playback
5. WHEN tracks have no audio URL, THE Track_Display SHALL disable the play button and show "No Audio Available"

### Requirement 5: Performance and Caching

**User Story:** As a platform user, I want the trending tracks to load quickly, so that I can discover music without waiting.

#### Acceptance Criteria

1. WHEN the main page loads, THE Track_Fetcher SHALL use cached data when available for immediate display
2. WHEN cached data is older than 10 minutes, THE System SHALL fetch fresh data in the background
3. WHEN fetching track stats, THE System SHALL batch requests to minimize network calls
4. WHEN the trending section is not visible, THE System SHALL defer loading track stats until the section comes into view
5. WHEN network requests fail, THE System SHALL gracefully fall back to cached data or show an appropriate error state

### Requirement 6: Responsive Design Integration

**User Story:** As a mobile user, I want the trending tracks section to work well on my device, so that I can discover music on any screen size.

#### Acceptance Criteria

1. WHEN viewing on mobile devices, THE Track_Display SHALL show 2 tracks per row with horizontal scrolling
2. WHEN viewing on tablet devices, THE Track_Display SHALL show 3-4 tracks per row
3. WHEN viewing on desktop devices, THE Track_Display SHALL show up to 6 tracks per row
4. WHEN the screen is very wide, THE Track_Display SHALL maintain maximum track card size for optimal visual hierarchy
5. WHEN scrolling horizontally, THE System SHALL provide smooth scrolling with momentum on touch devices

### Requirement 7: Visual Consistency

**User Story:** As a platform user, I want individual tracks to look consistent with releases, so that the interface feels cohesive and familiar.

#### Acceptance Criteria

1. WHEN displaying track cards, THE Track_Display SHALL use the same glass morphism styling as release cards
2. WHEN showing engagement stats, THE Track_Display SHALL use the same zap count and visual indicators as releases
3. WHEN displaying artist information, THE Track_Display SHALL use the same artist link components as releases
4. WHEN showing hover states, THE Track_Display SHALL use the same interaction patterns as release cards
5. WHEN tracks have no cover art, THE Track_Display SHALL use the same fallback music icon as other components

### Requirement 8: Section Management

**User Story:** As a content manager, I want the trending tracks section to integrate seamlessly with existing main page sections, so that the page layout remains balanced and navigable.

#### Acceptance Criteria

1. WHEN the trending tracks section is added, THE Main_Page SHALL position it between the hero section and recent releases
2. WHEN both trending tracks and recent releases are present, THE System SHALL provide clear visual separation between sections
3. WHEN the trending tracks section is empty, THE System SHALL hide the section entirely rather than showing empty state
4. WHEN there are fewer than 4 trending tracks, THE System SHALL still display the section but with fewer items
5. WHEN users want to see more tracks, THE System SHALL provide a "View All Tracks" link that navigates to a dedicated tracks page