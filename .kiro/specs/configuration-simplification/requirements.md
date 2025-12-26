# Requirements Document

## Introduction

This specification addresses the simplification of the Tsunami configuration system when transitioning from a single-artist site to a multi-artist platform. The current system relies heavily on environment variables designed for single-artist use cases and needs to be streamlined for multi-artist functionality.

## Glossary

- **System**: The Tsunami music platform application
- **Artist**: A user who publishes music content on the platform
- **Configuration**: Settings that control application behavior and artist-specific preferences
- **Environment_Variable**: Server-side configuration values prefixed with VITE_
- **Artist_Settings**: Per-artist configuration stored in Nostr events
- **Global_Settings**: Platform-wide configuration that applies to all users

## Requirements

### Requirement 1: Remove Unused Configuration

**User Story:** As a platform administrator, I want to remove unused configuration options, so that the system is simpler and easier to maintain.

#### Acceptance Criteria

1. WHEN the system starts, THE System SHALL NOT load unused Podcasting 2.0 specific environment variables
2. WHEN reviewing configuration files, THE System SHALL NOT include RSS-specific settings that are now handled per-artist
3. WHEN examining the codebase, THE System SHALL NOT reference removed environment variables
4. THE System SHALL remove all environment variables related to single-artist RSS feeds
5. THE System SHALL remove all environment variables related to single-artist metadata

### Requirement 2: Migrate Artist Settings to Studio

**User Story:** As an artist, I want to manage all my settings through the Artist Settings page in the studio, so that I have a centralized place to configure my profile.

#### Acceptance Criteria

1. WHEN an artist accesses Artist Settings, THE System SHALL display all configurable artist options
2. WHEN an artist updates their Blossom server configuration, THE System SHALL store this setting per-artist
3. WHEN an artist configures their profile information, THE System SHALL save this to their Nostr artist metadata event
4. WHEN an artist enables RSS feeds, THE System SHALL store this preference in their artist metadata
5. THE System SHALL provide UI controls for all artist-configurable settings

### Requirement 3: Add Required Configuration Items

**User Story:** As a platform administrator, I want to ensure all necessary configuration items are available, so that the platform functions correctly for all artists.

#### Acceptance Criteria

1. WHEN the system initializes, THE System SHALL provide default Blossom server configuration
2. WHEN an artist has not configured Blossom servers, THE System SHALL use platform default servers
3. WHEN the system needs Blossom server configuration, THE System SHALL provide default server lists

### Requirement 4: Centralize Blossom Server Configuration

**User Story:** As an artist, I want to configure my preferred Blossom servers in my artist settings, so that my uploads use my preferred servers.

#### Acceptance Criteria

1. WHEN an artist configures Blossom servers, THE System SHALL store this configuration in their artist metadata
2. WHEN an artist uploads files, THE System SHALL use their configured Blossom servers
3. WHEN an artist has not configured servers, THE System SHALL use the platform default servers
4. THE System SHALL support multiple Blossom servers per artist
5. THE System SHALL validate Blossom server URLs before saving

### Requirement 5: Simplify Environment Configuration

**User Story:** As a platform administrator, I want a simplified environment configuration, so that deployment and maintenance are easier.

#### Acceptance Criteria

1. WHEN deploying the application, THE System SHALL require no environment variables for basic functionality
2. WHEN the system starts, THE System SHALL load minimal global configuration with hardcoded defaults
3. THE System SHALL NOT require any environment variables for artist configuration
4. THE System SHALL provide clear documentation for any optional environment variables
5. THE System SHALL validate any provided environment variables at startup

### Requirement 6: Validate Configuration Integrity

**User Story:** As a platform administrator, I want configuration validation, so that invalid settings don't break the application.

#### Acceptance Criteria

1. WHEN an artist saves configuration, THE System SHALL validate all settings before storing
2. WHEN the system loads configuration, THE System SHALL handle missing or invalid values gracefully
3. WHEN configuration validation fails, THE System SHALL provide clear error messages
4. THE System SHALL use sensible defaults for missing configuration values
5. THE System SHALL prevent saving of invalid Blossom server configurations