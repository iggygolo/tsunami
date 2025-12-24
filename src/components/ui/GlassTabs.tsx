import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface GlassTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface GlassTabsListProps {
  className?: string;
  children: React.ReactNode;
}

interface GlassTabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

interface GlassTabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function GlassTabs({ defaultValue, value, onValueChange, className, children }: GlassTabsProps) {
  return (
    <Tabs 
      defaultValue={defaultValue} 
      value={value} 
      onValueChange={onValueChange} 
      className={cn("w-full max-w-full overflow-hidden", className)}
    >
      {children}
    </Tabs>
  );
}

export function GlassTabsList({ className, children }: GlassTabsListProps) {
  return (
    <TabsList className={cn("bg-transparent p-0 h-auto gap-2 flex-wrap", className)}>
      {children}
    </TabsList>
  );
}

export function GlassTabsTrigger({ value, className, children, icon, count }: GlassTabsTriggerProps) {
  return (
    <TabsTrigger 
      value={value}
      className={cn(
        "bg-black/30 border border-white/20 text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/15 hover:text-white transition-all duration-200 rounded-full px-4 py-1.5 backdrop-blur-xl shadow-lg text-sm",
        className
      )}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
      {count !== undefined && (
        <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

export function GlassTabsContent({ value, className, children }: GlassTabsContentProps) {
  return (
    <TabsContent value={value} className={cn("mt-4 w-full max-w-full overflow-hidden", className)}>
      {children}
    </TabsContent>
  );
}