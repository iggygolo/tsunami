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
  // Special case: Override audio/x-wav to audio/wav (standard MIME type)
  if (file.type === 'audio/x-wav') {
    console.log(`Overriding MIME type for ${file.name}: "audio/x-wav" -> "audio/wav"`);
    return new File([file], file.name, { type: 'audio/wav' });
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

  // Always use the correct MIME type from our mapping, especially for WAV files
  // This ensures WAV files always use 'audio/wav' regardless of browser detection
  if (file.type !== correctType) {
    console.log(`Correcting MIME type for ${file.name}: "${file.type}" -> "${correctType}"`);
    return new File([file], file.name, { type: correctType });
  }

  return file;
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
      
      // Log file type for debugging
      if (correctedFile.type.startsWith('audio/')) {
        console.log('🎵 UPLOADING AUDIO FILE');
      } else if (correctedFile.type.startsWith('image/')) {
        console.log('🖼️ UPLOADING IMAGE FILE');
      } else {
        console.log('📄 UPLOADING OTHER FILE TYPE');
      }

      // Use Blossom as the only provider (app is Blossom-only)
      console.log('🌸 USING BLOSSOM - SIGNING REQUIRED');
      
      // Use Blossom as default or fallback
      try {
        return await uploadWithBlossom(correctedFile, user, allServers);
      } catch (blossomError) {
        console.warn('Blossom upload failed:', blossomError);
        throw blossomError;
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

      console.log('Primary provider:', primaryProvider);

      // Use Blossom as the only provider
      try {
        const tags = await uploadWithBlossom(correctedFile, user, allServers);
        const url = tags.find(tag => tag[0] === 'url')?.[1] || '';
        return { url, provider: 'blossom', tags };
      } catch (error) {
        console.warn('Blossom upload failed:', error);
        throw error;
      }
    },
  });
}

