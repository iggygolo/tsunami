/**
 * URL validation utilities for music track metadata
 * Ensures URLs work across different clients and follow proper format
 */

/**
 * Validate that a URL is properly formatted and accessible
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  try {
    const urlObj = new URL(trimmedUrl);
    
    // Only allow HTTP and HTTPS protocols for security
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { 
        isValid: false, 
        error: 'URL must use HTTP or HTTPS protocol' 
      };
    }

    // Ensure hostname is present
    if (!urlObj.hostname) {
      return { isValid: false, error: 'URL must have a valid hostname' };
    }

    // Check for suspicious or invalid characters
    if (urlObj.href !== trimmedUrl) {
      return { 
        isValid: false, 
        error: 'URL contains invalid characters or formatting' 
      };
    }

    return { isValid: true };
  } catch {
    return { 
      isValid: false, 
      error: 'Invalid URL format' 
    };
  }
}

/**
 * Validate audio file URL
 */
export function validateAudioUrl(url: string): { isValid: boolean; error?: string } {
  const baseValidation = validateUrl(url);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check for common audio file extensions
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma'];
    const hasAudioExtension = audioExtensions.some(ext => pathname.endsWith(ext));
    
    // Allow URLs without extensions (could be dynamic/API endpoints)
    // but warn if it doesn't look like an audio file
    if (!hasAudioExtension && pathname.includes('.')) {
      return {
        isValid: true, // Still valid, but might not be audio
        error: 'URL does not appear to be an audio file'
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid audio URL format' };
  }
}

/**
 * Validate image file URL
 */
export function validateImageUrl(url: string): { isValid: boolean; error?: string } {
  const baseValidation = validateUrl(url);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check for common image file extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    
    // Allow URLs without extensions (could be dynamic/API endpoints)
    if (!hasImageExtension && pathname.includes('.')) {
      return {
        isValid: true,
        error: 'URL does not appear to be an image file'
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid image URL format' };
  }
}

/**
 * Validate video file URL
 */
export function validateVideoUrl(url: string): { isValid: boolean; error?: string } {
  const baseValidation = validateUrl(url);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check for common video file extensions
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    const hasVideoExtension = videoExtensions.some(ext => pathname.endsWith(ext));
    
    // Allow URLs without extensions (could be dynamic/API endpoints)
    if (!hasVideoExtension && pathname.includes('.')) {
      return {
        isValid: true,
        error: 'URL does not appear to be a video file'
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid video URL format' };
  }
}

/**
 * Validate multiple URLs of different types
 */
export function validateMediaUrls(urls: {
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (urls.audioUrl) {
    const audioValidation = validateAudioUrl(urls.audioUrl);
    if (!audioValidation.isValid) {
      errors.push(`Audio URL: ${audioValidation.error}`);
    }
  }

  if (urls.imageUrl) {
    const imageValidation = validateImageUrl(urls.imageUrl);
    if (!imageValidation.isValid) {
      errors.push(`Image URL: ${imageValidation.error}`);
    }
  }

  if (urls.videoUrl) {
    const videoValidation = validateVideoUrl(urls.videoUrl);
    if (!videoValidation.isValid) {
      errors.push(`Video URL: ${videoValidation.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalize URL by trimming whitespace and ensuring proper format
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  
  // Add https:// if no protocol is specified
  if (trimmed && !trimmed.match(/^https?:\/\//i)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Check if URL is likely to work across different clients
 * This includes checking for common compatibility issues
 */
export function checkCrossClientCompatibility(url: string): {
  isCompatible: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  try {
    const urlObj = new URL(url);
    
    // Check for localhost or private IP addresses
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.startsWith('192.168.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      warnings.push('URL uses localhost or private IP address - may not work for other users');
    }
    
    // Check for non-standard ports
    if (urlObj.port && !['80', '443'].includes(urlObj.port)) {
      warnings.push('URL uses non-standard port - may be blocked by some clients');
    }
    
    // Check for HTTPS (recommended for security)
    if (urlObj.protocol === 'http:') {
      warnings.push('HTTP URLs may be blocked by some clients - HTTPS is recommended');
    }
    
    // Check for very long URLs
    if (url.length > 2048) {
      warnings.push('Very long URLs may cause issues in some clients');
    }
    
    return {
      isCompatible: warnings.length === 0,
      warnings
    };
  } catch {
    return {
      isCompatible: false,
      warnings: ['Invalid URL format']
    };
  }
}