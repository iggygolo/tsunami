import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useBlossomServers } from "./useBlossomServers";
import { useUploadConfig } from "./useUploadConfig";
import { UploadProviderFactory } from '@/lib/uploadProviders';

/**
 * Upload file options
 */
export interface UploadFileOptions {
  /** Override the default provider for this upload */
  provider?: 'blossom' | 'vercel';
  /** Enable fallback to alternative provider on failure */
  enableFallback?: boolean;
}

/**
 * Upload file result
 */
export interface UploadFileResult {
  /** File URL */
  url: string;
  /** Provider used for upload */
  provider: 'blossom' | 'vercel';
  /** NIP-94 tags (for Blossom uploads) */
  tags?: string[][];
}

/** Map of file extensions to MIME types for common audio/video formats */
const MIME_TYPE_MAP: Record<string, string> = {
  // Audio
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
  // Video
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  // Documents
  '.json': 'application/json',
  '.srt': 'text/srt',
  '.vtt': 'text/vtt',
};

/**
 * Ensure file has correct MIME type.
 * Some browsers don't detect MIME types correctly, especially for audio files.
 * This creates a new File with the correct type if needed.
 */
function ensureCorrectMimeType(file: File): File {
  // If file already has a valid type, return as-is
  if (file.type && file.type !== 'application/octet-stream') {
    return file;
  }

  // Get extension from filename
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext) {
    return file;
  }

  const correctType = MIME_TYPE_MAP[ext];
  if (!correctType) {
    return file;
  }

  console.log(`Correcting MIME type for ${file.name}: "${file.type}" -> "${correctType}"`);

  // Create new File with correct type
  return new File([file], file.name, { type: correctType });
}

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { allServers } = useBlossomServers();
  const { config } = useUploadConfig();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Ensure file has correct MIME type
      const correctedFile = ensureCorrectMimeType(file);

      console.log('Starting file upload:', correctedFile.name, correctedFile.size, correctedFile.type);
      console.log('Upload config:', config);
      console.log('Default provider:', config.defaultProvider);
      console.log('Vercel enabled:', config.vercelEnabled);
      console.log('Blossom enabled:', config.blossomEnabled);

      // Use the configured default provider
      if (config.defaultProvider === 'vercel' && config.vercelEnabled) {
        console.log('🚀 USING VERCEL - NO SIGNING REQUIRED');
        try {
          return await uploadWithVercel(correctedFile, user);
        } catch (vercelError) {
          console.warn('Vercel upload failed, falling back to Blossom:', vercelError);
          
          // Fallback to Blossom if Vercel fails
          if (config.blossomEnabled) {
            console.log('⚠️ FALLING BACK TO BLOSSOM - SIGNING REQUIRED');
            try {
              return await uploadWithBlossom(correctedFile, user, allServers);
            } catch (blossomError) {
              console.error('Both Vercel and Blossom uploads failed');
              throw new Error(`Upload failed. Vercel: ${vercelError instanceof Error ? vercelError.message : 'Unknown error'}. Blossom: ${blossomError instanceof Error ? blossomError.message : 'Unknown error'}`);
            }
          } else {
            throw vercelError;
          }
        }
      } else {
        console.log('🌸 USING BLOSSOM - SIGNING REQUIRED');
        // Use Blossom as default or fallback
        try {
          return await uploadWithBlossom(correctedFile, user, allServers);
        } catch (blossomError) {
          console.warn('Blossom upload failed:', blossomError);
          
          // Fallback to Vercel if enabled
          if (config.vercelEnabled) {
            console.log('⚠️ FALLING BACK TO VERCEL - NO SIGNING REQUIRED');
            try {
              return await uploadWithVercel(correctedFile, user);
            } catch (vercelError) {
              console.error('Both Blossom and Vercel uploads failed');
              throw new Error(`Upload failed. Blossom: ${blossomError instanceof Error ? blossomError.message : 'Unknown error'}. Vercel: ${vercelError instanceof Error ? vercelError.message : 'Unknown error'}`);
            }
          } else {
            throw blossomError;
          }
        }
      }
    },
  });
}

