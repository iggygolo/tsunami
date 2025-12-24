import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublishReleaseForm } from '../PublishReleaseForm';
import { ReleaseEditDialog } from '../../studio/ReleaseEditDialog';
import type { MusicRelease } from '@/types/music';

// Mock hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { pubkey: 'test-pubkey' }
  })
}));

vi.mock('@/hooks/usePublishRelease', () => ({
  usePublishRelease: () => ({
    mutateAsync: vi.fn().mockResolvedValue('test-release-id'),
    isPending: false
  }),
  useUpdateRelease: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false
  })
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/lib/podcastConfig', () => ({
  isArtist: () => true
}));

vi.mock('@/lib/audioDuration', () => ({
  getAudioDuration: vi.fn().mockResolvedValue(180),
  formatDurationHuman: (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}));

describe('Form Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('PublishReleaseForm', () => {
    it('should render genre selector in release form', () => {
      renderWithQueryClient(<PublishReleaseForm />);
      
      expect(screen.getByText('Genre')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /genre/i })).toBeInTheDocument();
    });

    it('should render language selector in track form', () => {
      renderWithQueryClient(<PublishReleaseForm />);
      
      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
    });

    it('should allow genre selection and form submission', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();
      
      renderWithQueryClient(<PublishReleaseForm onSuccess={mockOnSuccess} />);
      
      // Fill required fields
      await user.type(screen.getByLabelText(/release title/i), 'Test Release');
      await user.type(screen.getByLabelText(/track title 1/i), 'Test Track');
      
      // Find genre selector by looking for the genre label and then the combobox
      expect(screen.getByText('Genre')).toBeInTheDocument();
      const comboboxes = screen.getAllByRole('combobox');
      const genreCombobox = comboboxes[0]; // First combobox should be genre
      
      await user.click(genreCombobox);
      
      // Wait for options to appear and select one
      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Rock'));
      
      // Verify genre is selected
      expect(genreCombobox).toHaveValue('Rock');
    });

    it('should allow language selection for tracks', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(<PublishReleaseForm />);
      
      // Find language selector by looking for the language label and then the combobox
      expect(screen.getByText('Language')).toBeInTheDocument();
      const comboboxes = screen.getAllByRole('combobox');
      const languageCombobox = comboboxes[1]; // Second combobox should be language
      
      await user.click(languageCombobox);
      
      // Wait for options to appear and select one
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
      await user.click(screen.getByText('English'));
      
      // Verify language is selected
      expect(languageCombobox).toHaveValue('English');
    });

    it('should handle instrumental track selection', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(<PublishReleaseForm />);
      
      // Find language selector
      expect(screen.getByText('Language')).toBeInTheDocument();
      const comboboxes = screen.getAllByRole('combobox');
      const languageCombobox = comboboxes[1]; // Second combobox should be language
      
      await user.click(languageCombobox);
      
      // Wait for options to appear and select instrumental
      await waitFor(() => {
        expect(screen.getByText('None (Instrumental)')).toBeInTheDocument();
      });
      await user.click(screen.getByText('None (Instrumental)'));
      
      // Verify instrumental is selected
      expect(languageCombobox).toHaveValue('None (Instrumental)');
    });

    it('should validate form with genre and language fields', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(<PublishReleaseForm />);
      
      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /publish release/i });
      await user.click(submitButton);
      
      // Should show validation errors for required fields
      await waitFor(() => {
        expect(screen.getAllByText(/title is required/i)).toHaveLength(2); // Release title and track title
      });
    });

    it('should persist form state when adding multiple tracks', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(<PublishReleaseForm />);
      
      // Find genre selector
      expect(screen.getByText('Genre')).toBeInTheDocument();
      const comboboxes = screen.getAllByRole('combobox');
      const genreCombobox = comboboxes[0]; // First combobox should be genre
      
      await user.click(genreCombobox);
      await waitFor(() => screen.getByText('Jazz'));
      await user.click(screen.getByText('Jazz'));
      
      // Add another track
      await user.click(screen.getByRole('button', { name: /add track/i }));
      
      // Verify genre is still selected
      expect(genreCombobox).toHaveValue('Jazz');
      
      // Verify we have more comboboxes now (genre + 2 language selectors)
      const updatedComboboxes = screen.getAllByRole('combobox');
      expect(updatedComboboxes.length).toBeGreaterThan(2);
    });
  });

  describe('ReleaseEditDialog', () => {
    const mockRelease: MusicRelease = {
      id: 'test-id',
      title: 'Test Release',
      description: 'Test Description',
      tracks: [{
        title: 'Test Track',
        audioUrl: 'https://example.com/audio.mp3',
        audioType: 'audio/mpeg',
        duration: 180,
        language: 'en'
      }],
      publishDate: new Date('2024-01-01'),
      tags: ['test'],
      eventId: 'event-id',
      artistPubkey: 'pubkey',
      identifier: 'identifier',
      createdAt: new Date('2024-01-01'),
      genre: 'Rock'
    };

    it('should render genre selector with existing value', () => {
      renderWithQueryClient(
        <ReleaseEditDialog
          release={mockRelease}
          open={true}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />
      );
      
      expect(screen.getByText('Genre')).toBeInTheDocument();
      const comboboxes = screen.getAllByRole('combobox');
      const genreCombobox = comboboxes[0]; // First combobox should be genre
      expect(genreCombobox).toHaveValue('Rock');
    });

    it('should render language selector with existing value', () => {
      renderWithQueryClient(
        <ReleaseEditDialog
          release={mockRelease}
          open={true}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />
      );
      
      expect(screen.getByText('Language')).toBeInTheDocument();
      const comboboxes = screen.getAllByRole('combobox');
      const languageCombobox = comboboxes[1]; // Second combobox should be language
      expect(languageCombobox).toHaveValue('English');
    });

    it('should allow updating genre selection', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <ReleaseEditDialog
          release={mockRelease}
          open={true}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />
      );
      
      // Find genre selector
      const comboboxes = screen.getAllByRole('combobox');
      const genreCombobox = comboboxes[0]; // First combobox should be genre
      
      await user.clear(genreCombobox);
      await user.type(genreCombobox, 'Jazz');
      
      // Select from dropdown
      await waitFor(() => screen.getByText('Jazz'));
      await user.click(screen.getByText('Jazz'));
      
      expect(genreCombobox).toHaveValue('Jazz');
    });

    it('should allow updating language selection', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <ReleaseEditDialog
          release={mockRelease}
          open={true}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />
      );
      
      // Find language selector
      const comboboxes = screen.getAllByRole('combobox');
      const languageCombobox = comboboxes[1]; // Second combobox should be language
      
      await user.clear(languageCombobox);
      await user.type(languageCombobox, 'Spanish');
      
      // Select from dropdown
      await waitFor(() => screen.getByText('Spanish'));
      await user.click(screen.getByText('Spanish'));
      
      expect(languageCombobox).toHaveValue('Spanish');
    });

    it('should handle release without genre or language', () => {
      const releaseWithoutMetadata: MusicRelease = {
        ...mockRelease,
        genre: null,
        tracks: [{
          ...mockRelease.tracks[0],
          language: null
        }]
      };
      
      renderWithQueryClient(
        <ReleaseEditDialog
          release={releaseWithoutMetadata}
          open={true}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />
      );
      
      const comboboxes = screen.getAllByRole('combobox');
      const genreCombobox = comboboxes[0]; // First combobox should be genre
      const languageCombobox = comboboxes[1]; // Second combobox should be language
      
      expect(genreCombobox).toHaveValue('');
      expect(languageCombobox).toHaveValue('None (Instrumental)');
    });

    it('should validate form with updated metadata', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <ReleaseEditDialog
          release={mockRelease}
          open={true}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />
      );
      
      // Clear required title field
      const titleInput = screen.getByLabelText(/release title/i);
      await user.clear(titleInput);
      
      // Try to submit
      const submitButton = screen.getByRole('button', { name: /update release/i });
      await user.click(submitButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });
  });
});