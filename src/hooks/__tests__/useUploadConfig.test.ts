import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUploadConfig } from '../useUploadConfig';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useUploadConfig', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should return default configuration initially', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useUploadConfig());
    
    expect(result.current.config.defaultProvider).toBe('blossom');
    expect(result.current.config.blossomServers).toEqual([
      'https://blossom.primal.net',
      'https://blossom.nostr.band'
    ]);
    expect(result.current.config.maxFileSize).toBeGreaterThan(0);
    expect(result.current.config.allowedTypes).toContain('*/*');
  });
});