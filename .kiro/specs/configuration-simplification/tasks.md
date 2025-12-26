# Implementation Plan: Configuration Simplification

## Overview

This implementation plan transforms Tsunami from a single-artist site with environment variable configuration to a multi-artist platform where all artist settings are managed through the studio interface. The plan removes unused environment variables, simplifies the configuration system, and moves to Blossom-only uploads.

## Tasks

- [x] 1. Remove unused environment variables and update configuration
  - Remove all VITE_ARTIST_* and VITE_MUSIC_* environment variables from .env files
  - Update CONFIGURATION.md to reflect simplified setup
  - Remove environment variable references from musicConfig.ts
  - _Requirements: 1.1, 1.4, 1.5, 5.1, 5.2, 5.3_

- [ ]* 1.1 Write property test for environment variable removal
  - **Property 1: Remove Unused Environment Variables**
  - **Validates: Requirements 1.1, 1.4, 1.5**

- [x] 2. Simplify musicConfig.ts to use hardcoded defaults
  - Replace environment variable loading with hardcoded default values
  - Remove parseJsonEnv and parseArrayEnv helper functions
  - Simplify MUSIC_CONFIG to use only sensible defaults
  - Add DEFAULT_BLOSSOM_SERVERS constant
  - _Requirements: 3.1, 3.3_

- [ ]* 2.1 Write unit tests for simplified configuration
  - Test default value loading
  - Test configuration structure
  - _Requirements: 3.1, 3.3_

- [x] 3. Update artist metadata schema to include Blossom servers
  - Add blossomServers field to ArtistMetadata interface
  - Update useArtistMetadata hook to handle new field
  - Ensure backward compatibility with existing artist metadata
  - _Requirements: 2.2, 4.1_

- [ ]* 3.1 Write property test for artist metadata persistence
  - **Property 3: Blossom Server Persistence**
  - **Validates: Requirements 2.2, 4.1**

- [x] 4. Enhance Artist Settings UI with Blossom server configuration
  - Add blossomServers field to ArtistFormData interface
  - Create Blossom server list input component
  - Add validation for Blossom server URLs
  - Update save handler to include Blossom server configuration
  - _Requirements: 2.1, 2.5, 4.5_

- [ ]* 4.1 Write property test for Blossom server validation
  - **Property 5: Configuration Validation**
  - **Validates: Requirements 4.5, 6.1, 6.3**

- [x] 5. Update upload system to use artist-configured Blossom servers
  - Modify useUploadConfig hook to use artist's Blossom servers
  - Remove Vercel upload provider support
  - Update upload components to use only Blossom
  - Ensure fallback to default servers when artist hasn't configured any
  - _Requirements: 4.2, 4.3_

- [ ]* 5.1 Write property test for Blossom server usage
  - **Property 4: Blossom Server Usage**
  - **Validates: Requirements 4.2, 4.3**

- [x] 6. Remove Vercel upload provider code
  - Remove VercelUploadProvider class from uploadProviders.ts
  - Remove Vercel-related environment variables and configuration
  - Update FileUploadWithProvider component to remove Vercel option
  - Remove BLOB_READ_WRITE_TOKEN references
  - _Requirements: 1.1, 1.4, 1.5_

- [ ]* 6.1 Write unit tests for Blossom-only upload system
  - Test upload provider creation
  - Test file upload with Blossom servers
  - _Requirements: 4.4_

- [x] 7. Update configuration hooks to use artist metadata
  - Modify useMusicConfig to prioritize artist metadata over environment variables
  - Add graceful fallback handling for missing artist metadata
  - Ensure sensible defaults are used when configuration is missing
  - _Requirements: 6.2, 6.4_

- [ ]* 7.1 Write property test for graceful defaults
  - **Property 6: Graceful Defaults**
  - **Validates: Requirements 6.2, 6.4**

- [x] 8. Checkpoint - Ensure all tests pass and configuration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update documentation and clean up
  - Update CONFIGURATION.md with new simplified setup instructions
  - Remove references to removed environment variables
  - Add documentation for Blossom server configuration in Artist Settings
  - Clean up any remaining unused configuration code
  - _Requirements: 5.4_

- [ ]* 9.1 Write integration tests for complete configuration flow
  - Test end-to-end artist settings save/load
  - Test upload functionality with configured servers
  - _Requirements: 2.3, 2.4_

- [x] 10. Final checkpoint - Verify complete system functionality
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation removes all environment variable dependencies except for optional overrides
- All artist configuration is now managed through the Artist Settings UI
- Upload system is simplified to use only Blossom servers