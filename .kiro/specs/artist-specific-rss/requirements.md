# Requirements Document

## Introduction

This specification defines the transformation of RSS functionality from a global portal-wide feed to individual artist-specific RSS feeds. Each artist will have control over their own RSS feed generation, enabling/disabling it through their profile settings, with RSS feeds being built as part of the static site generation process.

## Glossary

- **Artist_RSS_Feed**: Individual RSS feed generated for a specific artist containing their music releases and tracks
- **Artist_Metadata**: Nostr event (kind 34139) containing artist profile information and settings
- **RSS_Settings**: Configuration stored in artist metadata that controls RSS feed generation
- **Static_Build_Process**: The build-time process that generates static files including RSS feeds
- **RSS_Badge**: Visual indicator on artist pages showing RSS feed availability
- **RSS_Link**: Unique URL pointing to an artist's specific RSS feed

## Requirements

### Requirement 1: Artist-Level RSS Control

**User Story:** As an artist, I want to enable or disable RSS feed generation for my profile, so that I can control how my music is distributed via RSS.

#### Acceptance Criteria

1. WHEN an artist accesses their settings page, THE System SHALL display an RSS feed toggle option
2. WHEN an artist enables RSS feed generation, THE System SHALL store this preference in their artist metadata
3. WHEN an artist disables RSS feed generation, THE System SHALL store this preference and prevent RSS feed generation
4. THE RSS_Settings SHALL be persisted in the artist's Nostr metadata event
5. THE RSS_Settings SHALL default to disabled for new artists

### Requirement 2: RSS Feed Generation During Static Build

**User Story:** As a system administrator, I want RSS feeds to be generated during the static build process, so that they are available as static files without runtime generation overhead.

#### Acceptance Criteria

1. WHEN the static build process runs, THE System SHALL check each artist's RSS settings
2. WHEN an artist has RSS enabled, THE System SHALL generate an RSS feed file for that artist
3. WHEN an artist has RSS disabled, THE System SHALL skip RSS generation for that artist
4. THE System SHALL generate RSS feeds containing only that artist's tracks and releases
5. THE RSS_Feed SHALL be saved as a static file accessible via unique URL
6. THE RSS_Feed SHALL follow the existing RSS format but contain only single-artist content

### Requirement 3: Artist Page RSS Integration

**User Story:** As a visitor, I want to see RSS availability on artist pages, so that I can subscribe to specific artists' music feeds.

#### Acceptance Criteria

1. WHEN viewing an artist page with RSS enabled, THE System SHALL display an RSS badge
2. WHEN viewing an artist page with RSS enabled, THE System SHALL provide a unique RSS link
3. WHEN a user clicks the RSS link, THE System SHALL serve the artist's static RSS feed
4. WHEN viewing an artist page with RSS disabled, THE System SHALL not display RSS elements
5. THE RSS_Badge SHALL be visually consistent with the existing design system
6. THE RSS_Link SHALL follow the pattern `/rss/{artistPubkey}.xml`

### Requirement 4: Global RSS Navigation Removal

**User Story:** As a user, I want the global RSS navigation to be removed, so that the interface reflects the new artist-specific RSS approach.

#### Acceptance Criteria

1. THE System SHALL remove global RSS navigation links from all pages
2. THE System SHALL remove global RSS feed generation functionality
3. THE System SHALL maintain existing RSS feed format for individual artist feeds
4. THE System SHALL not break existing RSS feed consumers during transition
5. THE System SHALL redirect old global RSS URLs to a migration notice page

### Requirement 5: RSS Settings Persistence

**User Story:** As an artist, I want my RSS settings to be stored reliably, so that my preferences persist across sessions and devices.

#### Acceptance Criteria

1. WHEN an artist updates RSS settings, THE System SHALL publish updated metadata to Nostr relays
2. WHEN loading artist settings, THE System SHALL retrieve RSS preferences from Nostr metadata
3. THE RSS_Settings SHALL be included in the artist metadata JSON structure
4. THE RSS_Settings SHALL have a boolean field named "rssEnabled"
5. THE System SHALL handle missing RSS settings gracefully with default disabled state

### Requirement 6: Static Build Integration

**User Story:** As a developer, I want RSS generation integrated into the existing build process, so that artist RSS feeds are generated alongside other static content.

#### Acceptance Criteria

1. THE Build_Process SHALL fetch all artist metadata during static generation
2. THE Build_Process SHALL identify artists with RSS enabled
3. THE Build_Process SHALL generate individual RSS files for enabled artists
4. THE Build_Process SHALL place RSS files in the public directory structure
5. THE Build_Process SHALL log RSS generation status for each artist
6. THE Build_Process SHALL handle errors gracefully without failing the entire build

### Requirement 7: RSS Feed Content Structure

**User Story:** As an RSS consumer, I want artist-specific RSS feeds to contain comprehensive music data, so that I can access all relevant information about the artist's releases.

#### Acceptance Criteria

1. THE Artist_RSS_Feed SHALL contain only tracks and releases from that specific artist
2. THE Artist_RSS_Feed SHALL include all standard RSS metadata (title, description, image)
3. THE Artist_RSS_Feed SHALL use the artist's metadata for feed-level information
4. THE Artist_RSS_Feed SHALL maintain compatibility with existing RSS readers
5. THE Artist_RSS_Feed SHALL include proper iTunes and Podcasting 2.0 tags
6. THE Artist_RSS_Feed SHALL sort content by release date (newest first)

### Requirement 8: Migration and Backward Compatibility

**User Story:** As an existing RSS subscriber, I want to be notified about the RSS structure changes, so that I can update my subscriptions appropriately.

#### Acceptance Criteria

1. WHEN accessing the old global RSS URL, THE System SHALL serve a migration notice
2. THE Migration_Notice SHALL explain the change to artist-specific RSS feeds
3. THE Migration_Notice SHALL provide links to individual artist RSS feeds
4. THE System SHALL maintain the migration notice for at least 30 days
5. THE System SHALL log access to deprecated RSS URLs for monitoring