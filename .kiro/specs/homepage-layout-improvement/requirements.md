# Requirements Document

## Introduction

This specification defines the requirements for improving the main page layout of the Tsunami music platform. The goal is to create a cleaner, more focused homepage that prioritizes music discovery while providing essential platform statistics.

## Glossary

- **Latest Release**: The most recently published music release on the platform
- **Recent Releases**: A curated list of recently published releases (excluding the latest)
- **Featured Artists**: Artists highlighted based on recent activity and engagement
- **Tsunami Stats**: Platform-wide statistics including total releases, artists, and community metrics
- **Homepage**: The main landing page of the Tsunami platform (/)

## Requirements

### Requirement 1: Latest Release Hero Section

**User Story:** As a music lover, I want to see the latest release prominently displayed, so that I can immediately discover the newest music on the platform.

#### Acceptance Criteria

1. THE Homepage SHALL display the latest release as the first and most prominent section
2. WHEN a latest release exists, THE Homepage SHALL show the release artwork, title, artist, and playback controls
3. WHEN no latest release exists, THE Homepage SHALL display a welcome message with platform introduction
4. THE Latest_Release_Section SHALL maintain the existing blurred background and visual design
5. THE Latest_Release_Section SHALL include play/pause functionality for releases with audio

### Requirement 2: Recent Releases Section

**User Story:** As a user exploring music, I want to see recent releases after the latest release, so that I can discover more new music without being overwhelmed.

#### Acceptance Criteria

1. THE Homepage SHALL display a "Recent Releases" section immediately after the latest release
2. THE Recent_Releases_Section SHALL show up to 6 releases in a grid layout
3. THE Recent_Releases_Section SHALL exclude the latest release to avoid duplication
4. THE Recent_Releases_Section SHALL include a "View All" link to the full releases page
5. THE Recent_Releases_Section SHALL use the existing ReleaseList component with appropriate filters

### Requirement 3: Featured Artists Section

**User Story:** As a music discoverer, I want to see featured artists after browsing releases, so that I can explore artists and their profiles.

#### Acceptance Criteria

1. THE Homepage SHALL display the "Featured Artists" section after the recent releases
2. THE Featured_Artists_Section SHALL show up to 6 artists based on recent activity
3. THE Featured_Artists_Section SHALL display artist names, profile images, and track counts for tracks released by that artist only
4. THE Featured_Artists_Section SHALL exclude tracks that artists have added to playlists but did not create
5. THE Featured_Artists_Section SHALL show a preview of each artist's latest released track
6. THE Featured_Artists_Section SHALL make artist cards clickable to navigate to artist profiles
7. THE Featured_Artists_Section SHALL include a "View All" link to the community page
8. THE Featured_Artists_Section SHALL allow users to play/preview the latest track directly from the artist card

### Requirement 4: Remove Social Activity Sections

**User Story:** As a user, I want a cleaner homepage focused on music discovery, so that I'm not distracted by social features that belong on dedicated community pages.

#### Acceptance Criteria

1. THE Homepage SHALL NOT display the "Top Supporters" section
2. THE Homepage SHALL NOT display the "Recent Activity" section  
3. THE Homepage SHALL NOT display the "Community Feed" section
4. THE Homepage SHALL NOT display the community CTA banner
5. THE Homepage SHALL redirect users to the dedicated community page for social features

### Requirement 5: Tsunami Platform Statistics

**User Story:** As a platform visitor, I want to see key statistics about Tsunami, so that I can understand the scale and activity of the music community.

#### Acceptance Criteria

1. THE Homepage SHALL display a "Tsunami Stats" section after the featured artists
2. THE Stats_Section SHALL show total number of releases on the platform
3. THE Stats_Section SHALL show total number of active artists
4. THE Stats_Section SHALL show total number of tracks across all releases
5. THE Stats_Section SHALL show community engagement metrics (total zaps, posts)
6. THE Stats_Section SHALL use a clean card-based layout with icons and numbers
7. THE Stats_Section SHALL update statistics in real-time based on platform data

### Requirement 6: Maintain Navigation Cards

**User Story:** As a user, I want quick access to main platform sections, so that I can easily navigate to different areas of Tsunami.

#### Acceptance Criteria

1. THE Homepage SHALL maintain the existing "Explore Tsunami" navigation cards section
2. THE Navigation_Cards SHALL include Music Library, Community, Artist Studio, and RSS Feed
3. THE Navigation_Cards SHALL display current counts and statistics where applicable
4. THE Navigation_Cards SHALL use the existing hover effects and styling
5. THE Navigation_Cards SHALL remain as the final section of the homepage

### Requirement 7: Performance and Loading States

**User Story:** As a user, I want the homepage to load quickly and show appropriate loading states, so that I have a smooth browsing experience.

#### Acceptance Criteria

1. THE Homepage SHALL display skeleton loading states for each section while data loads
2. THE Homepage SHALL load sections independently to avoid blocking the entire page
3. THE Homepage SHALL cache data appropriately to minimize loading times
4. THE Homepage SHALL handle empty states gracefully for each section
5. THE Homepage SHALL maintain responsive design across all device sizes

### Requirement 8: SEO and Accessibility

**User Story:** As a platform stakeholder, I want the homepage to be discoverable and accessible, so that we can reach the widest possible audience.

#### Acceptance Criteria

1. THE Homepage SHALL maintain the existing SEO meta tags and descriptions
2. THE Homepage SHALL use proper heading hierarchy (h1, h2, h3)
3. THE Homepage SHALL include appropriate alt text for images
4. THE Homepage SHALL maintain keyboard navigation support
5. THE Homepage SHALL follow dark theme accessibility guidelines