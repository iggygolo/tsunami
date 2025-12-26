# Design Document

## Overview

This design addresses the simplification of Tsunami's configuration system by removing unused environment variables, centralizing artist settings in the studio interface, and streamlining the configuration architecture for a multi-artist platform.

The current system was designed for single-artist sites and relies heavily on environment variables. This design transforms it into a clean, multi-artist system where each artist manages their own settings through the studio interface.

## Architecture

## Changes Overview

1. **Remove Environment Variables**: Delete 20+ unused VITE_* environment variables
2. **Remove Vercel Upload Support**: Simplify to only use Blossom servers for uploads
3. **Keep Only Essentials**: Retain only Blossom server configuration
4. **Move to Artist Settings**: All artist configuration goes through the existing Artist Settings UI
5. **Use Existing Patterns**: Leverage current artist metadata system without major changes

## Components and Interfaces

### 1. Simplified Environment Configuration

**Remove all environment variables except**:

```bash
# No upload provider configuration needed - Blossom only
# All configuration now handled per-artist
```

**Remove all these environment variables**:
- `VITE_ARTIST_*` (name, image, website, copyright, etc.)
- `VITE_MUSIC_*` (description, value, recipients, guid, etc.)
- `VITE_DEFAULT_UPLOAD_PROVIDER` (no longer needed)
- `BLOB_READ_WRITE_TOKEN` (no longer needed)
- All RSS and Podcasting 2.0 variables

### 2. Enhanced Artist Settings UI

Add Blossom server configuration to the existing Artist Settings page:

```typescript
// Add to existing ArtistFormData interface
interface ArtistFormData {
  // ... existing fields ...
  blossomServers: string[]; // Custom Blossom servers
}
```

### 3. Update Configuration Hooks

Simplify `useMusicConfig.ts` to remove all environment variable dependencies:

```typescript
export function useMusicConfig() {
  const { data: artistMetadata } = useArtistMetadata();
  
  // Use artist metadata or sensible defaults
  return {
    artistName: artistMetadata?.artist || 'Unknown Artist',
    description: artistMetadata?.description || '',
    blossomServers: artistMetadata?.blossomServers || DEFAULT_BLOSSOM_SERVERS,
    // ... other fields with defaults
  };
}
```

## Data Models

### Artist Metadata (Enhanced)

Add Blossom server configuration to existing artist metadata:

```typescript
interface ArtistMetadata {
  // ... existing fields ...
  blossomServers?: string[]; // Custom Blossom servers for this artist
}
```

### Platform Defaults

Simple defaults for Blossom servers:

```typescript
const DEFAULT_BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://blossom.nostr.band'
];
```

## Correctness Properties

Let me use the prework tool to analyze the acceptance criteria for testable properties:

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Remove Unused Environment Variables
*For any* system startup, unused environment variables should not be loaded or referenced
**Validates: Requirements 1.1, 1.4, 1.5**

### Property 2: Artist Settings Include Blossom Configuration
*For any* artist accessing Artist Settings, Blossom server configuration should be available
**Validates: Requirements 2.1, 2.5**

### Property 3: Blossom Server Persistence
*For any* artist configuring Blossom servers, the configuration should be saved to their artist metadata
**Validates: Requirements 2.2, 4.1**

### Property 4: Blossom Server Usage
*For any* artist file upload, the system should use the artist's configured Blossom servers or platform defaults
**Validates: Requirements 4.2, 4.3**

### Property 5: Configuration Validation
*For any* invalid Blossom server configuration, the system should reject it with clear error messages
**Validates: Requirements 4.5, 6.1, 6.3**

### Property 6: Graceful Defaults
*For any* missing Blossom server configuration, the system should use default servers
**Validates: Requirements 6.2, 6.4**

## Error Handling

- **Missing Environment Variables**: Use defaults (no environment variables needed)
- **Invalid Artist Metadata**: Fallback to defaults with error logging
- **Blossom Server Errors**: Clear validation messages and fallback to default servers

## Testing Strategy

### Unit Tests
- Configuration parsing with valid/invalid data
- Blossom server validation with various inputs
- Default value handling with missing configuration

### Property-Based Tests
- Blossom server configuration validation with random inputs (100+ iterations)
- Default fallback behavior with missing data
- Artist metadata persistence across different scenarios

Tests will be tagged with their corresponding design properties for traceability.