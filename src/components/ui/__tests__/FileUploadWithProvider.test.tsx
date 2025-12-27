import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadWithProvider } from '../FileUploadWithProvider';

// Mock dependencies
vi.mock('@/hooks/useUploadConfig', () => ({
  useUploadConfig: () => ({
    config: {
      defaultProvider: 'blossom',
      blossomEnabled: true,
      blossomServers: ['https://blossom.primal.net'],
      maxFileSize: 500 * 1024 * 1024
    }
  })
}));

describe('FileUploadWithProvider', () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload area', () => {
    render(
      <FileUploadWithProvider
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.getByText('Click to select a file')).toBeInTheDocument();
  });

  it('should show blossom server info', () => {
    render(
      <FileUploadWithProvider
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('via Blossom Servers')).toBeInTheDocument();
  });

  it('should handle file selection', () => {
    render(
      <FileUploadWithProvider
        onFileSelect={mockOnFileSelect}
      />
    );

    const fileInput = screen.getByRole('button').closest('div')?.querySelector('input[type="file"]');
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    }
  });

  it('should show selected file name', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    render(
      <FileUploadWithProvider
        file={file}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('✓ test.jpg')).toBeInTheDocument();
  });
});