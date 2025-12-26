import { useRef } from 'react';
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
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Image URL for preview (when file is uploaded) */
  imageUrl?: string;
}

export function FileUploadWithProvider({
  accept = "*/*",
  label = "Upload File",
  placeholder = "Click to select a file",
  file,
  onFileSelect,
  disabled = false,
  className = "",
  imageUrl
}: FileUploadWithProviderProps) {
  const { config } = useUploadConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    
    // Basic file validation
    if (selectedFile) {
      // Check file size
      if (selectedFile.size > config.maxFileSize) {
        console.error('File too large:', selectedFile.size);
        return;
      }
    }
    
    onFileSelect(selectedFile);
  };

  const handleUploadClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label with Provider Reference */}
      <div className="flex items-center space-x-2">
        <Label className="text-sm text-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground">
          via Blossom Servers
        </span>
      </div>

      {/* File Upload Area with Inline Preview */}
      <div className="flex gap-3">
        <div className="flex-1">
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
                ? 'border-border bg-muted/30 cursor-not-allowed' 
                : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30'
              }
              ${file || imageUrl ? 'border-green-300 bg-green-50/10' : ''}
            `}
          >
            <Upload className={`w-6 h-6 mx-auto mb-2 ${disabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
            <p className="text-sm text-muted-foreground">
              {file ? (
                <span className="text-green-400 font-medium">
                  ✓ {file.name}
                </span>
              ) : imageUrl ? (
                <span className="text-green-400 font-medium">
                  ✓ File uploaded
                </span>
              ) : (
                placeholder
              )}
            </p>
            {file && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>
        
        {/* File Preview */}
        {(imageUrl || file) && (
          <div className="w-20 h-20 flex-shrink-0">
            {accept?.includes('image') ? (
              <img 
                src={imageUrl || (file ? URL.createObjectURL(file) : '')} 
                alt="Preview" 
                className="w-full h-full rounded object-cover border border-border"
              />
            ) : (
              <div className="w-full h-full rounded border border-border bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Server Info */}
      <div className="text-xs text-muted-foreground">
        Using servers: {config.blossomServers.join(', ')}
      </div>
    </div>
  );
}