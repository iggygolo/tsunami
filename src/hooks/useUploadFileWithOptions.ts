import { useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useBlossomServers } from "./useBlossomServers";
import { useUploadConfig } from "./useUploadConfig";
import { UploadProviderFactory, UploadProviderError } from '@/lib/uploadProviders';

/**
 * Upload options for per-upload customization
 */
export interface UploadOptions {
  /** Override the default provider for this upload */
  provider?: 'blossom' | 'vercel';
}

/**
 * Enhanced upload hook that allows per-upload provider override
 * Returns tags format for backward compatibility
 */
export function useUploadFileWithOptions() {
  const { user } = useCurrentUser();
  const { allServers } = useBlossomServers();
  const { config } = useUploadConfig();

  return useMutation({
    mutationFn: async ({ file, options = {} }: { file: File; options?: UploadOptions }) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      console.log('Starting file upload:', file.name, file.size, file.type);

      // Determine which provider to use (override or default)
      const providerType = options.provider || config.defaultProvider;
      console.log('Using upload provider:', providerType);

      // Validate provider is enabled
      if (providerType === 'vercel' && !config.vercelEnabled) {
        throw new Error('Vercel upload provider is disabled. Please enable it in Upload Provider settings.');
      }
      if (providerType === 'blossom' && !config.blossomEnabled) {
        throw new Error('Blossom upload provider is disabled. Please enable it in Upload Provider settings.');
      }

      // Validate file size based on provider
      const maxSize = providerType === 'vercel' ? 100 * 1024 * 1024 : 500 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds ${providerType} limit of ${maxSize / 1024 / 1024}MB`);
      }

      try {
        const provider = UploadProviderFactory.createProvider(
          providerType,
          user.pubkey,
          user.signer,
          allServers
        );

        const url = await provider.uploadFile(file);

        // Return in tags format for backward compatibility
        const tags = [
          ['url', url],
          ['m', file.type],
          ['size', file.size.toString()],
          ['x', ''], // Hash would go here if available
        ];

        console.log('Upload successful, tags:', tags);
        return tags;
      } catch (error) {
        console.error('Upload failed:', error);
        
        if (error instanceof UploadProviderError) {
          // Provide more specific error messages
          switch (error.code) {
            case 'AUTHENTICATION_FAILED':
              throw new Error('Authentication failed. Please check your login and try again.');
            case 'FILE_TOO_LARGE':
              throw new Error(`File is too large for ${providerType}. Maximum size is ${providerType === 'vercel' ? '100MB' : '500MB'}.`);
            case 'INVALID_FILE':
              throw new Error('Invalid file type. Please check the supported file formats.');
            case 'NETWORK_ERROR':
              throw new Error('Network error. Please check your connection and try again.');
            default:
              throw new Error(`${providerType} upload failed: ${error.message}`);
          }
        }
        
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });
}