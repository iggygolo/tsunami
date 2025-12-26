# Requirements Document

## Introduction

Transform Tsunami from a single artist portal to a global Nostr music platform. Remove dependencies on configured artist identity and enable community-wide social features.

## Glossary

- **Global_Portal**: Multi-artist platform hosting any Nostr music
- **Community_Feed**: Social timeline from all music artists
- **Artist_Independence**: Studio features work for any authenticated artist

## Requirements

### Requirement 1: Community Social Feed

**User Story:** As a user, I want to see social posts from all music artists, so that I can discover the broader Nostr music community.

#### Acceptance Criteria

1. WHEN viewing the community page, THE System SHALL display posts from all music artists, not just the configured artist
2. WHEN browsing social content, THE System SHALL show clear artist attribution for each post
3. WHEN new artists publish music, THE System SHALL include their social content automatically

### Requirement 2: Artist-Independent Studio

**User Story:** As an artist, I want to use studio features with my own identity, so that I don't need to be the "configured" artist.

#### Acceptance Criteria

1. WHEN accessing studio features, THE System SHALL use the logged-in user's identity, not configuration
2. WHEN publishing content, THE System SHALL associate it with the authenticated artist
3. WHEN managing settings, THE System SHALL allow any artist to update their own profile

### Requirement 3: Global Platform Branding

**User Story:** As a visitor, I want to understand Tsunami is a community platform, so that I know it hosts multiple artists.

#### Acceptance Criteria

1. WHEN visiting the homepage, THE System SHALL present Tsunami as a global music platform
2. WHEN viewing navigation, THE System SHALL emphasize community and discovery
3. WHEN displaying content, THE System SHALL showcase diverse artists