/**
 * Upload with Blossom (original behavior)
 */
async function uploadWithBlossom(file: File, user: any, allServers: string[]): Promise<string[][]> {
  console.log('Using Blossom servers:', allServers);

  const uploader = new BlossomUploader({
    servers: allServers,
    signer: user.signer,
  });

  try {
    const tags = await uploader.upload(file);
    console.log('Upload successful, tags:', tags);
    return tags;
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced upload hook with provider options and fallback support
 */
export function useUploadFileWithOptions() {
  const { user } = useCurrentUser();
  const { allServers } = useBlossomServers();
  const { config } = useUploadConfig();

  return useMutation({
    mutationFn: async ({ file, options = {} }: { file: File; options?: UploadFileOptions }): Promise<UploadFileResult> => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Ensure file has correct MIME type
      const correctedFile = ensureCorrectMimeType(file);

      console.log('Starting file upload with options:', correctedFile.name, correctedFile.size, correctedFile.type, options);

      // Determine which provider to use - default to blossom unless explicitly overridden
      const primaryProvider = options.provider || 'blossom';
      const enableFallback = options.enableFallback ?? config.fallbackEnabled;

      console.log('Primary provider:', primaryProvider, 'Fallback enabled:', enableFallback);

      // Try primary provider first
      if (primaryProvider === 'vercel') {
        if (!config.vercelEnabled) {
          throw new Error('Vercel upload is disabled. Please enable it in Upload Provider settings.');
        }
        
        try {
          const tags = await uploadWithVercel(correctedFile, user);
          const url = tags.find(tag => tag[0] === 'url')?.[1] || '';
          return { url, provider: 'vercel', tags };
        } catch (error) {
          console.warn('Vercel upload failed:', error);
          if (!enableFallback) throw error;
          
          // Fallback to Blossom
          try {
            const tags = await uploadWithBlossom(correctedFile, user, allServers);
            const url = tags.find(tag => tag[0] === 'url')?.[1] || '';
            return { url, provider: 'blossom', tags };
          } catch (fallbackError) {
            throw new Error(`Both providers failed. Vercel: ${error instanceof Error ? error.message : 'Unknown'}. Blossom: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`);
          }
        }
      } else {
        // Primary provider is Blossom
        try {
          const tags = await uploadWithBlossom(correctedFile, user, allServers);
          const url = tags.find(tag => tag[0] === 'url')?.[1] || '';
          return { url, provider: 'blossom', tags };
        } catch (error) {
          console.warn('Blossom upload failed:', error);
          if (!enableFallback || !config.vercelEnabled) {
            throw error;
          }
          
          // Fallback to Vercel if it's enabled
          try {
            const tags = await uploadWithVercel(correctedFile, user);
            const url = tags.find(tag => tag[0] === 'url')?.[1] || '';
            return { url, provider: 'vercel', tags };
          } catch (fallbackError) {
            throw new Error(`Both providers failed. Blossom: ${error instanceof Error ? error.message : 'Unknown'}. Vercel: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`);
          }
        }
      }
    },
  });
}

/**
 * Upload with Vercel and return tags format for compatibility
 */
async function uploadWithVercel(file: File, user: any): Promise<string[][]> {
  console.log('🚀 uploadWithVercel called - NO SIGNING SHOULD HAPPEN');
  try {
    console.log('Creating Vercel provider...');
    const provider = UploadProviderFactory.createProvider('vercel', user.pubkey, user.signer);
    console.log('Calling provider.uploadFile...');
    const url = await provider.uploadFile(file);
    
    // Return in tags format for backward compatibility
    const tags = [
      ['url', url],
      ['m', file.type],
      ['size', file.size.toString()],
      ['x', ''], // Hash would go here if available
    ];
    
    console.log('Vercel upload successful, tags:', tags);
    return tags;
  } catch (error) {
    console.error('Vercel upload failed:', error);
    throw new Error(`Vercel upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

