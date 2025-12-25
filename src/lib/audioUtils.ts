import { mimeTypeToExtension, extensionToMimeType } from './fileTypes';

/**
 * Audio format conversion utilities
 * Uses centralized file type configuration
 */

/**
 * Convert audio MIME type to file format string
 * @param audioType - MIME type (e.g., 'audio/mpeg', 'audio/x-wav')
 * @returns File format string (e.g., 'mp3', 'wav')
 */
export function audioTypeToFormat(audioType: string): string {
  return mimeTypeToExtension(audioType);
}

/**
 * Convert file format string to audio MIME type
 * @param format - File format string (e.g., 'mp3', 'wav')
 * @returns MIME type (e.g., 'audio/mpeg', 'audio/x-wav')
 */
export function formatToAudioType(format: string): string {
  return extensionToMimeType(format);
}