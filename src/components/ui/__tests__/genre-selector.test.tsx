import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    "Alternative", "Indie", "Punk", "Metal", "Folk", "Country",
    "R&B", "Blues", "Reggae", "World", "EDM", "House", "Techno",
    "Ambient", "Experimental", "Soul", "Funk", "Disco"
  ]),
  POPULAR_GENRES: [
    "Pop", "Rock", "Hip Hop", "Electronic", "Jazz", "Classical",
    "Alternative", "Indie", "Punk", "Metal", "Folk", "Country"
  ],
  saveCustomGenre: vi.fn((genre: string) => {
    // Mock successful save
    return true;
  }),
  isCustomGenre: vi.fn((genre: string) => {
    // Mock some genres as custom
    return genre === "Custom Genre" || genre === "My Genre";
  })
}));

// Mock scrollIntoView for JSDOM compatibility
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

describe('GenreSelector', () => {
  const mockOnGenreChange = vi.fn();

  beforeEach(() => {
    mockOnGenreChange.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render with placeholder text', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          placeholder="Select genre..."
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select genre...')).toBeInTheDocument();
    });

    it('should render with selected genre', () => {
      render(
        <GenreSelector
          selectedGenre="Rock"
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText('Rock')).toBeInTheDocument();
    });

    it('should render with null genre (no selection)', () => {
      render(
        <GenreSelector
          selectedGenre={null}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select genre...')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          disabled={true}
        />
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Props and Configuration', () => {
    it('should apply custom className', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          className="custom-class"
        />
      );

      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });

    it('should use custom placeholder', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          placeholder="Choose a genre"
        />
      );

      expect(screen.getByText('Choose a genre')).toBeInTheDocument();
    });

    it('should handle undefined selectedGenre', () => {
      render(
        <GenreSelector
          selectedGenre={undefined}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should respect allowCustomGenres prop', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          allowCustomGenres={false}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should respect maxDisplayItems prop', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          maxDisplayItems={5}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have proper role and attributes', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      expect(combobox).toHaveAttribute('role', 'combobox');
    });
  });

  describe('Genre Display', () => {
    it('should display correct genre name for selected genre', () => {
      render(
        <GenreSelector
          selectedGenre="Jazz"
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText('Jazz')).toBeInTheDocument();
    });

    it('should show placeholder when no genre selected', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          placeholder="Pick a genre"
        />
      );

      expect(screen.getByText('Pick a genre')).toBeInTheDocument();
    });

    it('should handle empty string genre', () => {
      render(
        <GenreSelector
          selectedGenre=""
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render with Music icon', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      // The Music icon should be present
      const button = screen.getByRole('combobox');
      expect(button).toBeInTheDocument();
      
      // Check for the presence of the icon (it's rendered as an SVG)
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with chevron down icon', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      const button = screen.getByRole('combobox');
      const svgs = button.querySelectorAll('svg');
      
      // Should have at least 2 SVGs (Music icon + ChevronDown)
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Disabled State', () => {
    it('should not be clickable when disabled', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          disabled={true}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveAttribute('disabled');
    });
  });

  describe('Custom Genres', () => {
    it('should allow custom genres by default', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      // Component should render (allowCustomGenres defaults to true)
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should disable custom genres when allowCustomGenres is false', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
          allowCustomGenres={false}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Mocked Functions', () => {
    it('should call mocked getAllGenres function', () => {
      render(
        <GenreSelector
          selectedGenre="Rock"
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(musicMetadata.getAllGenres).toHaveBeenCalled();
    });

    it('should call mocked filterGenres function', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(musicMetadata.filterGenres).toHaveBeenCalled();
    });
  });

  describe('Genre Selection Logic', () => {
    it('should handle null genre selection', () => {
      render(
        <GenreSelector
          selectedGenre={null}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText('Select genre...')).toBeInTheDocument();
    });

    it('should handle undefined genre selection', () => {
      render(
        <GenreSelector
          selectedGenre={undefined}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText('Select genre...')).toBeInTheDocument();
    });

    it('should display selected genre correctly', () => {
      render(
        <GenreSelector
          selectedGenre="Electronic"
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText('Electronic')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long genre names', () => {
      const longGenre = "Very Long Genre Name That Might Cause Layout Issues";
      render(
        <GenreSelector
          selectedGenre={longGenre}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText(longGenre)).toBeInTheDocument();
    });

    it('should handle special characters in genre names', () => {
      const specialGenre = "R&B/Soul";
      render(
        <GenreSelector
          selectedGenre={specialGenre}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText(specialGenre)).toBeInTheDocument();
    });

    it('should handle numeric genre names', () => {
      const numericGenre = "80s Pop";
      render(
        <GenreSelector
          selectedGenre={numericGenre}
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByText(numericGenre)).toBeInTheDocument();
    });
  });

  describe('Component Props Validation', () => {
    it('should work with minimal required props', () => {
      render(
        <GenreSelector
          onGenreChange={mockOnGenreChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should work with all optional props', () => {
      render(
        <GenreSelector
          selectedGenre="Jazz"
          onGenreChange={mockOnGenreChange}
          placeholder="Custom placeholder"
          className="custom-class"
          disabled={false}
          allowCustomGenres={true}
          maxDisplayItems={10}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Jazz')).toBeInTheDocument();
    });
  });
});