import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useBlossomServers } from "./useBlossomServers";
import { useUploadConfig } from "./useUploadConfig";
import { UploadProviderFactory, UploadProviderError } from '@/lib/uploadProviders';
import type { UploadProvider } from '@/lib/uploadProviders';

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
      console.log('Using upload provider:', config.defaultProvider);

      // Use configured provider
      if (config.defaultProvider === 'vercel' && config.vercelEnabled) {
        return await uploadWithVercel(correctedFile, user);
      } else {
        return await uploadWithBlossom(correctedFile, user, allServers);
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
 * Upload with Vercel and return tags format for compatibility
 */
async function uploadWithVercel(file: File, user: any): Promise<string[][]> {
  try {
    const provider = UploadProviderFactory.createProvider('vercel', user.pubkey, user.signer);
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

