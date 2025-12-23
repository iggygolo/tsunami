import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { verifyEvent } from 'nostr-tools';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

interface UploadRequest {
  filename: string;
  contentType: string;
  size: number;
  userPubkey: string;
  signature: string;
  timestamp: number;
}

/**
 * Sanitize filename to prevent security issues
 */
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const sanitized = filename
    .replace(/[\/\\]/g, '_')  // Replace slashes with underscores
    .replace(/\.\./g, '_')    // Replace .. with underscores
    .replace(/[<>:"|?*]/g, '_') // Replace invalid characters
    .trim();
  
  // Ensure filename is not empty and has reasonable length
  if (!sanitized || sanitized.length === 0) {
    return 'unnamed_file';
  }
  
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 250 - (ext ? ext.length + 1 : 0));
    return ext ? `${name}.${ext}` : name;
  }
  
  return sanitized;
}

/**
 * Validate file parameters
 */
function validateFile(filename: string, contentType: string, size: number): { valid: boolean; error?: string } {
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size ${size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes` };
  }
  
  if (size <= 0) {
    return { valid: false, error: 'File size must be greater than 0' };
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return { valid: false, error: `File type ${contentType} is not allowed` };
  }
  
  // Check filename
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: 'Filename is required' };
  }
  
  return { valid: true };
}

/**
 * Verify Nostr signature for authentication
 */
function verifyNostrSignature(
  userPubkey: string,
  signature: string,
  timestamp: number,
  filename: string,
  contentType: string,
  size: number
): boolean {
  try {
    // Create the event that should have been signed
    const event = {
      kind: 27235, // Custom kind for file upload authorization
      pubkey: userPubkey,
      created_at: timestamp,
      tags: [
        ['filename', filename],
        ['content-type', contentType],
        ['size', size.toString()],
        ['action', 'upload']
      ],
      content: 'File upload authorization',
      id: '', // Will be calculated by verifyEvent
      sig: signature
    };
    
    // Verify the event signature
    return verifyEvent(event);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Generate unique filename with timestamp
 */
function generateUniqueFilename(originalFilename: string, userPubkey: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  const userPrefix = userPubkey.substring(0, 8); // First 8 chars of pubkey
  
  const ext = sanitized.split('.').pop();
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.')) || sanitized;
  
  return ext 
    ? `${userPrefix}_${timestamp}_${nameWithoutExt}.${ext}`
    : `${userPrefix}_${timestamp}_${nameWithoutExt}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const body = req.body as HandleUploadBody;
    
    // For Vercel Blob client uploads, the payload comes in a different format
    // Let's extract it from the request body directly
    let payload: UploadRequest;
    
    // Check if this is a client upload request with our custom data
    if (typeof body === 'object' && 'type' in body && body.type === 'blob.generate-client-token') {
      // This is the initial token generation request
      // Our custom data should be in the clientPayload
      try {
        const clientPayload = (body as any).clientPayload;
        payload = JSON.parse(clientPayload || '{}');
      } catch (parseError) {
        return res.status(400).json({
          error: 'Invalid client payload format',
          code: 'INVALID_PAYLOAD'
        });
      }
    } else {
      return res.status(400).json({
        error: 'Invalid request format',
        code: 'INVALID_REQUEST'
      });
    }
    
    const { filename, contentType, size, userPubkey, signature, timestamp } = payload;
    
    // Validate required fields
    if (!filename || !contentType || !size || !userPubkey || !signature || !timestamp) {
      return res.status(400).json({
        error: 'Missing required fields: filename, contentType, size, userPubkey, signature, timestamp',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Validate timestamp (should be within last 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = Math.floor(timestamp / 1000);
    if (Math.abs(now - requestTime) > 300) { // 5 minutes
      return res.status(401).json({
        error: 'Request timestamp is too old or too far in the future',
        code: 'INVALID_TIMESTAMP'
      });
    }
    
    // Validate file parameters
    const fileValidation = validateFile(filename, contentType, size);
    if (!fileValidation.valid) {
      return res.status(400).json({
        error: fileValidation.error,
        code: 'INVALID_FILE'
      });
    }
    
    // Verify Nostr signature
    if (!verifyNostrSignature(userPubkey, signature, Math.floor(timestamp / 1000), filename, contentType, size)) {
      return res.status(401).json({
        error: 'Invalid signature',
        code: 'INVALID_SIGNATURE'
      });
    }
    
    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(filename, userPubkey);
    
    // Handle the upload with Vercel Blob
    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname: string) => {
        // Additional validation can be done here
        console.log('Generating token for:', pathname);
        return {
          allowedContentTypes: [contentType],
        };
      },
      onUploadCompleted: async ({ blob }: { blob: any }) => {
        // Log successful upload
        console.log('Upload completed:', {
          url: blob.url,
          userPubkey,
          originalFilename: filename
        });
      },
    });
    
    return res.json(response);
    
  } catch (error) {
    console.error('Upload handler error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      return res.status(500).json({
        error: 'Upload failed',
        message: error.message,
        code: 'UPLOAD_ERROR'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}