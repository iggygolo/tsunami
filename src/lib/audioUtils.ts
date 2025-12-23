/**
 * Audio format conversion utilities
 * Provides consistent conversion between MIME types and file format strings
 */

/**
 * Convert audio MIME type to file format string
 * @param audioType - MIME type (e.g., 'audio/mpeg', 'audio/wav')
 * @returns File format string (e.g., 'mp3', 'wav')
 */
export function audioTypeToFormat(audioType: string): string {
  const format = audioType === 'audio/mpeg' ? 'mp3' :
                audioType === 'audio/wav' ? 'wav' :
                audioType === 'audio/mp4' ? 'm4a' :
                audioType === 'audio/ogg' ? 'ogg' :
                audioType === 'audio/flac' ? 'flac' : 'mp3';
  
  return format;
}

/**
 * Convert file format string to audio MIME type
 * @param format - File format string (e.g., 'mp3', 'wav')
 * @returns MIME type (e.g., 'audio/mpeg', 'audio/wav')
 */
export function formatToAudioType(format: string): string {
  const audioType = format === 'mp3' ? 'audio/mpeg' :
                   format === 'wav' ? 'audio/wav' :
                   format === 'm4a' ? 'audio/mp4' :
                   format === 'ogg' ? 'audio/ogg' :
                   format === 'flac' ? 'audio/flac' : 'audio/mpeg';
  
  return audioType;
}