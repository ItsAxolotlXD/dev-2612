import React from 'react';
import { HardDrive, Heart, Info, MessageSquare, PanelsTopLeft, Search, Terminal, User } from 'lucide-react';
import {
  FluentCalculatorIcon,
  FluentCameraIcon,
  FluentCraftmineIcon,
  FluentFileExplorerIcon,
  FluentGalleryIcon,
  FluentHomeIcon,
  FluentHtmlWriterIcon,
  FluentInkCanvasIcon,
  FluentLiveTvIcon,
  FluentMediaPlayerIcon,
  FluentNewsIcon,
  FluentNotesIcon,
  FluentPhotopeaIcon,
  FluentScreenbugIcon,
  FluentSettingsIcon,
  FluentUpdatesIcon,
  FluentWatchIcon,
} from '../components/FluentIcons';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppTab {
  id: number;
  route: string;
  routeState?: any;
  isMinimized?: boolean;
  isMaximized?: boolean;
  bounds?: WindowBounds;
  zIndex?: number;
}

const WINUI3_ICON_URL =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/WinUI.svg/120px-WinUI.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20241127184612';

export const getTabTitle = (route: string) => {
  const pathname = route.split(/[?#]/)[0] || '/';
  const knownTitles: Record<string, string> = {
    '/': 'Home',
    '/home': 'Home',
    '/home-preview': 'Home',
    '/live-tv': 'Watch',
    '/watch-preview': 'Watch',
    '/news': 'News',
    '/updates': 'Updates',
    '/channels': 'Channels',
    '/favorites': 'Favorites',
    '/settings': 'Settings',
    '/command-prompt': 'Command Prompt',
    '/gallery': 'Gallery',
    '/explorer': 'File Explorer',
    '/calculator': 'Calculator',
    '/html-writer': 'HTML Writer',
    '/media-player': 'Media Player',
    '/draws': 'Ink Canvas',
    '/notes': 'Notes',
    '/write': 'Notes',
    '/present': 'Presentation',
    '/table': 'Spreadsheet',
    '/photopea': 'Photopea',
    '/craftmine': 'Craftmine',
    '/camera': 'Camera',
    '/screenbox': 'Screenbox',
    '/screenbug': 'Screenbox',
    '/vlc': 'Screenbox',
    '/drivers': 'Manage Drivers',
    '/winui-3': 'WinUI 3',
    '/feedback': 'Feedback',
    '/auth': 'Account',
    '/search': 'Search',
    '/about': 'About',
  };

  if (knownTitles[pathname]) return knownTitles[pathname];
  if (pathname.startsWith('/news/') || pathname.startsWith('/article')) return 'Article';
  if (pathname.startsWith('/notes/')) return 'Notes';
  if (pathname.startsWith('/draws/')) return 'Ink Canvas';

  const segment = pathname.split('/').filter(Boolean).at(-1);
  if (!segment) return 'Home';
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getTabIcon = (route: string, className = 'size-4 shrink-0') => {
  const pathname = route.split(/[?#]/)[0] || '/';

  if (pathname === '/' || pathname.startsWith('/home')) return <FluentHomeIcon className={className} />;
  if (pathname === '/live-tv' || pathname.startsWith('/watch-preview')) return <FluentWatchIcon className={className} />;
  if (pathname === '/news' || pathname.startsWith('/article')) return <FluentNewsIcon className={className} />;
  if (pathname === '/updates') return <FluentUpdatesIcon className={className} />;
  if (pathname === '/channels') return <FluentLiveTvIcon className={className} />;
  if (pathname === '/favorites') return <Heart className={className} />;
  if (pathname === '/settings') return <FluentSettingsIcon className={className} />;
  if (pathname === '/command-prompt') return <Terminal className={className} />;
  if (pathname === '/drivers') return <HardDrive className={className} />;
  if (pathname === '/winui-3') {
    return <img src={WINUI3_ICON_URL} alt="" aria-hidden="true" className={`${className} object-contain winui-sidebar-icon`} />;
  }
  if (pathname === '/feedback') return <MessageSquare className={className} />;
  if (pathname === '/auth') return <User className={className} />;
  if (pathname === '/search') return <Search className={className} />;
  if (pathname === '/gallery') return <FluentGalleryIcon className={className} />;
  if (pathname === '/explorer') return <FluentFileExplorerIcon className={className} />;
  if (pathname === '/calculator') return <FluentCalculatorIcon className={className} />;
  if (pathname === '/html-writer') return <FluentHtmlWriterIcon className={className} />;
  if (pathname === '/media-player') return <FluentMediaPlayerIcon className={className} />;
  if (pathname === '/draws' || pathname.startsWith('/draws/')) return <FluentInkCanvasIcon className={className} />;
  if (pathname.startsWith('/notes') || pathname === '/write' || pathname === '/present' || pathname === '/table') return <FluentNotesIcon className={className} />;
  if (pathname === '/photopea') return <FluentPhotopeaIcon className={className} />;
  if (pathname === '/craftmine') return <FluentCraftmineIcon className={className} />;
  if (pathname === '/camera') return <FluentCameraIcon className={className} />;
  if (pathname === '/screenbox' || pathname === '/screenbug' || pathname === '/vlc') return <FluentScreenbugIcon className={className} />;
  if (pathname === '/about') return <Info className={className} />;
  return <PanelsTopLeft className={className} />;
};

export const getDefaultWindowBounds = (index: number, route?: string): WindowBounds => {
  const pathname = (route || '').split(/[?#]/)[0];
  const isCalculator = pathname === '/calculator';

  if (typeof window === 'undefined') {
    return isCalculator
      ? { x: 80, y: 40, width: 360, height: 560 }
      : { x: 48, y: 36, width: 960, height: 600 };
  }
  const vw = window.innerWidth;
  const vh = Math.max(360, window.innerHeight - 44);
  const isCompact = vw < 720;
  const width = isCalculator
    ? Math.min(vw - 16, Math.max(340, 360))
    : isCompact
      ? Math.max(320, vw - 16)
      : Math.min(1040, Math.max(480, vw - 120));
  const height = isCalculator
    ? Math.min(vh - 16, Math.max(460, 560))
    : isCompact
      ? Math.max(300, vh - 20)
      : Math.min(680, Math.max(360, vh - 84));
  const cascade = (index % 6) * 26;
  const maxX = Math.max(8, vw - width - 8);
  const maxY = Math.max(8, vh - height - 8);
  const x = Math.max(8, Math.min(maxX, Math.round((vw - width) / 2) + cascade - 36));
  const y = Math.max(8, Math.min(maxY, Math.round((vh - height) / 2) + cascade - 28));
  return { x, y, width, height };
};
