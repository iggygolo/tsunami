import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Headphones, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { isArtist } from '@/lib/musicConfig';
import { getMainNavItems, getSecondaryNavItems, getArtistNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const location = useLocation();
  const { user } = useCurrentUser();
  const podcastConfig = useMusicConfig();
  const isArtist_user = user && isArtist(user.pubkey);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const mainNavItems = getMainNavItems();
  const secondaryNavItems = getSecondaryNavItems();
  const artistItems = getArtistNavItems();

  return (
    <header className={cn(
      "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm",
      className
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity group">
            <div className="relative">
              <Headphones className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-200" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse-slow"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">{podcastConfig.music.artistName}</h1>
              <p className="text-xs text-muted-foreground">
                Powered by Nostr
              </p>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Button
                  key={item.path}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "relative focus-ring transition-all duration-200",
                    active && "bg-secondary text-secondary-foreground shadow-sm"
                  )}
                >
                  <Link to={item.path} className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* Secondary nav items */}
            <div className="hidden sm:flex items-center space-x-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const active = !item.external && isActive(item.path);

                return (
                  <Button
                    key={item.path}
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    asChild
                    className="focus-ring"
                  >
                    {item.external ? (
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </a>
                    ) : (
                      <Link to={item.path} className="flex items-center space-x-2">
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </Link>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Artist studio button */}
            {isArtist_user && artistItems.length > 0 && (
              <Button size="sm" asChild className="btn-studio focus-ring hidden sm:flex">
                <Link to={artistItems[0].path}>
                  {(() => {
                    const Icon = artistItems[0].icon;
                    return <Icon className="w-4 h-4 mr-2" />;
                  })()}
                  <span className="hidden sm:inline">{artistItems[0].label}</span>
                </Link>
              </Button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="focus-ring">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>

            {/* Login area */}
            <LoginArea className="max-w-60" />
          </div>
        </div>

        {/* Mobile Menu Sheet */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5" />
                {podcastConfig.music.artistName}
              </SheetTitle>
              <SheetDescription>
                Navigate through the podcast
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Main Navigation Items */}
              <div className="space-y-2">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Button
                      key={item.path}
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      asChild
                      className={cn(
                        "w-full justify-start focus-ring transition-all duration-200",
                        active && "bg-secondary text-secondary-foreground shadow-sm"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link to={item.path} className="flex items-center space-x-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>

              {/* Secondary Navigation Items */}
              <div className="space-y-2">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = !item.external && isActive(item.path);

                  return (
                    <Button
                      key={item.path}
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      asChild
                      className={cn(
                        "w-full justify-start focus-ring",
                        active && "bg-secondary text-secondary-foreground shadow-sm"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.external ? (
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </a>
                      ) : (
                        <Link to={item.path} className="flex items-center space-x-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Artist Studio Button */}
              {isArtist_user && artistItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-3">Artist</h3>
                  {artistItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <Button
                        key={item.path}
                        size="sm"
                        asChild
                        className="w-full justify-start btn-studio focus-ring"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link to={item.path} className="flex items-center space-x-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}