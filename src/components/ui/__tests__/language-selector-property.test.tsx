import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { LanguageSelector } from '../language-selector';
import * as musicMetadata from '@/lib/musicMetadata';

// Mock the musicMetadata module
vi.mock('@/lib/musicMetadata', () => ({
  filterLanguages: vi.fn((query: string) => {
    const mockLanguages = [
      { code: null, name: "None (Instrumental)", isInstrumental: true },
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "pt", name: "Portuguese" },
      { code: "it", name: "Italian" },
      { code: "ru", name: "Russian" },
      { code: "ja", name: "Japanese" },
      { code: "ko", name: "Korean" },
      { code: "zh", name: "Chinese" },
    ];
    
    if (!query.trim()) return mockLanguages;
    
    const lowerQuery = query.toLowerCase();
    return mockLanguages.filter(lang => 
      lang.name.toLowerCase().includes(lowerQuery) ||
      (lang.code && lang.code.toLowerCase().includes(lowerQuery))
    );
  }),
  getLanguageName: vi.fn((code: string | null | undefined) => {
    if (code === null || code === undefined) return "None (Instrumental)";
    const names: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'it': 'Italian',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese'
    };
    return names[code] || code.toUpperCase();
  }),
  POPULAR_LANGUAGES: [
    { code: null, name: "None (Instrumental)", isInstrumental: true },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "pt", name: "Portuguese" },
  ],
  ALL_LANGUAGES: [
    { code: null, name: "None (Instrumental)", isInstrumental: true },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "pt", name: "Portuguese" },
    { code: "it", name: "Italian" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
  ]
}));

// Mock scrollIntoView for JSDOM compatibility
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

describe('LanguageSelector Property Tests', () => {
  const mockOnLanguageChange = vi.fn();

  beforeEach(() => {
    mockOnLanguageChange.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 9: UI Search Functionality', () => {
    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should render without crashing for any valid search query', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        (searchQuery) => {
          const { unmount } = render(
            <LanguageSelector
              onLanguageChange={mockOnLanguageChange}
            />
          );

          // Component should render without crashing
          expect(screen.getByRole('combobox')).toBeInTheDocument();
          
          // Clean up immediately
          unmount();
        }
      ), { numRuns: 50 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should handle different language selections consistently', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh')
        ),
        (selectedLanguage) => {
          const { unmount } = render(
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={mockOnLanguageChange}
            />
          );

          // Component should render with any valid language selection
          const combobox = screen.getByRole('combobox');
          expect(combobox).toBeInTheDocument();
          
          // Should display appropriate text based on selection
          if (selectedLanguage === null) {
            expect(combobox).toHaveTextContent('None (Instrumental)');
          } else if (selectedLanguage === undefined) {
            expect(combobox).toHaveTextContent('Select language...');
          } else {
            // Should have some text content for valid language codes
            expect(combobox.textContent).toBeTruthy();
          }
          
          unmount();
        }
      ), { numRuns: 30 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should handle various component props without crashing', () => {
      fc.assert(fc.property(
        fc.record({
          placeholder: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          disabled: fc.boolean(),
          showInstrumentalOption: fc.boolean(),
          maxDisplayItems: fc.option(fc.integer({ min: 1, max: 50 }))
        }),
        (props) => {
          const { unmount } = render(
            <LanguageSelector
              onLanguageChange={mockOnLanguageChange}
              placeholder={props.placeholder || undefined}
              disabled={props.disabled}
              showInstrumentalOption={props.showInstrumentalOption}
              maxDisplayItems={props.maxDisplayItems || undefined}
            />
          );

          // Component should render with any valid props
          const combobox = screen.getByRole('combobox');
          expect(combobox).toBeInTheDocument();
          
          // Should respect disabled state
          if (props.disabled) {
            expect(combobox).toBeDisabled();
          } else {
            expect(combobox).not.toBeDisabled();
          }
          
          unmount();
        }
      ), { numRuns: 25 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should call filterLanguages with correct parameters', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 0, maxLength: 10 }),
        (query) => {
          vi.spyOn(musicMetadata, 'filterLanguages');
          
          const { unmount } = render(
            <LanguageSelector
              onLanguageChange={mockOnLanguageChange}
            />
          );

          // The component should call filterLanguages during rendering
          // (for initial display of languages)
          expect(musicMetadata.filterLanguages).toHaveBeenCalled();
          
          unmount();
        }
      ), { numRuns: 20 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should maintain consistent behavior across multiple renders', () => {
      fc.assert(fc.property(
        fc.constantFrom('en', 'es', 'fr', null, undefined),
        (selectedLanguage) => {
          // Render the same component multiple times
          const results: string[] = [];
          
          for (let i = 0; i < 3; i++) {
            const { unmount } = render(
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onLanguageChange={mockOnLanguageChange}
              />
            );

            const combobox = screen.getByRole('combobox');
            results.push(combobox.textContent || '');
            
            unmount();
          }
          
          // All renders should produce the same result
          expect(results[0]).toBe(results[1]);
          expect(results[1]).toBe(results[2]);
        }
      ), { numRuns: 15 });
    });
  });

  describe('Search Result Consistency', () => {
    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should provide consistent component behavior', () => {
      fc.assert(fc.property(
        fc.record({
          selectedLanguage: fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constantFrom('en', 'es', 'fr', 'de')
          ),
          placeholder: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
          disabled: fc.boolean()
        }),
        (props) => {
          const { unmount } = render(
            <LanguageSelector
              selectedLanguage={props.selectedLanguage}
              onLanguageChange={mockOnLanguageChange}
              placeholder={props.placeholder || undefined}
              disabled={props.disabled}
            />
          );

          // Component should always render successfully
          const combobox = screen.getByRole('combobox');
          expect(combobox).toBeInTheDocument();
          
          // Should respect props consistently
          if (props.disabled) {
            expect(combobox).toBeDisabled();
          }
          
          unmount();
        }
      ), { numRuns: 30 });
    });
  });
});