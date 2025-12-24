import React from 'react';
import { cn } from '@/lib/utils';

interface GlassListProps {
  className?: string;
  children: React.ReactNode;
}

interface GlassListItemProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

interface GlassListEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function GlassList({ className, children }: GlassListProps) {
  return (
    <div className={cn("space-y-2 max-w-2xl", className)}>
      {children}
    </div>
  );
}

export function GlassListItem({ className, children, onClick }: GlassListItemProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg group w-full text-left",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function GlassListEmptyState({ icon, title, description, className }: GlassListEmptyStateProps) {
  return (
    <div className={cn(
      "text-center py-6 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg max-w-2xl",
      className
    )}>
      <div className="w-6 h-6 text-white/60 mx-auto mb-2">
        {icon}
      </div>
      <h3 className="text-sm font-medium mb-1 text-white">{title}</h3>
      <p className="text-white/80 text-xs">{description}</p>
    </div>
  );
}

export function GlassListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 max-w-2xl", className)}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg animate-pulse">
          <div className="w-10 h-10 bg-white/15 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/15 rounded w-1/3"></div>
            <div className="h-2 bg-white/15 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}