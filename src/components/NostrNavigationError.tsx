import { AlertCircle, Music, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export interface NostrNavigationErrorProps {
  type: 'not_found' | 'network_error' | 'invalid_format' | 'timeout';
  title: string;
  message: string;
  onRetry?: () => void;
  showBackButton?: boolean;
}

export function NostrNavigationError({ 
  type, 
  title, 
  message, 
  onRetry, 
  showBackButton = true 
}: NostrNavigationErrorProps) {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (type) {
      case 'not_found':
        return <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />;
      case 'network_error':
        return <Wifi className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />;
      case 'timeout':
        return <RefreshCw className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />;
      case 'invalid_format':
        return <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />;
      default:
        return <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />;
    }
  };

  const getSuggestions = () => {
    switch (type) {
      case 'not_found':
        return [
          { label: 'Browse All Releases', action: () => navigate('/releases') },
          { label: 'Go to Homepage', action: () => navigate('/') }
        ];
      case 'network_error':
        return [
          { label: 'Try Again', action: onRetry },
          { label: 'Go to Homepage', action: () => navigate('/') }
        ];
      case 'timeout':
        return [
          { label: 'Retry', action: onRetry },
          { label: 'Browse All Releases', action: () => navigate('/releases') }
        ];
      case 'invalid_format':
        return [
          { label: 'Go to Homepage', action: () => navigate('/') },
          { label: 'Browse All Releases', action: () => navigate('/releases') }
        ];
      default:
        return [
          { label: 'Go to Homepage', action: () => navigate('/') }
        ];
    }
  };

  const suggestions = getSuggestions();

  return (
    <div className="text-center py-16">
      {getIcon()}
      <h2 className="text-2xl font-semibold mb-2 text-foreground">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {message}
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {suggestions.map((suggestion, index) => (
          suggestion.action && (
            <Button
              key={index}
              onClick={suggestion.action}
              variant={index === 0 ? 'default' : 'outline'}
              className={index === 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
            >
              {suggestion.label}
            </Button>
          )
        ))}
      </div>

      {/* Back Button */}
      {showBackButton && (
        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Go Back
          </Button>
        </div>
      )}
    </div>
  );
}