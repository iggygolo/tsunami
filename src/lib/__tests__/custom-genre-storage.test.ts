import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveCustomGenre,
  loadCustomGenres,
  removeCustomGenre,
  isCustomGenre,
  getAllGenres,
  COMPREHENSIVE_GENRES
} from '../musicMetadata';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Custom Genre Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('saveCustomGenre', () => {
    it('should save a new custom genre', () => {
      const result = saveCustomGenre('Synthwave Test');
      
      expect(result).toBe(true);
      expect(loadCustomGenres()).toContain('Synthwave Test');
    });

    it('should trim whitespace from genre names', () => {
      const result = saveCustomGenre('  Vaporwave Test  ');
      
      expect(result).toBe(true);
      expect(loadCustomGenres()).toContain('Vaporwave Test');
      expect(loadCustomGenres()).not.toContain('  Vaporwave Test  ');
    });

    it('should prevent duplicate genres (case-insensitive)', () => {
      saveCustomGenre('Darkwave Test');
      const result = saveCustomGenre('darkwave test'); // Different case
      
      expect(result).toBe(false);
      expect(loadCustomGenres()).toEqual(['Darkwave Test']);
    });

    it('should prevent saving genres that already exist in comprehensive list', () => {
      const result = saveCustomGenre('Rock'); // Already in COMPREHENSIVE_GENRES
      
      expect(result).toBe(false);
      expect(loadCustomGenres()).not.toContain('Rock');
    });

    it('should not save empty or whitespace-only genres', () => {
      const result1 = saveCustomGenre('');
      const result2 = saveCustomGenre('   ');
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(loadCustomGenres()).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = saveCustomGenre('TestGenre');
      
      expect(result).toBe(false);
      
      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });

    it('should return false in server environment (no window)', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = saveCustomGenre('TestGenre');
      
      expect(result).toBe(false);
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('loadCustomGenres', () => {
    it('should return empty array when no custom genres exist', () => {
      const genres = loadCustomGenres();
      
      expect(genres).toEqual([]);
    });

    it('should load saved custom genres', () => {
      saveCustomGenre('Synthwave Test');
      saveCustomGenre('Vaporwave Test');
      
      const genres = loadCustomGenres();
      
      expect(genres).toEqual(['Synthwave Test', 'Vaporwave Test']);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('tsunami_custom_genres', 'invalid json');
      
      const genres = loadCustomGenres();
      
      expect(genres).toEqual([]);
    });

    it('should filter out non-string values', () => {
      localStorageMock.setItem('tsunami_custom_genres', JSON.stringify(['Valid', null, 123, '', 'Another']));
      
      const genres = loadCustomGenres();
      
      expect(genres).toEqual(['Valid', 'Another']);
    });

    it('should return empty array in server environment (no window)', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const genres = loadCustomGenres();
      
      expect(genres).toEqual([]);
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('removeCustomGenre', () => {
    beforeEach(() => {
      saveCustomGenre('Synthwave Test');
      saveCustomGenre('Vaporwave Test');
      saveCustomGenre('Darkwave Test');
    });

    it('should remove an existing custom genre', () => {
      const result = removeCustomGenre('Synthwave Test');
      
      expect(result).toBe(true);
      expect(loadCustomGenres()).not.toContain('Synthwave Test');
      expect(loadCustomGenres()).toContain('Vaporwave Test');
      expect(loadCustomGenres()).toContain('Darkwave Test');
    });

    it('should be case-insensitive when removing genres', () => {
      const result = removeCustomGenre('synthwave test'); // Different case
      
      expect(result).toBe(true);
      expect(loadCustomGenres()).not.toContain('Synthwave Test');
    });

    it('should return false when trying to remove non-existent genre', () => {
      const result = removeCustomGenre('NonExistent');
      
      expect(result).toBe(false);
      expect(loadCustomGenres()).toHaveLength(3); // No change
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      const result = removeCustomGenre('Synthwave');
      
      expect(result).toBe(false);
      
      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });

    it('should return false in server environment (no window)', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const result = removeCustomGenre('Synthwave');
      
      expect(result).toBe(false);
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('isCustomGenre', () => {
    beforeEach(() => {
      saveCustomGenre('Synthwave Test');
      saveCustomGenre('Vaporwave Test');
    });

    it('should return true for existing custom genres', () => {
      expect(isCustomGenre('Synthwave Test')).toBe(true);
      expect(isCustomGenre('Vaporwave Test')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isCustomGenre('synthwave test')).toBe(true);
      expect(isCustomGenre('VAPORWAVE TEST')).toBe(true);
    });

    it('should return false for non-custom genres', () => {
      expect(isCustomGenre('Rock')).toBe(false);
      expect(isCustomGenre('NonExistent')).toBe(false);
    });
  });

  describe('getAllGenres integration', () => {
    it('should include custom genres in getAllGenres result', () => {
      saveCustomGenre('Synthwave Test');
      saveCustomGenre('Vaporwave Test');
      
      const allGenres = getAllGenres();
      
      expect(allGenres).toContain('Synthwave Test');
      expect(allGenres).toContain('Vaporwave Test');
      // Should also contain comprehensive genres
      expect(allGenres).toContain('Rock');
      expect(allGenres).toContain('Jazz');
    });

    it('should not duplicate genres that exist in comprehensive list', () => {
      saveCustomGenre('Custom Test Genre');
      
      const allGenres = getAllGenres();
      const rockCount = allGenres.filter(g => g === 'Rock').length;
      
      expect(rockCount).toBe(1); // Should only appear once
      expect(allGenres).toContain('Custom Test Genre');
    });

    it('should return sorted genres', () => {
      saveCustomGenre('Zebra Test Genre');
      saveCustomGenre('Alpha Test Genre');
      
      const allGenres = getAllGenres();
      const customGenreIndices = [
        allGenres.indexOf('Alpha Test Genre'),
        allGenres.indexOf('Zebra Test Genre')
      ];
      
      expect(customGenreIndices[0]).toBeLessThan(customGenreIndices[1]);
    });
  });

  describe('storage quota and error handling', () => {
    it('should handle storage quota exceeded error', () => {
      // Mock localStorage to simulate quota exceeded
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      const result = saveCustomGenre('TestGenre');
      
      expect(result).toBe(false);
      
      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });

    it('should handle localStorage access denied error', () => {
      // Mock localStorage to simulate access denied
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('Access denied');
      });

      const result = saveCustomGenre('TestGenre');
      
      expect(result).toBe(false);
      
      // Restore original setItem
      localStorageMock.setItem = originalSetItem;
    });

    it('should handle localStorage getItem errors', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn(() => {
        throw new Error('Storage access error');
      });

      const genres = loadCustomGenres();
      
      expect(genres).toEqual([]);
      
      // Restore original getItem
      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('data validation and sanitization', () => {
    it('should handle special characters in genre names', () => {
      const specialGenres = [
        'Test-Rock',
        'Test & Bass',
        'Test-Hop/Rap',
        'Test&B',
        'Test-Metal'
      ];

      specialGenres.forEach(genre => {
        const result = saveCustomGenre(genre);
        expect(result).toBe(true);
      });

      const savedGenres = loadCustomGenres();
      specialGenres.forEach(genre => {
        expect(savedGenres).toContain(genre);
      });
    });

    it('should handle very long genre names', () => {
      const longGenre = 'A'.repeat(100);
      const result = saveCustomGenre(longGenre);
      
      expect(result).toBe(true);
      expect(loadCustomGenres()).toContain(longGenre);
    });

    it('should handle unicode characters in genre names', () => {
      const unicodeGenres = ['Música Electrónica', 'Рок', '音楽', 'موسيقى'];
      
      unicodeGenres.forEach(genre => {
        const result = saveCustomGenre(genre);
        expect(result).toBe(true);
      });

      const savedGenres = loadCustomGenres();
      unicodeGenres.forEach(genre => {
        expect(savedGenres).toContain(genre);
      });
    });
  });
});