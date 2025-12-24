/**
 * Upload provider interfaces and implementations
 */

export interface UploadProvider {
  name: 'blossom' | 'vercel';
  uploadFile(file: File): Promise<string>;
  validateFile(file: File): boolean;
  getMaxFileSize(): number;
  getSupportedTypes(): string[];
}

export interface UploadResponse {
  url: string;
  provider: 'blossom' | 'vercel';
  size: number;
  type: string;
  filename: string;
}

export interface UploadError {
  code: string;
  message: string;
  provider?: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export class UploadProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public provider?: string,
    public details?: Record<string, any>,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'UploadProviderError';
  }
}

import { upload } from '@vercel/blob/client';
import { getEventHash, type Event } from 'nostr-tools';

// File validation constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
  // Audio
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/flac',
  'audio/opus',
  'audio/webm',
  // Video
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/json',
  'text/srt',
  'text/vtt',
];

export class VercelUploadProvider implements UploadProvider {
  name: 'vercel' = 'vercel';
  
  constructor(
    private userPubkey: string,
    private signer: any // Use any for now to avoid strict typing issues
  ) {}

  async uploadFile(file: File): Promise<string> {
    // Validate file first
    if (!this.validateFile(file)) {
      throw new UploadProviderError(
        'INVALID_FILE',
        `File validation failed for ${file.name}`,
        'vercel',
        { filename: file.name, size: file.size, type: file.type },
        false
      );
    }

    try {
      // Create authentication signature
      const timestamp = Date.now();
      const authEvent = await this.createAuthEvent(file, timestamp);
      
      // Upload file using Vercel Blob client
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          userPubkey: this.userPubkey,
          signature: authEvent.sig,
          timestamp: timestamp
        })
      });

      return blob.url;
    } catch (error) {
      console.error('Vercel upload failed:', error);
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new UploadProviderError(
            'AUTHENTICATION_FAILED',
            'Authentication failed - invalid signature',
            'vercel',
            { originalError: error.message },
            false
          );
        }
        
        if (error.message.includes('400') || error.message.includes('Bad Request')) {
          throw new UploadProviderError(
            'INVALID_REQUEST',
            'Invalid request - check file parameters',
            'vercel',
            { originalError: error.message },
            false
          );
        }
        
        if (error.message.includes('413') || error.message.includes('too large')) {
          throw new UploadProviderError(
            'FILE_TOO_LARGE',
            'File size exceeds maximum allowed size',
            'vercel',
            { fileSize: file.size, maxSize: this.getMaxFileSize() },
            false
          );
        }
        
        // Network or temporary errors
        if (error.message.includes('timeout') || error.message.includes('network')) {
          throw new UploadProviderError(
            'NETWORK_ERROR',
            'Network error during upload',
            'vercel',
            { originalError: error.message },
            true
          );
        }
      }
      
      // Generic upload error
      throw new UploadProviderError(
        'UPLOAD_FAILED',
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'vercel',
        { originalError: error },
        true
      );
    }
  }

  validateFile(file: File): boolean {
    // Check file size
    if (file.size > this.getMaxFileSize() || file.size <= 0) {
      return false;
    }
    
    // Check MIME type
    if (!this.getSupportedTypes().includes(file.type)) {
      return false;
    }
    
    // Check filename
    if (!file.name || file.name.trim().length === 0) {
      return false;
    }
    
    return true;
  }

  getMaxFileSize(): number {
    return MAX_FILE_SIZE;
  }

  getSupportedTypes(): string[] {
    return [...ALLOWED_MIME_TYPES];
  }

  private async createAuthEvent(file: File, timestamp: number): Promise<Event> {
    const event: Event = {
      kind: 27235, // Custom kind for file upload authorization
      pubkey: this.userPubkey,
      created_at: Math.floor(timestamp / 1000),
      tags: [
        ['filename', file.name],
        ['content-type', file.type],
        ['size', file.size.toString()],
        ['action', 'upload']
      ],
      content: 'File upload authorization',
      id: '',
      sig: ''
    };
    
    // Calculate event ID
    event.id = getEventHash(event);
    
    // Sign the event
    const signedEvent = await this.signer.signEvent(event);
    
    return signedEvent;
  }
}
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

