import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  COMPREHENSIVE_LANGUAGES,
  ALL_LANGUAGES,
  POPULAR_LANGUAGES,
  COMPREHENSIVE_GENRES,
  POPULAR_GENRES,
  validateLanguageCode,
  getLanguageName,
  filterLanguages,
  validateGenre,
  getAllGenres,
  filterGenres,
  loadCustomGenres,
  saveCustomGenre,
  removeCustomGenre,
  isCustomGenre,
  getGenreSuggestions,
  getLanguageSuggestions,
} from '../musicMetadata';

describe('Music Metadata Utilities', () => {
  describe('Language Configuration', () => {
    it('should have instrumental option as first language', () => {
      expect(COMPREHENSIVE_LANGUAGES[0].isInstrumental).toBe(true);
      expect(COMPREHENSIVE_LANGUAGES[0].code).toBeNull();
      expect(COMPREHENSIVE_LANGUAGES[0].name).toBe("None (Instrumental)");
    });

    it('should have all languages with valid ISO 639-1 codes', () => {
      ALL_LANGUAGES.forEach(lang => {
        if (!lang.isInstrumental) {
          expect(lang.code).toMatch(/^[a-z]{2}$/);
        }
      });
    });

    it('should have unique language codes', () => {
      const codes = ALL_LANGUAGES.filter(l => l.code).map(l => l.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should include common languages in popular list', () => {
      const popularCodes = POPULAR_LANGUAGES.map(l => l.code);
      expect(popularCodes).toContain('en');
      expect(popularCodes).toContain('es');
      expect(popularCodes).toContain('fr');
      expect(popularCodes).toContain('de');
    });
  });

  describe('Language Validation', () => {
    it('should accept valid ISO 639-1 codes', () => {
      expect(validateLanguageCode('en')).toBe(true);
      expect(validateLanguageCode('es')).toBe(true);
      expect(validateLanguageCode('fr')).toBe(true);
      expect(validateLanguageCode('zh')).toBe(true);
    });

    it('should accept null for instrumental tracks', () => {
      expect(validateLanguageCode(null)).toBe(true);
    });

    it('should accept undefined for unspecified language', () => {
      expect(validateLanguageCode(undefined)).toBe(true);
    });

    it('should reject invalid language codes', () => {
      expect(validateLanguageCode('eng')).toBe(false);
      expect(validateLanguageCode('e')).toBe(false);
      expect(validateLanguageCode('EN')).toBe(false);
      expect(validateLanguageCode('123')).toBe(false);
      expect(validateLanguageCode('')).toBe(false);
    });
  });

  describe('Language Name Lookup', () => {
    it('should return correct language names', () => {
      expect(getLanguageName('en')).toBe('English');
      expect(getLanguageName('es')).toBe('Spanish');
      expect(getLanguageName('fr')).toBe('French');
      expect(getLanguageName('ja')).toBe('Japanese');
    });

    it('should return instrumental text for null', () => {
      expect(getLanguageName(null)).toBe('None (Instrumental)');
    });

    it('should return instrumental text for undefined', () => {
      expect(getLanguageName(undefined)).toBe('None (Instrumental)');
    });

    it('should return uppercase code for unknown languages', () => {
      expect(getLanguageName('xx')).toBe('XX');
    });
  });

  describe('Language Filtering', () => {
    it('should return all languages for empty query', () => {
      const result = filterLanguages('');
      expect(result.length).toBe(ALL_LANGUAGES.length);
    });

    it('should filter by language name', () => {
      const result = filterLanguages('english');
      expect(result.some(l => l.code === 'en')).toBe(true);
    });

    it('should filter by language code', () => {
      const result = filterLanguages('en');
      expect(result.some(l => l.code === 'en')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const result1 = filterLanguages('SPANISH');
      const result2 = filterLanguages('spanish');
      expect(result1).toEqual(result2);
    });

    it('should find partial matches', () => {
      const result = filterLanguages('port');
      expect(result.some(l => l.name === 'Portuguese')).toBe(true);
    });
  });

  describe('Language Suggestions', () => {
    it('should limit results', () => {
      const result = getLanguageSuggestions('', 5);
      expect(result.length).toBe(5);
    });

    it('should return matching languages', () => {
      const result = getLanguageSuggestions('span');
      expect(result.some(l => l.name === 'Spanish')).toBe(true);
    });
  });
});

describe('Genre Configuration', () => {
  describe('Genre Lists', () => {
    it('should have comprehensive genre list', () => {
      expect(COMPREHENSIVE_GENRES.length).toBeGreaterThan(100);
    });

    it('should include popular genres', () => {
      expect(COMPREHENSIVE_GENRES).toContain('Pop');
      expect(COMPREHENSIVE_GENRES).toContain('Rock');
      expect(COMPREHENSIVE_GENRES).toContain('Hip Hop');
      expect(COMPREHENSIVE_GENRES).toContain('Electronic');
      expect(COMPREHENSIVE_GENRES).toContain('Jazz');
    });

    it('should include subgenres', () => {
      expect(COMPREHENSIVE_GENRES).toContain('Indie Rock');
      expect(COMPREHENSIVE_GENRES).toContain('Deep House');
      expect(COMPREHENSIVE_GENRES).toContain('Death Metal');
      expect(COMPREHENSIVE_GENRES).toContain('Lo-Fi Hip Hop');
    });

    it('should have popular genres as subset of comprehensive', () => {
      POPULAR_GENRES.forEach(genre => {
        expect(COMPREHENSIVE_GENRES).toContain(genre);
      });
    });
  });

  describe('Genre Validation', () => {
    it('should accept valid genre strings', () => {
      expect(validateGenre('Rock')).toBe(true);
      expect(validateGenre('Hip Hop')).toBe(true);
      expect(validateGenre('Custom Genre')).toBe(true);
    });

    it('should accept null for unspecified genre', () => {
      expect(validateGenre(null)).toBe(true);
    });

    it('should accept undefined for unspecified genre', () => {
      expect(validateGenre(undefined)).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(validateGenre('')).toBe(false);
      expect(validateGenre('   ')).toBe(false);
    });
  });

  describe('Genre Filtering', () => {
    it('should return popular genres first for empty query', () => {
      const result = filterGenres('', false);
      // First results should be popular genres
      const firstResults = result.slice(0, POPULAR_GENRES.length);
      POPULAR_GENRES.forEach(genre => {
        expect(firstResults).toContain(genre);
      });
    });

    it('should filter by genre name', () => {
      const result = filterGenres('rock');
      expect(result).toContain('Rock');
      expect(result.some(g => g.includes('Rock'))).toBe(true);
    });

    it('should prioritize exact matches', () => {
      const result = filterGenres('pop');
      expect(result[0]).toBe('Pop');
    });

    it('should prioritize starts-with matches', () => {
      const result = filterGenres('elec');
      expect(result[0]).toBe('Electronic');
    });

    it('should be case-insensitive', () => {
      const result1 = filterGenres('JAZZ');
      const result2 = filterGenres('jazz');
      expect(result1).toEqual(result2);
    });
  });

  describe('Genre Suggestions', () => {
    it('should limit results', () => {
      const result = getGenreSuggestions('', 5);
      expect(result.length).toBe(5);
    });

    it('should return matching genres', () => {
      const result = getGenreSuggestions('met');
      expect(result.some(g => g.includes('Metal'))).toBe(true);
    });
  });
});

describe('Custom Genre Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadCustomGenres', () => {
    it('should return empty array when no custom genres', () => {
      const result = loadCustomGenres();
      expect(result).toEqual([]);
    });

    it('should load saved custom genres', () => {
      localStorage.setItem('tsunami_custom_genres', JSON.stringify(['Custom1', 'Custom2']));
      const result = loadCustomGenres();
      expect(result).toEqual(['Custom1', 'Custom2']);
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('tsunami_custom_genres', 'invalid json');
      const result = loadCustomGenres();
      expect(result).toEqual([]);
    });
  });

  describe('saveCustomGenre', () => {
    it('should save a new custom genre', () => {
      const result = saveCustomGenre('My Custom Genre');
      expect(result).toBe(true);
      expect(loadCustomGenres()).toContain('My Custom Genre');
    });

    it('should trim whitespace', () => {
      saveCustomGenre('  Trimmed Genre  ');
      expect(loadCustomGenres()).toContain('Trimmed Genre');
    });

    it('should reject empty strings', () => {
      const result = saveCustomGenre('');
      expect(result).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      const result = saveCustomGenre('   ');
      expect(result).toBe(false);
    });

    it('should reject duplicates (case-insensitive)', () => {
      saveCustomGenre('My Genre');
      const result = saveCustomGenre('my genre');
      expect(result).toBe(false);
    });

    it('should reject genres that exist in comprehensive list', () => {
      const result = saveCustomGenre('Rock');
      expect(result).toBe(false);
    });
  });

  describe('removeCustomGenre', () => {
    it('should remove an existing custom genre', () => {
      saveCustomGenre('To Remove');
      const result = removeCustomGenre('To Remove');
      expect(result).toBe(true);
      expect(loadCustomGenres()).not.toContain('To Remove');
    });

    it('should return false for non-existent genre', () => {
      const result = removeCustomGenre('Does Not Exist');
      expect(result).toBe(false);
    });

    it('should be case-insensitive', () => {
      saveCustomGenre('Case Test');
      const result = removeCustomGenre('case test');
      expect(result).toBe(true);
    });
  });

  describe('isCustomGenre', () => {
    it('should return true for custom genres', () => {
      saveCustomGenre('Custom Test');
      expect(isCustomGenre('Custom Test')).toBe(true);
    });

    it('should return false for non-custom genres', () => {
      expect(isCustomGenre('Rock')).toBe(false);
    });

    it('should be case-insensitive', () => {
      saveCustomGenre('Case Check');
      expect(isCustomGenre('case check')).toBe(true);
    });
  });

  describe('getAllGenres', () => {
    it('should include comprehensive genres', () => {
      const result = getAllGenres();
      expect(result).toContain('Rock');
      expect(result).toContain('Pop');
    });

    it('should include custom genres', () => {
      saveCustomGenre('My Custom');
      const result = getAllGenres();
      expect(result).toContain('My Custom');
    });

    it('should not duplicate genres', () => {
      saveCustomGenre('Unique Genre');
      const result = getAllGenres();
      const count = result.filter(g => g === 'Unique Genre').length;
      expect(count).toBe(1);
    });

    it('should be sorted alphabetically', () => {
      const result = getAllGenres();
      const sorted = [...result].sort((a, b) => a.localeCompare(b));
      expect(result).toEqual(sorted);
    });
  });
});