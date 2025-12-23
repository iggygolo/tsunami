# Implementation Plan: Vercel File Upload Integration

## Overview

This implementation adds Vercel Blob storage as an alternative file upload provider alongside existing Blossom servers. The approach uses Vercel's client upload pattern with serverless functions for authentication, maintaining API compatibility with existing components.

## Tasks

- [x] 1. Set up Vercel Blob infrastructure
  - Install @vercel/blob package and dependencies
  - Create Vercel Blob store in dashboard
  - Configure environment variables (BLOB_READ_WRITE_TOKEN)
  - _Requirements: 1.1, 1.2_

- [x] 2. Create serverless upload API endpoint
  - [x] 2.1 Create /api/upload serverless function
    - Implement POST handler for upload authentication
    - Add Nostr signature verification
    - Add file validation (type, size, filename sanitization)
    - Generate Vercel Blob client tokens using handleUpload
    - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.5, 5.1, 5.3_

  - [ ]* 2.2 Add rate limiting to upload endpoint
    - Implement basic rate limiting to prevent abuse
    - _Requirements: 5.5_

  - [ ]* 2.3 Write unit tests for upload endpoint
    - Test authentication flow
    - Test file validation
    - Test error handling
    - _Requirements: 1.4, 1.5_

- [x] 3. Implement Vercel upload provider
  - [x] 3.1 Create VercelUploadProvider class
    - Implement UploadProvider interface
    - Add client upload using @vercel/blob/client
    - Handle authentication through /api/upload endpoint
    - Add progress tracking and error handling
    - _Requirements: 1.1, 1.3, 3.1, 3.4_

  - [x] 3.2 Add file validation to provider
    - Implement validateFile method
    - Add getMaxFileSize and getSupportedTypes methods
    - _Requirements: 4.4_

  - [ ]* 3.3 Write unit tests for Vercel provider
    - Test successful upload flow
    - Test error handling
    - Test file validation
    - _Requirements: 1.3, 1.4_

- [x] 4. Update upload provider interface and factory
  - [x] 4.1 Extend existing upload system
    - Update useUploadFile hook to support provider selection
    - Create provider factory to instantiate correct provider
    - Maintain backward compatibility with existing Blossom flow
    - _Requirements: 2.3, 3.1, 3.2_

  - [x] 4.2 Add provider configuration management
    - Create upload configuration interface
    - Add local storage persistence for provider preferences
    - Add default configuration for new users
    - _Requirements: 2.2, 7.2, 7.4_

- [x] 5. Checkpoint - Test core upload functionality
  - Ensure both Blossom and Vercel uploads work
  - Verify provider selection persists correctly
  - Test file validation across providers
  - Ask user if questions arise

- [x] 6. Add upload provider selection UI
  - [x] 6.1 Update Studio settings tab
    - Add provider selection interface to existing Studio tab
    - Display available providers with status indicators
    - Allow users to set default provider preference
    - _Requirements: 2.1, 7.1, 7.5_

  - [x] 6.2 Add per-upload provider override
    - Update upload components to allow provider override
    - Add provider selection dropdown to upload interfaces
    - _Requirements: 2.4_

- [x] 7. Implement error handling and fallback
  - [x] 7.1 Add comprehensive error handling
    - Standardize error response format across providers
    - Add clear error messages for common failure cases
    - Implement retry logic with exponential backoff
    - _Requirements: 1.4, 3.5, 6.1, 6.3_

  - [ ]* 7.2 Add optional fallback functionality
    - Allow configuration of fallback providers
    - Implement automatic fallback on primary provider failure
    - _Requirements: 6.2_

- [x] 8. Integration and testing
  - [x] 8.1 Update existing upload components
    - Ensure PublishReleaseForm works with new provider system
    - Update Studio podcast image upload to use provider selection
    - Verify all existing upload flows continue working
    - _Requirements: 3.1, 3.4_

  - [ ]* 8.2 Write integration tests
    - Test end-to-end upload flows
    - Test provider switching
    - Test configuration persistence
    - _Requirements: 2.2, 2.3_

- [x] 9. Final checkpoint and documentation
  - Ensure all upload functionality works correctly
  - Verify provider selection UI is intuitive
  - Test error handling with invalid files
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Implementation maintains backward compatibility with existing Blossom uploads
- Focus on core functionality first, then enhance with additional features