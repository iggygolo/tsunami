import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Full-width Header */}
      <Navigation />
      
      {/* Main Content Area - Always uses standardized container */}
      <main className="flex-1">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}