import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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
    expect(result.current.config.vercelEnabled).toBe(true);
    expect(result.current.config.blossomEnabled).toBe(true);
  });

  it('should update default provider', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useUploadConfig());
    
    act(() => {
      result.current.updateProvider('vercel');
    });
    
    expect(result.current.config.defaultProvider).toBe('vercel');
  });
});