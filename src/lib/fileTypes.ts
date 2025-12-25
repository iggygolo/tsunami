/**
 * Centralized file type configuration
 * This should match the ALLOWED_MIME_TYPES in api/upload.ts
 */

// Import from upload.ts would be ideal, but since it's in api/ folder,
// we'll maintain consistency by duplicating the audio types here
export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/x-wav', // WAV variant for better browser compatibility
  'audio/flac',
  'audio/opus',
  'audio/webm'
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska'
] as const;

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
] as const;

// File extensions mapped from MIME types
export const AUDIO_EXTENSIONS = [
  'mp3',    // audio/mpeg
  'm4a',    // audio/mp4
  'aac',    // audio/aac
  'ogg',    // audio/ogg
  'wav',    // audio/x-wav
  'flac',   // audio/flac
  'opus',   // audio/opus
  'webm'    // audio/webm
] as const;

export const VIDEO_EXTENSIONS = [
  'mp4',    // video/mp4
  'mov',    // video/quicktime
  'avi',    // video/x-msvideo
  'mkv'     // video/x-matroska
] as const;

export const IMAGE_EXTENSIONS = [
  'jpg',    // image/jpeg
  'jpeg',   // image/jpeg
  'png',    // image/png
  'gif',    // image/gif
  'webp',   // image/webp
  'svg'     // image/svg+xml
] as const;

/**
 * Convert MIME type to file extension
 */
export function mimeTypeToExtension(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/x-wav': 'wav',
    'audio/flac': 'flac',
    'audio/opus': 'opus',
    'audio/webm': 'webm',
    // Video
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
    // Images
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };
  
  return mimeMap[mimeType] || 'unknown';
}

/**
 * Convert file extension to MIME type
 */
export function extensionToMimeType(extension: string): string {
  const extMap: Record<string, string> = {
    // Audio
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'wav': 'audio/x-wav',
    'flac': 'audio/flac',
    'opus': 'audio/opus',
    'webm': 'audio/webm',
    // Video
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  };
  
  return extMap[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Check if a MIME type is a supported audio format
 */
export function isAudioMimeType(mimeType: string): boolean {
  return AUDIO_MIME_TYPES.includes(mimeType as any);
}

/**
 * Check if a file extension is a supported audio format
 */
export function isAudioExtension(extension: string): boolean {
  return AUDIO_EXTENSIONS.includes(extension.toLowerCase() as any);
}

/**
 * Validate audio file by both extension and MIME type
 */
export function validateAudioFile(filename: string, mimeType: string): {
  valid: boolean;
  error?: string;
} {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return { valid: false, error: 'File must have an extension' };
  }
  
  if (!isAudioExtension(extension)) {
    return { 
      valid: false, 
      error: `Unsupported file extension: .${extension}. Supported formats: ${AUDIO_EXTENSIONS.join(', ').toUpperCase()}` 
    };
  }
  
  // More flexible MIME type validation for WAV files and empty MIME types
  const isValidMimeType = isAudioMimeType(mimeType) || 
                         (extension === 'wav' && (mimeType === '' || mimeType === 'audio/x-wav'));
  
  if (!isValidMimeType) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${mimeType}. Please select a valid audio file.` 
    };
  }
  
  return { valid: true };
}