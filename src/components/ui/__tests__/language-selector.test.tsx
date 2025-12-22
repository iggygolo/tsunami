import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      'pt': 'Portuguese'
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
  ]
}));

// Mock scrollIntoView for JSDOM compatibility
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

describe('LanguageSelector', () => {
  const mockOnLanguageChange = vi.fn();

  beforeEach(() => {
    mockOnLanguageChange.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render with placeholder text', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
          placeholder="Select language..."
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select language...')).toBeInTheDocument();
    });

    it('should render with selected language', () => {
      render(
        <LanguageSelector
          selectedLanguage="en"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should render with instrumental option selected', () => {
      render(
        <LanguageSelector
          selectedLanguage={null}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
          disabled={true}
        />
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Props and Configuration', () => {
    it('should apply custom className', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
          className="custom-class"
        />
      );

      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });

    it('should use custom placeholder', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
          placeholder="Choose a language"
        />
      );

      expect(screen.getByText('Choose a language')).toBeInTheDocument();
    });

    it('should handle undefined selectedLanguage', () => {
      render(
        <LanguageSelector
          selectedLanguage={undefined}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have proper role and attributes', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      expect(combobox).toHaveAttribute('role', 'combobox');
    });
  });

  describe('Language Display', () => {
    it('should display correct language name for selected language', () => {
      render(
        <LanguageSelector
          selectedLanguage="es"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(screen.getByText('Spanish')).toBeInTheDocument();
    });

    it('should display instrumental text for null language', () => {
      render(
        <LanguageSelector
          selectedLanguage={null}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      // When null is selected, it should show the instrumental name
      expect(screen.getByText('None (Instrumental)')).toBeInTheDocument();
    });

    it('should show placeholder when no language selected', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
          placeholder="Pick a language"
        />
      );

      expect(screen.getByText('Pick a language')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render with Languages icon', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
        />
      );

      // The Languages icon should be present
      const button = screen.getByRole('combobox');
      expect(button).toBeInTheDocument();
      
      // Check for the presence of the icon (it's rendered as an SVG)
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with chevron down icon', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
        />
      );

      const button = screen.getByRole('combobox');
      const svgs = button.querySelectorAll('svg');
      
      // Should have at least 2 SVGs (Languages icon + ChevronDown)
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Disabled State', () => {
    it('should not be clickable when disabled', () => {
      render(
        <LanguageSelector
          onLanguageChange={mockOnLanguageChange}
          disabled={true}
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveAttribute('disabled');
    });
  });

  describe('Mocked Functions', () => {
    it('should call mocked getLanguageName function', () => {
      render(
        <LanguageSelector
          selectedLanguage="en"
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(musicMetadata.getLanguageName).toHaveBeenCalledWith('en');
    });

    it('should handle null language with mocked function', () => {
      render(
        <LanguageSelector
          selectedLanguage={null}
          onLanguageChange={mockOnLanguageChange}
        />
      );

      expect(musicMetadata.getLanguageName).toHaveBeenCalledWith(null);
    });
  });
});