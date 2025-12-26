import { useSeoMeta } from "@unhead/react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NostrNavigationError } from "@/components/NostrNavigationError";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useSeoMeta({
    title: "404 - Page Not Found",
    description: "The page you are looking for could not be found. Return to the home page to continue browsing.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Check if this looks like an invalid Nostr navigation URL
  const isNostrUrl = location.pathname.startsWith('/track/') || location.pathname.startsWith('/release/');

  if (isNostrUrl) {
    // This is an invalid Nostr navigation URL
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full px-4">
          <NostrNavigationError
            type="invalid_format"
            title="Invalid URL Format"
            message="The URL format is not valid. Nostr music URLs should follow the pattern /track/{naddr} or /release/{naddr}."
            showBackButton={true}
          />
        </div>
      </div>
    );
  }

  // Standard 404 page
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md w-full px-4">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <p className="text-muted-foreground mb-8">
          The page you are looking for could not be found.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/')} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Return to Home
          </Button>
          <Button onClick={() => navigate('/releases')} variant="outline">
            Browse Releases
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
