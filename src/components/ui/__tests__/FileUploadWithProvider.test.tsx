import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadWithProvider } from '../FileUploadWithProvider';

// Mock dependencies
vi.mock('@/hooks/useUploadConfig', () => ({
  useUploadConfig: () => ({
    config: {
      defaultProvider: 'blossom',
      vercelEnabled: true,
      blossomEnabled: true
    }
  })
}));

describe('FileUploadWithProvider', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnProviderChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload area', () => {
    render(
      <FileUploadWithProvider
        onFileSelect={mockOnFileSelect}
        onProviderChange={mockOnProviderChange}
      />
    );

    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.getByText('Click to select a file')).toBeInTheDocument();
  });

  it('should show provider selection dropdown', () => {
    render(
      <FileUploadWithProvider
        onFileSelect={mockOnFileSelect}
        onProviderChange={mockOnProviderChange}
        showProviderSelection={true}
      />
    );

    expect(screen.getByText('Blossom Servers')).toBeInTheDocument();
  });

  it('should handle file selection', () => {
    render(
      <FileUploadWithProvider
        onFileSelect={mockOnFileSelect}
        onProviderChange={mockOnProviderChange}
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
        onProviderChange={mockOnProviderChange}
      />
    );

    expect(screen.getByText('✓ test.jpg')).toBeInTheDocument();
  });
});