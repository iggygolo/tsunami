import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useUploadConfig } from '@/hooks/useUploadConfig';

interface FileUploadWithProviderProps {
  /** File input accept attribute (e.g., "image/*", "audio/*") */
  accept?: string;
  /** Label for the upload area */
  label?: string;
  /** Placeholder text when no file is selected */
  placeholder?: string;
  /** Currently selected file */
  file?: File | null;
  /** Callback when file is selected */
  onFileSelect: (file: File | null) => void;
  /** Callback when provider is changed */
  onProviderChange?: (provider: 'blossom' | 'vercel') => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function FileUploadWithProvider({
  accept = "*/*",
  label = "Upload File",
  placeholder = "Click to select a file",
  file,
  onFileSelect,
  disabled = false,
  className = ""
}: FileUploadWithProviderProps) {
  const { config } = useUploadConfig();
  const [selectedProvider] = useState<'blossom' | 'vercel'>(config.defaultProvider);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    // Basic file validation
    if (selectedFile) {
      // Check file size (100MB limit)
      if (selectedFile.size > 100 * 1024 * 1024) {
        console.error('File too large:', selectedFile.size);
        return;
      }
      
      // Check if provider is enabled
      if (!isProviderEnabled(selectedProvider)) {
        console.error('Selected provider is disabled:', selectedProvider);
        return;
      }
    }
    
    onFileSelect(selectedFile);
  };

  const handleUploadClick = () => {
    if (disabled) return;
    
    // Check if any provider is enabled
    if (!config.vercelEnabled && !config.blossomEnabled) {
      console.error('No upload providers are enabled');
      return;
    }
    
    fileInputRef.current?.click();
  };

  const getProviderName = (provider: 'blossom' | 'vercel') => {
    return provider === 'vercel' ? 'Vercel Blob' : 'Blossom Servers';
  };

  const isProviderEnabled = (provider: 'blossom' | 'vercel') => {
    return provider === 'vercel' ? config.vercelEnabled : config.blossomEnabled;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label with Provider Reference */}
      <div className="flex items-center space-x-2">
        <Label className="text-sm text-white">{label}</Label>
        <span className="text-xs text-muted-foreground/70">
          via {getProviderName(selectedProvider)}
        </span>
      </div>

      {/* File Upload Area */}
      <div className="mt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <div
          onClick={handleUploadClick}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${disabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${file ? 'border-green-300 bg-green-50' : ''}
          `}
        >
          <Upload className={`w-6 h-6 mx-auto mb-2 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-500">
            {file ? (
              <span className="text-green-600 font-medium">
                ✓ {file.name}
              </span>
            ) : (
              placeholder
            )}
          </p>
          {file && (
            <p className="text-xs text-gray-400 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
      </div>
    </div>
  );
}