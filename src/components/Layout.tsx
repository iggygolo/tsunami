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
      
      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}