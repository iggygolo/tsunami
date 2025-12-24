import { 
  Headphones, 
  List, 
  Users, 
  MessageSquare, 
  User, 
  Rss, 
  Settings 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  path: string;
  icon: LucideIcon;
  label: string;
  description: string;
  external?: boolean;
  group?: 'main' | 'secondary' | 'artist';
}

export const navigationItems: NavigationItem[] = [
  // Main navigation items
  {
    path: '/',
    icon: Headphones,
    label: 'Home',
    description: 'Latest releases & highlights',
    group: 'main'
  },
  {
    path: '/releases',
    icon: List,
    label: 'Releases',
    description: 'Browse all releases',
    group: 'main'
  },
  {
    path: '/social',
    icon: MessageSquare,
    label: 'Social',
    description: 'Artist updates & posts',
    group: 'main'
  },
  {
    path: '/community',
    icon: Users,
    label: 'Community',
    description: 'Engage with listeners',
    group: 'main'
  },
  // Secondary navigation items
  {
    path: '/about',
    icon: User,
    label: 'About',
    description: 'Artist bio & info',
    group: 'secondary'
  },
  {
    path: '/rss.xml',
    icon: Rss,
    label: 'RSS Feed',
    description: 'Subscribe to updates',
    external: true,
    group: 'secondary'
  },
  // Artist-only items
  {
    path: '/studio',
    icon: Settings,
    label: 'Studio',
    description: 'Artist tools & management',
    group: 'artist'
  }
];

// Helper functions to get navigation items by group
export const getMainNavItems = () => navigationItems.filter(item => item.group === 'main');
export const getSecondaryNavItems = () => navigationItems.filter(item => item.group === 'secondary');
export const getArtistNavItems = () => navigationItems.filter(item => item.group === 'artist');
export const getAllNavItems = () => navigationItems.filter(item => item.group !== 'artist');