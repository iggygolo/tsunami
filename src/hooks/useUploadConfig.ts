import { useLocalStorage } from './useLocalStorage';
import type { UploadConfig } from '@/lib/uploadProviders';
import { UploadProviderFactory } from '@/lib/uploadProviders';

const UPLOAD_CONFIG_KEY = 'tsunami_upload_config';

/**
 * Hook for managing upload provider configuration
 */
export function useUploadConfig() {
  const [config, setConfig] = useLocalStorage<UploadConfig>(
    UPLOAD_CONFIG_KEY,
    UploadProviderFactory.getDefaultConfig()
  );

  const updateProvider = (provider: 'blossom' | 'vercel') => {
    setConfig(prev => ({
      ...prev,
      defaultProvider: provider
    }));
  };

  return {
    config,
    updateProvider,
    setConfig
  };
}