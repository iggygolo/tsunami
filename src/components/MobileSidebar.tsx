import { Link, useLocation } from 'react-router-dom';
import { Headphones, List, Users, MessageSquare, User, Rss, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { isArtist } from '@/lib/musicConfig';
import { LoginArea } from '@/components/auth/LoginArea';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface MobileSidebarProps {
  onNavigate?: () => void;
}

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  const location = useLocation();
  const { user } = useCurrentUser();
  const podcastConfig = usePodcastConfig();
  const isArtist_user = user && isArtist(user.pubkey);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      path: '/',
      icon: Headphones,
      label: 'Home',
      description: 'Overview & latest releases'
    },
    {
      path: '/releases',
      icon: List,
      label: 'Releases',
      description: 'Browse all releases'
    },
    {
      path: '/social',
      icon: MessageSquare,
      label: 'Social',
      description: 'Artist updates'
    },
    {
      path: '/community',
      icon: Users,
      label: 'Community',
      description: 'Engage with listeners'
    }
  ];

  const secondaryItems = [
    {
      path: '/about',
      icon: User,
      label: 'About',
      description: 'Podcast info'
    },
    {
      path: '/rss.xml',
      icon: Rss,
      label: 'RSS Feed',
      description: 'Subscribe',
      external: true
    }
  ];

  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link 
          to="/" 
          className="flex items-center space-x-3 hover:opacity-80 transition-opacity group"
          onClick={onNavigate}
        >
          <div className="relative">
            <Headphones className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-200" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse-slow"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text truncate">{podcastConfig.music.artistName}</h1>
            <p className="text-xs text-muted-foreground">
              Powered by Nostr
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-3 mb-3">Navigation</h3>
          {(isMobile ? [...navItems, ...secondaryItems] : navItems).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "w-full justify-start h-auto py-3 px-3 focus-ring transition-all duration-200 hover:bg-transparent hover:translate-x-1 hover:text-cyan-600 dark:hover:text-cyan-400",
                  active && "bg-cyan-500/5 border border-cyan-500/20 text-foreground shadow-sm hover:translate-x-0"
                )}
              >
                {'external' in item && item.external ? (
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start space-x-3"
                    onClick={onNavigate}
                  >
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0 transition-colors", active && "text-cyan-600 dark:text-cyan-400")} />
                    <div className="text-left min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className={cn("text-xs truncate", active ? "text-foreground/60" : "text-muted-foreground")}>{item.description}</div>
                    </div>
                  </a>
                ) : (
                  <Link to={item.path} className="flex items-start space-x-3" onClick={onNavigate}>
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0 transition-colors", active && "text-cyan-600 dark:text-cyan-400")} />
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
        {/* Secondary Navigation is inlined on mobile to ensure visibility */}

        {/* Artist Studio */}
        {isArtist_user && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-3 mb-3">Artist</h3>
            <Button
              size="sm"
              asChild
              className="w-full justify-start h-auto py-3 px-3 btn-studio focus-ring"
            >
              <Link to="/studio" className="flex items-start space-x-3" onClick={onNavigate}>
                <Settings className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-left min-w-0">
                  <div className="font-medium">Studio</div>
                  <div className="text-xs text-white/70 truncate">Artist tools</div>
                </div>
              </Link>
            </Button>
          </div>
        )}
      </nav>

      {/* Login Area at bottom */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex flex-col space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Account</h3>
          <LoginArea className="w-full" />
        </div>
      </div>
    </div>
  );
}