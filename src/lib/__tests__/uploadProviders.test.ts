import { describe, it, expect } from 'vitest';
import { UploadProviderFactory, UploadProviderError } from '../uploadProviders';

describe('UploadProviders', () => {
  describe('UploadProviderFactory', () => {
    it('should return default configuration', () => {
      const config = UploadProviderFactory.getDefaultConfig();
      
      expect(config.defaultProvider).toBe('blossom');
      expect(config.blossomEnabled).toBe(true);
      expect(config.maxFileSize).toBeGreaterThan(0);
      expect(config.allowedTypes).toContain('*/*');
      expect(config.blossomServers).toEqual([
        'https://blossom.primal.net',
        'https://blossom.nostr.band'
      ]);
    });

    it('should create Blossom provider', () => {
      expect(() => {
        UploadProviderFactory.createProvider(
          'test-pubkey',
          {},
          ['https://test-server.com']
        );
      }).not.toThrow();
    });

    it('should throw error for Blossom without servers', () => {
      expect(() => {
        UploadProviderFactory.createProvider(
          'test-pubkey',
          {},
          []
        );
      }).toThrow('Blossom servers are required');
    });
  });

  describe('UploadProviderError', () => {
    it('should create error with code and message', () => {
      const error = new UploadProviderError(
        'TEST_ERROR',
        'Test error message',
        'blossom',
        { test: 'data' },
        true
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.provider).toBe('blossom');
      expect(error.details).toEqual({ test: 'data' });
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('UploadProviderError');
    });
  });
});