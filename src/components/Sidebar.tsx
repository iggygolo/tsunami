import { Link, useLocation } from 'react-router-dom';
import { Headphones, List, Users, MessageSquare, User, Rss, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { isArtist } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { user } = useCurrentUser();
  const podcastConfig = useMusicConfig();
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
      description: 'Latest drops & highlights'
    },
    {
      path: '/releases',
      icon: List,
      label: 'Releases',
      description: 'All tracks & albums'
    },
    {
      path: '/social',
      icon: MessageSquare,
      label: 'Social',
      description: 'Posts & updates'
    },
    {
      path: '/community',
      icon: Users,
      label: 'Community',
      description: 'Fans & supporters'
    },
    {
      path: '/about',
      icon: User,
      label: 'About',
      description: 'Artist bio & info'
    },
    {
      path: '/rss.xml',
      icon: Rss,
      label: 'RSS Feed',
      description: 'Subscribe',
      external: true
    }
  ];

  return (
    <aside className={cn(
      "w-64 h-screen bg-background border-r border-border flex-shrink-0 sticky top-0",
      "hidden lg:flex lg:flex-col",
      className
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity group">
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
      <nav className="flex-1 p-4 space-y-4">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !item.external && isActive(item.path);

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
                {item.external ? (
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start space-x-3"
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                    </div>
                  </a>
                ) : (
                  <Link to={item.path} className="flex items-start space-x-3">
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

        {/* Artist Studio */}
        {isArtist_user && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-3 mb-3">Artist</h3>
            <Button
              size="sm"
              asChild
              className="w-full justify-start h-auto py-3 px-3 btn-studio focus-ring"
            >
              <Link to="/studio" className="flex items-start space-x-3">
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
    </aside>
  );
}