export class BlossomUploadProvider implements UploadProvider {
  name: 'blossom' = 'blossom';
  
  constructor(
    private servers: string[],
    private signer: any // Use any for now to avoid strict typing issues
  ) {}

  async uploadFile(file: File): Promise<string> {
    // Validate file first
    if (!this.validateFile(file)) {
      throw new UploadProviderError(
        'INVALID_FILE',
        `File validation failed for ${file.name}`,
        'blossom',
        { filename: file.name, size: file.size, type: file.type },
        false
      );
    }

    try {
      const uploader = new BlossomUploader({
        servers: this.servers,
        signer: this.signer,
      });

      const tags = await uploader.upload(file);
      
      // Extract URL from tags (Blossom returns tags array)
      const urlTag = tags.find(tag => tag[0] === 'url');
      if (!urlTag || !urlTag[1]) {
        throw new Error('No URL returned from Blossom upload');
      }
      
      return urlTag[1];
    } catch (error) {
      console.error('Blossom upload failed:', error);
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new UploadProviderError(
            'AUTHENTICATION_FAILED',
            'Authentication failed with Blossom servers',
            'blossom',
            { originalError: error.message },
            false
          );
        }
        
        if (error.message.includes('413') || error.message.includes('too large')) {
          throw new UploadProviderError(
            'FILE_TOO_LARGE',
            'File size exceeds server limits',
            'blossom',
            { fileSize: file.size },
            false
          );
        }
        
        // Network or server errors
        if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('fetch')) {
          throw new UploadProviderError(
            'NETWORK_ERROR',
            'Network error connecting to Blossom servers',
            'blossom',
            { originalError: error.message, servers: this.servers },
            true
          );
        }
      }
      
      // Generic upload error
      throw new UploadProviderError(
        'UPLOAD_FAILED',
        `Blossom upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'blossom',
        { originalError: error, servers: this.servers },
        true
      );
    }
  }

  validateFile(file: File): boolean {
    // Blossom servers generally accept most file types
    // Basic validation for reasonable file size and name
    if (file.size <= 0 || file.size > 500 * 1024 * 1024) { // 500MB limit for Blossom
      return false;
    }
    
    if (!file.name || file.name.trim().length === 0) {
      return false;
    }
    
    return true;
  }

  getMaxFileSize(): number {
    return 500 * 1024 * 1024; // 500MB for Blossom
  }

  getSupportedTypes(): string[] {
    // Blossom supports most file types
    return ['*/*'];
  }
}
export interface UploadConfig {
  defaultProvider: 'blossom' | 'vercel';
  vercelEnabled: boolean;
  blossomEnabled: boolean;
  maxFileSize: number;
  allowedTypes: string[];
  fallbackEnabled: boolean;
}

export class UploadProviderFactory {
  static createProvider(
    providerType: 'blossom' | 'vercel',
    userPubkey: string,
    signer: any, // Use any for now to avoid strict typing issues
    blossomServers?: string[]
  ): UploadProvider {
    switch (providerType) {
      case 'vercel':
        return new VercelUploadProvider(userPubkey, signer);
      case 'blossom':
        if (!blossomServers || blossomServers.length === 0) {
          throw new Error('Blossom servers are required for Blossom provider');
        }
        return new BlossomUploadProvider(blossomServers, signer);
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  static getDefaultConfig(): UploadConfig {
    // Get default provider from environment variable, fallback to 'vercel'
    const envProvider = import.meta.env.VITE_DEFAULT_UPLOAD_PROVIDER as 'blossom' | 'vercel' | undefined;
    const defaultProvider = (envProvider === 'blossom' || envProvider === 'vercel') ? envProvider : 'blossom';
    
    return {
      defaultProvider,
      vercelEnabled: true,
      blossomEnabled: true,
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: [...ALLOWED_MIME_TYPES],
      fallbackEnabled: true // Enable fallback by default
    };
  }
}