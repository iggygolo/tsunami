/**
 * Upload provider interfaces and implementations
 * Simplified for Blossom-only uploads
 */

export interface UploadProvider {
  name: 'blossom';
  uploadFile(file: File): Promise<string>;
  validateFile(file: File): boolean;
  getMaxFileSize(): number;
  getSupportedTypes(): string[];
}

export interface UploadResponse {
  url: string;
  provider: 'blossom';
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
  defaultProvider: 'blossom';
  blossomServers: string[];
  blossomEnabled: boolean;
  maxFileSize: number;
  allowedTypes: string[];
}

export class UploadProviderFactory {
  static createProvider(
    userPubkey: string,
    signer: any, // Use any for now to avoid strict typing issues
    blossomServers: string[]
  ): UploadProvider {
    if (!blossomServers || blossomServers.length === 0) {
      throw new Error('Blossom servers are required');
    }
    return new BlossomUploadProvider(blossomServers, signer);
  }

  static getDefaultConfig(): UploadConfig {
    return {
      defaultProvider: 'blossom',
      blossomServers: [
        'https://blossom.primal.net',
        'https://blossom.nostr.band'
      ],
      blossomEnabled: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB for Blossom
      allowedTypes: ['*/*'] // Blossom supports all file types
    };
  }
}