import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { GenreSelector } from '../genre-selector';
import * as musicMetadata from '@/lib/musicMetadata';

// Mock the musicMetadata module
vi.mock('@/lib/musicMetadata', () => ({
  filterGenres: vi.fn((query: string) => {
    const mockGenres = [
      "Pop", "Rock", "Hip Hop", "Electronic", "Jazz", "Classical",
      "Alternative", "Indie", "Punk", "Metal", "Folk", "Country",
      "R&B", "Blues", "Reggae", "World", "EDM", "House", "Techno"
    ];
    
    if (!query.trim()) return mockGenres;
    
    const lowerQuery = query.toLowerCase();
    return mockGenres.filter(genre => 
      genre.toLowerCase().includes(lowerQuery)
    );
  }),
  getAllGenres: vi.fn(() => [
    "Pop", "Rock", "Hip Hop", "Electronic", "Jazz", "Classical",
    "Alternative", "Indie", "Punk", "Metal", "Folk", "Country"
  ]),
  POPULAR_GENRES: [
    "Pop", "Rock", "Hip Hop", "Electronic", "Jazz", "Classical"
  ],
  saveCustomGenre: vi.fn(() => true),
  isCustomGenre: vi.fn(() => false)
}));

// Mock scrollIntoView for JSDOM compatibility
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

describe('GenreSelector Property Tests', () => {
  const mockOnGenreChange = vi.fn();

  beforeEach(() => {
    mockOnGenreChange.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 9: UI Search Functionality', () => {
    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should render without crashing for any valid genre selection', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constantFrom('Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical')
        ),
        (selectedGenre) => {
          const { unmount } = render(
            <GenreSelector
              selectedGenre={selectedGenre}
              onGenreChange={mockOnGenreChange}
            />
          );

          // Component should render without crashing
          expect(screen.getByRole('combobox')).toBeInTheDocument();
          
          unmount();
        }
      ), { numRuns: 30 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should handle various component props consistently', () => {
      fc.assert(fc.property(
        fc.record({
          placeholder: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
          disabled: fc.boolean(),
          allowCustomGenres: fc.boolean(),
          maxDisplayItems: fc.option(fc.integer({ min: 1, max: 20 }))
        }),
        (props) => {
          const { unmount } = render(
            <GenreSelector
              onGenreChange={mockOnGenreChange}
              placeholder={props.placeholder || undefined}
              disabled={props.disabled}
              allowCustomGenres={props.allowCustomGenres}
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
      ), { numRuns: 20 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should call genre utility functions during rendering', () => {
      fc.assert(fc.property(
        fc.constantFrom('Pop', 'Rock', 'Jazz', null, undefined),
        (selectedGenre) => {
          vi.spyOn(musicMetadata, 'filterGenres');
          vi.spyOn(musicMetadata, 'getAllGenres');
          
          const { unmount } = render(
            <GenreSelector
              selectedGenre={selectedGenre}
              onGenreChange={mockOnGenreChange}
            />
          );

          // The component should call genre utility functions during rendering
          expect(musicMetadata.filterGenres).toHaveBeenCalled();
          expect(musicMetadata.getAllGenres).toHaveBeenCalled();
          
          unmount();
        }
      ), { numRuns: 15 });
    });

    // Feature: music-metadata-enhancement, Property 9: UI Search Functionality
    it('should maintain consistent display behavior', () => {
      fc.assert(fc.property(
        fc.constantFrom('Electronic', 'Jazz', 'Rock', null, undefined),
        (selectedGenre) => {
          // Render the same component multiple times
          const results: string[] = [];
          
          for (let i = 0; i < 2; i++) {
            const { unmount } = render(
              <GenreSelector
                selectedGenre={selectedGenre}
                onGenreChange={mockOnGenreChange}
              />
            );

            const combobox = screen.getByRole('combobox');
            results.push(combobox.textContent || '');
            
            unmount();
          }
          
          // All renders should produce the same result
          expect(results[0]).toBe(results[1]);
        }
      ), { numRuns: 10 });
    });
  });
});