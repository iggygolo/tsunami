import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Headphones, Menu, Settings, Music, ListMusic, Zap, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { getMainNavItems, getSecondaryNavItems, getArtistNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const mainNavItems = getMainNavItems();
  const secondaryNavItems = getSecondaryNavItems();
  
  // Check if we're in studio mode
  const isStudioMode = location.pathname.startsWith('/studio');
  
  // Studio navigation items
  const studioNavItems = [
    { path: '/studio/tracks', label: 'Tracks', icon: Music },
    { path: '/studio/playlists', label: 'Playlists', icon: ListMusic },
    { path: '/studio/settings', label: 'Artist', icon: Settings },
    { path: '/studio/analytics', label: 'Analytics', icon: Zap },
  ];

  return (
    <header className={cn(
      "w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm sticky top-0 z-50",
      className
    )}>
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Hamburger Menu (mobile/tablet) + Logo + Main Navigation */}
          <div className="flex items-center space-x-6">
            {/* Hamburger Menu Button - Only on mobile/tablet */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="focus-ring lg:hidden">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  {/* Logo in Menu with Studio Badge */}
                  <div className="p-6 border-b border-border">
                    <Link 
                      to="/" 
                      className="flex items-center hover:opacity-80 transition-opacity"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <Waves className="w-6 h-6 text-primary" />
                        <h1 className="text-xl font-bold gradient-text truncate">Tsunami</h1>
                        {isStudioMode && (
                          <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 transition-colors">
                            Studio
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {/* Studio Navigation (if in studio mode) */}
                    {isStudioMode && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground px-3">Studio</h3>
                        {studioNavItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);

                          return (
                            <Button
                              key={item.path}
                              variant="ghost"
                              size="sm"
                              asChild
                              className={cn(
                                "w-full justify-start h-auto py-3 px-3 focus-ring transition-all duration-200 hover:bg-transparent hover:translate-x-1 hover:text-primary",
                                active && "bg-primary/10 border border-primary/20 text-primary shadow-sm hover:translate-x-0"
                              )}
                            >
                              <Link to={item.path} className="flex items-start space-x-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0 transition-colors", active && "text-primary")} />
                                <div className="text-left min-w-0">
                                  <div className="font-medium">{item.label}</div>
                                </div>
                              </Link>
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    {/* Main Navigation */}
                    <div className="space-y-2">
                      {/* Home item - only in mobile menu */}
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className={cn(
                          "w-full justify-start h-auto py-3 px-3 focus-ring transition-all duration-200 hover:bg-transparent hover:translate-x-1 hover:text-cyan-400",
                          isActive('/') && "bg-cyan-500/5 border border-cyan-500/20 text-foreground shadow-sm hover:translate-x-0"
                        )}
                      >
                        <Link to="/" className="flex items-start space-x-3" onClick={() => setIsMobileMenuOpen(false)}>
                          <Headphones className={cn("w-5 h-5 mt-0.5 flex-shrink-0 transition-colors", isActive('/') && "text-cyan-400")} />
                          <div className="text-left min-w-0">
                            <div className="font-medium">Home</div>
                            <div className={cn("text-xs truncate", isActive('/') ? "text-foreground/60" : "text-muted-foreground")}>Latest releases & highlights</div>
                          </div>
                        </Link>
                      </Button>
                      
                      {/* Show main nav items */}
                      {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = !item.external && isActive(item.path);

                        return (
                          <Button
                            key={item.path}
                            variant="ghost"
                            size="sm"
                            asChild
                            className={cn(
                              "w-full justify-start h-auto py-3 px-3 focus-ring transition-all duration-200 hover:bg-transparent hover:translate-x-1 hover:text-cyan-400",
                              active && "bg-cyan-500/5 border border-cyan-500/20 text-foreground shadow-sm hover:translate-x-0"
                            )}
                          >
                            {'external' in item && item.external ? (
                              <a
                                href={item.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start space-x-3"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0 transition-colors", active && "text-cyan-400")} />
                                <div className="text-left min-w-0">
                                  <div className="font-medium">{item.label}</div>
                                  <div className={cn("text-xs truncate", active ? "text-foreground/60" : "text-muted-foreground")}>{item.description}</div>
                                </div>
                              </a>
                            ) : (
                              <Link to={item.path} className="flex items-start space-x-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0 transition-colors", active && "text-cyan-400")} />
                                <div className="text-left min-w-0">
                                  <div className="font-medium">{item.label}</div>
                                  <div className={cn("text-xs truncate", active ? "text-foreground/60" : "text-muted-foreground")}>{item.description}</div>
                                </div>
                              </Link>
                            )}
                          </Button>
                        );
                      })}
                      
                    </div>
                  </nav>

                  {/* Login Area at bottom */}
                  <div className="p-4 border-t bg-muted/30">
                    <div className="flex flex-col space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">Account</h3>
                      <LoginArea className="w-full" />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo with Studio Badge */}
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity px-3 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Waves className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold gradient-text">Tsunami</h1>
                {isStudioMode && (
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 transition-colors">
                    Studio
                  </Badge>
                )}
              </div>
            </Link>

            {/* Main Navigation (desktop only) - Now positioned next to logo */}
            <nav className="hidden lg:flex items-center space-x-1">
              {isStudioMode ? (
                // Studio Navigation
                <>
                  {studioNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        asChild
                        className={cn(
                          "relative focus-ring transition-all duration-200 hover:bg-primary/10",
                          active && "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                        )}
                      >
                        <Link to={item.path} className="flex items-center space-x-2">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </>
              ) : (
                // Regular Navigation
                <>
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        asChild
                        className={cn(
                          "relative focus-ring transition-all duration-200 hover:bg-cyan-500/10",
                          active && "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-500/30 text-cyan-100 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                        )}
                      >
                        <Link to={item.path} className="flex items-center space-x-2">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          {/* Right: Secondary Nav + Artist Studio + Login */}
          <div className="flex items-center space-x-2">
            {/* Secondary nav items (desktop only) - Hide in studio mode */}
            {!isStudioMode && (
              <div className="hidden lg:flex items-center space-x-1">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = !item.external && isActive(item.path);
                  const isRSS = item.path === '/rss.xml';

                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      size="sm"
                      asChild
                      className={cn(
                        "focus-ring transition-all duration-200 hover:bg-cyan-500/10",
                        active && "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-500/30 text-cyan-100 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40",
                        isRSS && "text-orange-400 hover:text-orange-300"
                      )}
                    >
                      {item.external ? (
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2"
                        >
                          <Icon className={cn("w-4 h-4", isRSS && "drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]")} />
                          <span className="hidden xl:inline">{item.label}</span>
                        </a>
                      ) : (
                        <Link to={item.path} className="flex items-center space-x-2">
                          <Icon className={cn("w-4 h-4", isRSS && "drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]")} />
                          <span className="hidden xl:inline">{item.label}</span>
                        </Link>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Login area */}
            <LoginArea className="max-w-60" />
          </div>
        </div>
      </div>
    </header>
  );
}