import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock, CloudSun, Eye, EyeOff, HardDrive, Heart, Info, PanelsTopLeft, PinOff, Plus, RotateCcw, Search, Terminal, X } from 'lucide-react';
import { getAppPortalTarget, toAppPortalCoordinates } from '../utils/appPortal';
import { flyoutPanelClassName, flyoutPanelStyle } from './FlyoutDropdown';
import { TaskbarClockTray, TaskbarWeatherTray } from './TaskbarTrayWidgets';
import { useSettings } from '../hooks/useSettings';
import {
  FluentArticlesIcon,
  FluentCameraIcon,
  FluentCraftmineIcon,
  FluentGalleryIcon,
  FluentHomeIcon,
  FluentInkCanvasIcon,
  FluentLiveTvIcon,
  FluentNewsIcon,
  FluentNotesIcon,
  FluentPersonFeedbackIcon,
  FluentPhotopeaIcon,
  FluentScreenbugIcon,
  FluentSettingsIcon,
  FluentStartIcon,
  FluentUpdatesIcon,
  FluentWatchIcon,
  SEARCH_EXPERIENCE_ICON_URLS,
} from './FluentIcons';
import {
  Fluent3DArticlesIcon,
  Fluent3DCameraIcon,
  Fluent3DCraftmineIcon,
  Fluent3DDiscordIcon,
  Fluent3DGalleryIcon,
  Fluent3DHomeIcon,
  Fluent3DNotesIcon,
  Fluent3DPhotopeaIcon,
  Fluent3DScreenbugIcon,
  Fluent3DSettingsIcon,
  Fluent3DWatchPreviewIcon,
} from './Fluent3DIcons';

export interface AppTab {
  id: number;
  route: string;
}

const WINUI3_ICON_URL =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/WinUI.svg/120px-WinUI.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20241127184612';
const DIRECT_COMMAND_ICON_URL = '/assets/aistudio/direct_command_6240d59d.png';
const TASKBAR_ORDER_KEY = 'sparkle_taskbar_order_v1';
const TASKBAR_HIDDEN_KEY = 'sparkle_taskbar_hidden_v1';
const TASKBAR_UTILITY_ORDER_KEY = 'sparkle_taskbar_utility_order_v1';
const TASKBAR_SHOW_WEATHER_KEY = 'sparkle_taskbar_show_weather_v1';
const TASKBAR_SHOW_CLOCK_KEY = 'sparkle_taskbar_show_clock_v1';

type UtilityItemKey = 'widgets' | 'direct-command';

type TaskbarContextMenuState =
  | { x: number; y: number; scope: 'bar' }
  | { x: number; y: number; scope: 'nav-item'; key: string; label: string; index: number }
  | { x: number; y: number; scope: 'utility'; key: UtilityItemKey | 'start' | 'search'; label: string };

interface AppTabsBarProps {
  tabs: AppTab[];
  activeTabId: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSearch: () => void;
  onOpenAbout: () => void;
  searchColorfulExperiment?: boolean;
  showWidgets?: boolean;
  isWidgetsOpen?: boolean;
  onToggleWidgets?: () => void;
  isDirectCommandOpen?: boolean;
  onToggleDirectCommand?: () => void;
  isStartMenuOpen?: boolean;
  onToggleStartMenu?: () => void;
  theme?: 'dark' | 'light';
  showTabs?: boolean;
  isTopBarBottom?: boolean;
  isSidebarMerged?: boolean;
  currentRoute?: string;
  isDriverManagementPanelOpen?: boolean;
  isCommandPromptOpen?: boolean;
  dynamicSidebarIcons?: boolean;
  fluentIcons?: boolean;
  onNavigate?: (route: string, state?: any) => void;
  onOpenCommandPrompt?: () => void;
  onSelectTab: (tabId: number) => void;
  onCreateTab: () => void;
  onCloseTab: (tabId: number) => void;
}

const getTabTitle = (route: string) => {
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
    '/draws': 'Draws',
    '/notes': 'Notes',
    '/write': 'Notes',
    '/present': 'Presentation',
    '/table': 'Spreadsheet',
    '/photopea': 'Photopea',
    '/craftmine': 'Craftmine',
    '/camera': 'Camera',
    '/about': 'About',
  };

  if (knownTitles[pathname]) return knownTitles[pathname];
  if (pathname.startsWith('/news/') || pathname.startsWith('/article')) return 'Article';
  if (pathname.startsWith('/notes/')) return 'Notes';

  const segment = pathname.split('/').filter(Boolean).at(-1);
  if (!segment) return 'Home';
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getTabIcon = (route: string) => {
  const pathname = route.split(/[?#]/)[0] || '/';
  const className = 'size-4 shrink-0';

  if (pathname === '/' || pathname.startsWith('/home')) return <FluentHomeIcon className={className} />;
  if (pathname === '/live-tv' || pathname.startsWith('/watch-preview')) return <FluentWatchIcon className={className} />;
  if (pathname === '/news' || pathname.startsWith('/article')) return <FluentNewsIcon className={className} />;
  if (pathname === '/updates') return <FluentUpdatesIcon className={className} />;
  if (pathname === '/channels') return <FluentLiveTvIcon className={className} />;
  if (pathname === '/favorites') return <Heart className={className} />;
  if (pathname === '/settings') return <FluentSettingsIcon className={className} />;
  if (pathname === '/command-prompt') return <Terminal className={className} />;
  if (pathname === '/gallery') return <FluentGalleryIcon className={className} />;
  if (pathname === '/draws' || pathname.startsWith('/draws/')) return <FluentInkCanvasIcon className={className} />;
  if (pathname.startsWith('/notes') || pathname === '/write' || pathname === '/present' || pathname === '/table') return <FluentNotesIcon className={className} />;
  if (pathname === '/photopea') return <FluentPhotopeaIcon className={className} />;
  if (pathname === '/craftmine') return <FluentCraftmineIcon className={className} />;
  if (pathname === '/camera') return <FluentCameraIcon className={className} />;
  if (pathname === '/screenbox' || pathname === '/screenbug' || pathname === '/vlc') return <FluentScreenbugIcon className={className} />;
  if (pathname === '/about') return <Info className={className} />;
  return <PanelsTopLeft className={className} />;
};

export const AppTabsBar: React.FC<AppTabsBarProps> = ({
  tabs,
  activeTabId,
  searchQuery,
  onSearchChange,
  onOpenSearch,
  onOpenAbout,
  searchColorfulExperiment = false,
  showWidgets = false,
  isWidgetsOpen = false,
  onToggleWidgets,
  isDirectCommandOpen = false,
  onToggleDirectCommand,
  isStartMenuOpen = false,
  onToggleStartMenu,
  theme = 'dark',
  showTabs = true,
  isTopBarBottom = false,
  isSidebarMerged = false,
  currentRoute = '/',
  isDriverManagementPanelOpen = false,
  isCommandPromptOpen = false,
  dynamicSidebarIcons = true,
  fluentIcons = false,
  onNavigate,
  onOpenCommandPrompt,
  onSelectTab,
  onCreateTab,
  onCloseTab,
}) => {
  const { updateSetting } = useSettings();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [taskbarOrder, setTaskbarOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(TASKBAR_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === 'string');
      }
    } catch {}
    return [];
  });
  const [hiddenTaskbarKeys, setHiddenTaskbarKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(TASKBAR_HIDDEN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === 'string');
      }
    } catch {}
    return [];
  });
  const [utilityOrder, setUtilityOrder] = useState<UtilityItemKey[]>(() => {
    try {
      const saved = localStorage.getItem(TASKBAR_UTILITY_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return parsed as UtilityItemKey[];
        }
      }
    } catch {}
    return ['widgets', 'direct-command'];
  });
  const [draggedNavKey, setDraggedNavKey] = useState<string | null>(null);
  const [navDropTarget, setNavDropTarget] = useState<{ key: string; side: 'left' | 'right' } | null>(null);
  const [draggedUtilityKey, setDraggedUtilityKey] = useState<UtilityItemKey | null>(null);
  const [utilityDropTarget, setUtilityDropTarget] = useState<UtilityItemKey | null>(null);
  const [showTaskbarWeather, setShowTaskbarWeather] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TASKBAR_SHOW_WEATHER_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [showTaskbarClock, setShowTaskbarClock] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TASKBAR_SHOW_CLOCK_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [contextMenu, setContextMenu] = useState<TaskbarContextMenuState | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const isCenteredSearch = searchColorfulExperiment && isSearchExpanded;
  const useFluent3DForContent = dynamicSidebarIcons || fluentIcons;
  const useFluent3DForSystem = !dynamicSidebarIcons && fluentIcons;

  const showItemTooltip = useCallback(
    (label: string, target: HTMLElement) => {
      if (!label || draggedNavKey || draggedUtilityKey || contextMenu) return;
      const rect = target.getBoundingClientRect();
      const clampedX = Math.max(48, Math.min(window.innerWidth - 48, rect.left + rect.width / 2));
      const anchorY = isTopBarBottom ? rect.top - 8 : rect.bottom + 8;
      const point = toAppPortalCoordinates(clampedX, anchorY);
      setHoveredTooltip({ label, top: point.y, left: point.x });
    },
    [isTopBarBottom, draggedNavKey, draggedUtilityKey, contextMenu]
  );

  const hideItemTooltip = useCallback(() => {
    setHoveredTooltip(null);
  }, []);

  useEffect(() => {
    setHoveredTooltip(null);
  }, [currentRoute, isDirectCommandOpen, isWidgetsOpen, isStartMenuOpen, isCenteredSearch]);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const { width, height } = contextMenuRef.current.getBoundingClientRect();
    setContextMenuPos({
      left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - width - 8)),
      top: Math.max(8, contextMenu.y > window.innerHeight - height - 8 ? contextMenu.y - height : contextMenu.y),
    });
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('contextmenu', handleOutside);
    }, 30);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('contextmenu', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || !isSidebarMerged) {
      setScrollState((prev) =>
        prev.hasOverflow || prev.canScrollLeft || prev.canScrollRight
          ? { hasOverflow: false, canScrollLeft: false, canScrollRight: false }
          : prev
      );
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth - clientWidth > 2;
    const canScrollLeft = hasOverflow && scrollLeft > 2;
    const canScrollRight = hasOverflow && scrollLeft + clientWidth < scrollWidth - 2;

    setScrollState((prev) =>
      prev.hasOverflow === hasOverflow &&
      prev.canScrollLeft === canScrollLeft &&
      prev.canScrollRight === canScrollRight
        ? prev
        : { hasOverflow, canScrollLeft, canScrollRight }
    );
  }, [isSidebarMerged]);

  useEffect(() => {
    updateScrollState();
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!container || !isSidebarMerged) return;

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(container);
    if (content) resizeObserver.observe(content);
    window.addEventListener('resize', updateScrollState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, isSidebarMerged, showTabs, showWidgets, isCenteredSearch, tabs.length]);

  const handleScrollBar = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.round(el.clientWidth * 0.55));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const isMergedActive = (key: string) => {
    switch (key) {
      case 'home':
        return !isDriverManagementPanelOpen && (currentRoute === '/' || currentRoute === '/home' || currentRoute === '/home-preview');
      case 'feed':
        return !isDriverManagementPanelOpen && (currentRoute === '/news' || currentRoute.startsWith('/article') || currentRoute.startsWith('/news/') || currentRoute === '/updates' || currentRoute.startsWith('/updates'));
      case 'watch':
        return !isDriverManagementPanelOpen && (currentRoute === '/live-tv' || currentRoute.startsWith('/live-tv') || currentRoute === '/watch-preview');
      case 'gallery':
        return !isDriverManagementPanelOpen && (currentRoute === '/gallery' || currentRoute.startsWith('/gallery'));
      case 'draws':
        return !isDriverManagementPanelOpen && (currentRoute === '/draws' || currentRoute.startsWith('/draws'));
      case 'notes':
        return !isDriverManagementPanelOpen && (currentRoute === '/notes' || currentRoute.startsWith('/notes/') || currentRoute === '/write' || currentRoute === '/present' || currentRoute === '/table');
      case 'screenbox':
        return !isDriverManagementPanelOpen && (currentRoute === '/vlc' || currentRoute.startsWith('/vlc') || currentRoute === '/screenbox' || currentRoute.startsWith('/screenbox') || currentRoute === '/screenbug' || currentRoute.startsWith('/screenbug'));
      case 'camera':
        return !isDriverManagementPanelOpen && (currentRoute === '/camera' || currentRoute.startsWith('/camera'));
      case 'craftmine':
        return !isDriverManagementPanelOpen && currentRoute === '/craftmine';
      case 'photopea':
        return !isDriverManagementPanelOpen && currentRoute === '/photopea';
      case 'winui-3':
        return !isDriverManagementPanelOpen && currentRoute === '/winui-3';
      case 'feedback':
        return !isDriverManagementPanelOpen && (currentRoute === '/feedback' || currentRoute.startsWith('/feedback'));
      case 'drivers':
        return isDriverManagementPanelOpen;
      case 'command-prompt':
        return isCommandPromptOpen || currentRoute === '/command-prompt';
      case 'settings':
        return !isDriverManagementPanelOpen && (currentRoute === '/settings' || currentRoute.startsWith('/settings'));
      default:
        return false;
    }
  };

  const baseMergedSidebarItems = useMemo(
    () =>
      isSidebarMerged
        ? [
            {
              key: 'home',
              label: 'Home',
              onClick: () => onNavigate?.('/'),
              icon: useFluent3DForContent
                ? <Fluent3DHomeIcon className="size-5 shrink-0" />
                : <FluentHomeIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'feed',
              label: 'Feed',
              onClick: () => onNavigate?.('/news'),
              icon: useFluent3DForContent
                ? <Fluent3DArticlesIcon className="size-5 shrink-0" />
                : <FluentArticlesIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'watch',
              label: 'Watch',
              onClick: () => onNavigate?.('/live-tv'),
              icon: useFluent3DForContent
                ? <Fluent3DWatchPreviewIcon className="size-5 shrink-0" />
                : <FluentWatchIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'gallery',
              label: 'Gallery',
              onClick: () => {
                try {
                  sessionStorage.setItem('vplay_gallery_selected_folder', 'null');
                  window.dispatchEvent(new CustomEvent('vplay:gallery:folder_selected', { detail: { folderId: null } }));
                } catch {}
                onNavigate?.('/gallery', { folderId: null });
              },
              icon: useFluent3DForContent
                ? <Fluent3DGalleryIcon className="size-5 shrink-0" />
                : <FluentGalleryIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'draws',
              label: 'Ink Canvas',
              onClick: () => onNavigate?.('/draws'),
              icon: useFluent3DForContent
                ? <FluentInkCanvasIcon className="fluent-3d-icon size-5 shrink-0" />
                : <FluentInkCanvasIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'notes',
              label: 'Notes',
              onClick: () => onNavigate?.('/notes'),
              icon: useFluent3DForContent
                ? <Fluent3DNotesIcon className="size-5 shrink-0" />
                : <FluentNotesIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'screenbox',
              label: 'Screenbox',
              onClick: () => onNavigate?.('/screenbox'),
              icon: useFluent3DForContent
                ? <Fluent3DScreenbugIcon className="size-5 shrink-0" />
                : <FluentScreenbugIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'camera',
              label: 'Camera',
              onClick: () => onNavigate?.('/camera'),
              icon: useFluent3DForContent
                ? <Fluent3DCameraIcon className="size-5 shrink-0" />
                : <FluentCameraIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'craftmine',
              label: 'Craftmine',
              onClick: () => onNavigate?.('/craftmine'),
              icon: useFluent3DForContent
                ? <Fluent3DCraftmineIcon className="size-5 shrink-0" />
                : <FluentCraftmineIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'photopea',
              label: 'Photopea',
              onClick: () => onNavigate?.('/photopea'),
              icon: useFluent3DForContent
                ? <Fluent3DPhotopeaIcon className="size-5 shrink-0" />
                : <FluentPhotopeaIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'discord',
              label: 'Discord',
              onClick: () => window.open('https://discord.gg/wcdjaDDayK', '_blank', 'noopener,noreferrer'),
              icon: useFluent3DForContent
                ? <Fluent3DDiscordIcon className="size-5 shrink-0" />
                : (
                  <svg className="size-5 shrink-0 fill-current text-black dark:text-white" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                ),
            },
            {
              key: 'winui-3',
              label: 'WinUI 3',
              onClick: () => onNavigate?.('/winui-3'),
              icon: <img src={WINUI3_ICON_URL} alt="" aria-hidden="true" className="size-5 shrink-0 object-contain winui-sidebar-icon" />,
            },
            {
              key: 'feedback',
              label: 'Feedback',
              onClick: () => onNavigate?.('/feedback'),
              icon: <FluentPersonFeedbackIcon className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'drivers',
              label: 'Manage Drivers',
              onClick: () => onNavigate?.('/drivers'),
              icon: <HardDrive className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'command-prompt',
              label: 'Command Prompt',
              onClick: () => onOpenCommandPrompt?.(),
              icon: <Terminal className="size-5 shrink-0 text-black dark:text-white" />,
            },
            {
              key: 'settings',
              label: 'Settings',
              onClick: () => onNavigate?.('/settings'),
              icon: useFluent3DForSystem
                ? <Fluent3DSettingsIcon className="size-5 shrink-0 settings-spin-icon" />
                : <FluentSettingsIcon className="size-5 shrink-0 settings-spin-icon text-black dark:text-white" />,
            },
          ]
        : [],
    [isSidebarMerged, onNavigate, onOpenCommandPrompt, useFluent3DForContent, useFluent3DForSystem]
  );

  const mergedSidebarItems = useMemo(() => {
    if (!baseMergedSidebarItems.length) return [];
    const hiddenSet = new Set(hiddenTaskbarKeys);
    const byKey = new Map(baseMergedSidebarItems.map((item) => [item.key, item]));
    const ordered: typeof baseMergedSidebarItems = [];
    const seen = new Set<string>();

    for (const key of taskbarOrder) {
      const item = byKey.get(key);
      if (item && !seen.has(key) && !hiddenSet.has(key)) {
        seen.add(key);
        ordered.push(item);
      }
    }
    for (const item of baseMergedSidebarItems) {
      if (!seen.has(item.key) && !hiddenSet.has(item.key)) {
        seen.add(item.key);
        ordered.push(item);
      }
    }
    return ordered;
  }, [baseMergedSidebarItems, taskbarOrder, hiddenTaskbarKeys]);

  const persistTaskbarOrder = useCallback((keys: string[]) => {
    setTaskbarOrder(keys);
    try {
      localStorage.setItem(TASKBAR_ORDER_KEY, JSON.stringify(keys));
    } catch {}
  }, []);

  const persistHiddenTaskbarKeys = useCallback((keys: string[]) => {
    setHiddenTaskbarKeys(keys);
    try {
      localStorage.setItem(TASKBAR_HIDDEN_KEY, JSON.stringify(keys));
    } catch {}
  }, []);

  const persistUtilityOrder = useCallback((order: UtilityItemKey[]) => {
    setUtilityOrder(order);
    try {
      localStorage.setItem(TASKBAR_UTILITY_ORDER_KEY, JSON.stringify(order));
    } catch {}
  }, []);

  const moveNavItemByStep = useCallback(
    (index: number, delta: number) => {
      const targetIndex = index + delta;
      if (index < 0 || targetIndex < 0 || targetIndex >= mergedSidebarItems.length) return;
      const keys = mergedSidebarItems.map((item) => item.key);
      const [moved] = keys.splice(index, 1);
      keys.splice(targetIndex, 0, moved);
      persistTaskbarOrder(keys);
    },
    [mergedSidebarItems, persistTaskbarOrder]
  );

  const unpinNavItem = useCallback(
    (key: string) => {
      if (!hiddenTaskbarKeys.includes(key)) {
        persistHiddenTaskbarKeys([...hiddenTaskbarKeys, key]);
      }
    },
    [hiddenTaskbarKeys, persistHiddenTaskbarKeys]
  );

  const toggleTaskbarWeather = useCallback(() => {
    setShowTaskbarWeather((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TASKBAR_SHOW_WEATHER_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleTaskbarClock = useCallback(() => {
    setShowTaskbarClock((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TASKBAR_SHOW_CLOCK_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const resetTaskbarLayout = useCallback(() => {
    setTaskbarOrder([]);
    setHiddenTaskbarKeys([]);
    setUtilityOrder(['widgets', 'direct-command']);
    setShowTaskbarWeather(true);
    setShowTaskbarClock(true);
    try {
      localStorage.removeItem(TASKBAR_ORDER_KEY);
      localStorage.removeItem(TASKBAR_HIDDEN_KEY);
      localStorage.removeItem(TASKBAR_UTILITY_ORDER_KEY);
      localStorage.removeItem(TASKBAR_SHOW_WEATHER_KEY);
      localStorage.removeItem(TASKBAR_SHOW_CLOCK_KEY);
    } catch {}
  }, []);

  const openTaskbarContextMenu = useCallback(
    (e: React.MouseEvent, stateWithoutCoords: Omit<TaskbarContextMenuState, 'x' | 'y'>) => {
      e.preventDefault();
      e.stopPropagation();
      hideItemTooltip();
      const point = toAppPortalCoordinates(e.clientX, e.clientY);
      setContextMenu({ ...stateWithoutCoords, x: point.x, y: point.y } as TaskbarContextMenuState);
    },
    [hideItemTooltip]
  );

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onSelectTab(nextTab.id);
    document.getElementById(`app-tab-${nextTab.id}`)?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchExpanded(false);
      return;
    }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    onOpenSearch();
  };

  return (
    <div
      id="app-bottom-tabs-bar"
      data-search-experience="true"
      onContextMenu={(e) => openTaskbarContextMenu(e, { scope: 'bar' })}
      className={`sticky z-30 flex h-11 w-full shrink-0 items-center justify-between gap-1.5 border-black/[0.08] bg-[#f3f3f3]/95 px-2 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#1b1f24]/95 ${
        isTopBarBottom ? 'order-last bottom-0 border-t' : 'top-0 border-b'
      }`}
    >
      {!isCenteredSearch && showTaskbarWeather && (
        <TaskbarWeatherTray
          isTopBarBottom={isTopBarBottom}
          theme={theme}
          showWidgets={showWidgets}
          onToggleWidgets={onToggleWidgets}
          showItemTooltip={showItemTooltip}
          hideItemTooltip={hideItemTooltip}
          onContextMenu={(e) => openTaskbarContextMenu(e, { scope: 'bar' })}
        />
      )}

      {showTabs && !isCenteredSearch && !isSidebarMerged && !showTaskbarWeather && (
        <div className="hidden min-w-0 flex-1 sm:block" aria-hidden="true" />
      )}

      <div
        className={
          isCenteredSearch
            ? 'flex flex-1 items-center justify-center'
            : showTabs
              ? isSidebarMerged
                ? 'flex min-w-0 flex-[2] items-center gap-1'
                : 'flex shrink-0 items-center gap-1'
              : 'flex min-w-0 flex-1 items-center justify-center gap-1'
        }
      >

      {isSidebarMerged && !isCenteredSearch && scrollState.hasOverflow && (
        <button
          id="bottombar-scroll-left"
          type="button"
          onClick={() => {
            hideItemTooltip();
            handleScrollBar('left');
          }}
          onMouseEnter={(e) => showItemTooltip('Scroll left', e.currentTarget)}
          onMouseLeave={hideItemTooltip}
          onFocus={(e) => showItemTooltip('Scroll left', e.currentTarget)}
          onBlur={hideItemTooltip}
          disabled={!scrollState.canScrollLeft}
          aria-label="Scroll bottom bar left"
          title="Scroll left"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] outline-none transition-colors hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-[#0078d4] disabled:pointer-events-none disabled:opacity-30 dark:text-[#e5e7eb] dark:hover:bg-white/[0.08] dark:focus-visible:ring-[#4cc2ff]"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={() => {
          updateScrollState();
          hideItemTooltip();
        }}
        className={isSidebarMerged ? `${showTabs && !isCenteredSearch ? 'min-w-0 flex-[2]' : 'min-w-0 max-w-full'} overflow-x-auto no-scrollbar` : 'flex shrink-0 items-center justify-center gap-1.5'}
      >
      <div
        ref={scrollContentRef}
        className={isSidebarMerged ? 'mx-auto flex w-max items-center justify-center gap-1 px-1' : 'flex shrink-0 items-center justify-center gap-1.5'}
      >
        {!isCenteredSearch && onToggleStartMenu && (
          <button
            id="bottombar-start-button"
            type="button"
            onClick={() => {
              hideItemTooltip();
              onToggleStartMenu();
            }}
            onMouseEnter={(e) => showItemTooltip('Start', e.currentTarget)}
            onMouseLeave={hideItemTooltip}
            onFocus={(e) => showItemTooltip('Start', e.currentTarget)}
            onBlur={hideItemTooltip}
            aria-label="Start"
            aria-pressed={isStartMenuOpen}
            aria-haspopup="dialog"
            title="Start"
            className={`relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
              isStartMenuOpen
                ? 'bg-black/[0.08] ring-1 ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.14]'
                : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
          >
            <FluentStartIcon className="size-[19px] shrink-0" />
          </button>
        )}
        <div
          role="search"
          aria-label="Search current page"
          className={`flex ${isSearchExpanded ? 'h-10' : 'h-8'} shrink-0 items-center overflow-hidden border transition-[width,background-color,transform] duration-200 ${
            isCenteredSearch
              ? 'absolute left-1/2 top-1/2 z-50 w-[min(460px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 rounded-full border-black/[0.08] bg-white shadow-lg shadow-black/15 dark:border-white/[0.08] dark:bg-[#282c31]'
              : isSearchExpanded
                ? 'w-[min(280px,45vw)] rounded-md border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-[#282c31]'
                : searchColorfulExperiment
                  ? 'w-[min(218px,55vw)] sm:w-[218px] rounded-full border-black/[0.1] bg-white/85 shadow-[0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/[0.14] dark:bg-white/[0.11] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_1px_2px_rgba(0,0,0,0.2)]'
                  : 'w-[148px] rounded-full border-transparent bg-[#263970] shadow-sm shadow-black/10'
          }`}
        >
          <button
            id="search-pill-trigger"
            type="button"
            aria-haspopup={searchColorfulExperiment ? 'dialog' : undefined}
            aria-label={searchColorfulExperiment && !isSearchExpanded ? 'Search here' : isSearchExpanded ? 'Open global search' : 'Search'}
            title={searchColorfulExperiment && !isSearchExpanded ? 'Search here' : isSearchExpanded ? 'Open global search' : 'Search'}
            aria-pressed={isSearchExpanded}
            onClick={() => {
              hideItemTooltip();
              if (isSearchExpanded || searchColorfulExperiment) onOpenSearch();
              else setIsSearchExpanded(true);
            }}
            onMouseEnter={(e) =>
              showItemTooltip(
                searchColorfulExperiment && !isSearchExpanded
                  ? 'Search'
                  : isSearchExpanded
                    ? 'Open global search'
                    : 'Search',
                e.currentTarget
              )
            }
            onMouseLeave={hideItemTooltip}
            onFocus={(e) =>
              showItemTooltip(
                searchColorfulExperiment && !isSearchExpanded
                  ? 'Search'
                  : isSearchExpanded
                    ? 'Open global search'
                    : 'Search',
                e.currentTarget
              )
            }
            onBlur={hideItemTooltip}
            className={`group relative inline-flex h-full shrink-0 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4cc2ff] ${
              isSearchExpanded
                ? `${isCenteredSearch ? 'size-9 rounded-full' : 'size-9 rounded-md'} text-[#5f6368] hover:bg-black/[0.06] hover:text-[#111827] dark:text-[#b5bbc4] dark:hover:bg-white/[0.08] dark:hover:text-white`
                : searchColorfulExperiment
                  ? 'w-full justify-start gap-2 rounded-full pl-3 pr-[3px] text-[#374151] hover:bg-black/[0.04] dark:text-[#e5e7eb] dark:hover:bg-white/[0.06]'
                  : 'w-full gap-2 rounded-full px-5 text-white hover:bg-[#304785]'
            }`}
          >
            {searchColorfulExperiment ? (
              isSearchExpanded ? (
                <span className="relative size-5 shrink-0" aria-hidden="true">
                  <img
                    src={SEARCH_EXPERIENCE_ICON_URLS.hover}
                    alt=""
                    draggable={false}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 size-full object-contain"
                  />
                </span>
              ) : (
                <Search className="size-4 shrink-0 stroke-[1.9] text-[#374151] dark:text-[#e5e7eb]" aria-hidden="true" />
              )
            ) : (
              <Search className="size-5 shrink-0" aria-hidden="true" />
            )}
            {!isSearchExpanded && (
              searchColorfulExperiment ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-left text-[13px] font-normal leading-none text-[#1f2937]/90 no-underline decoration-transparent dark:text-white/85">
                    Search here
                  </span>
                  <img
                    src="/search-experience/search-highlight-pill.png"
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-[24px] w-[46px] shrink-0 rounded-full object-cover select-none"
                  />
                </>
              ) : (
                <span className="whitespace-nowrap text-[15px] font-medium leading-none no-underline decoration-transparent">Search</span>
              )
            )}
            {searchQuery && !isSearchExpanded && !searchColorfulExperiment && <span className="absolute right-3 top-2.5 size-1.5 rounded-full bg-[#4cc2ff]" aria-hidden="true" />}
          </button>
          {isSearchExpanded && (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  const query = event.target.value;
                  if (query.trim().toLowerCase() === 'sparkver') {
                    onSearchChange('');
                    setIsSearchExpanded(false);
                    onOpenAbout();
                    return;
                  }
                  onSearchChange(query);
                }}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search current page"
                placeholder={searchColorfulExperiment ? 'Type here to search' : 'Search'}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[#111827] outline-none placeholder:text-neutral-500 dark:text-white dark:placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  onMouseEnter={(e) => showItemTooltip('Clear search', e.currentTarget)}
                  onMouseLeave={hideItemTooltip}
                  aria-label="Clear search"
                  title="Clear search"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded text-[#70757d] outline-none hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#a5abb4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  hideItemTooltip();
                  setIsSearchExpanded(false);
                }}
                onMouseEnter={(e) => showItemTooltip('Collapse search', e.currentTarget)}
                onMouseLeave={hideItemTooltip}
                aria-label="Collapse tab search"
                title="Collapse tab search"
                className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-[#70757d] outline-none hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#a5abb4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {!isCenteredSearch &&
          utilityOrder.map((utilityKey) => {
            if (utilityKey === 'widgets') {
              if (!showWidgets || !onToggleWidgets) return null;
              const isDropHighlight = utilityDropTarget === 'widgets' && draggedUtilityKey && draggedUtilityKey !== 'widgets';
              return (
                <button
                  key="utility-widgets"
                  id="topbar-widgets-button"
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    hideItemTooltip();
                    setContextMenu(null);
                    setDraggedUtilityKey('widgets');
                    e.dataTransfer.effectAllowed = 'move';
                    try { e.dataTransfer.setData('text/plain', 'utility:widgets'); } catch {}
                  }}
                  onDragOver={(e) => {
                    if (!draggedUtilityKey || draggedUtilityKey === 'widgets') return;
                    e.preventDefault();
                    setUtilityDropTarget('widgets');
                  }}
                  onDragLeave={() => {
                    if (utilityDropTarget === 'widgets') setUtilityDropTarget(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedUtilityKey && draggedUtilityKey !== 'widgets') {
                      const next = [...utilityOrder];
                      const from = next.indexOf(draggedUtilityKey);
                      const to = next.indexOf('widgets');
                      if (from !== -1 && to !== -1) {
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        persistUtilityOrder(next);
                      }
                    }
                    setDraggedUtilityKey(null);
                    setUtilityDropTarget(null);
                  }}
                  onDragEnd={() => {
                    setDraggedUtilityKey(null);
                    setUtilityDropTarget(null);
                  }}
                  onContextMenu={(e) =>
                    openTaskbarContextMenu(e, { scope: 'utility', key: 'widgets', label: 'Widgets' })
                  }
                  onClick={() => {
                    hideItemTooltip();
                    onToggleWidgets();
                  }}
                  onMouseEnter={(e) => showItemTooltip('Widgets', e.currentTarget)}
                  onMouseLeave={hideItemTooltip}
                  onFocus={(e) => showItemTooltip('Widgets', e.currentTarget)}
                  onBlur={hideItemTooltip}
                  aria-label="Widgets"
                  title="Widgets"
                  aria-pressed={isWidgetsOpen}
                  className={`relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                    draggedUtilityKey === 'widgets' ? 'opacity-45 scale-95' : ''
                  } ${
                    isDropHighlight ? 'ring-2 ring-[#0078d4] dark:ring-[#4cc2ff]' : ''
                  } ${
                    isWidgetsOpen
                      ? 'bg-black/[0.08] ring-1 ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.14]'
                      : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <img
                    src="/icons/widgets.png"
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="size-[19px] shrink-0 object-contain select-none"
                  />
                </button>
              );
            }

            if (!onToggleDirectCommand) return null;
            const isDropHighlight =
              utilityDropTarget === 'direct-command' && draggedUtilityKey && draggedUtilityKey !== 'direct-command';
            return (
              <button
                key="utility-direct-command"
                id="topbar-direct-command-button"
                type="button"
                draggable
                onDragStart={(e) => {
                  hideItemTooltip();
                  setContextMenu(null);
                  setDraggedUtilityKey('direct-command');
                  e.dataTransfer.effectAllowed = 'move';
                  try { e.dataTransfer.setData('text/plain', 'utility:direct-command'); } catch {}
                }}
                onDragOver={(e) => {
                  if (!draggedUtilityKey || draggedUtilityKey === 'direct-command') return;
                  e.preventDefault();
                  setUtilityDropTarget('direct-command');
                }}
                onDragLeave={() => {
                  if (utilityDropTarget === 'direct-command') setUtilityDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedUtilityKey && draggedUtilityKey !== 'direct-command') {
                    const next = [...utilityOrder];
                    const from = next.indexOf(draggedUtilityKey);
                    const to = next.indexOf('direct-command');
                    if (from !== -1 && to !== -1) {
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      persistUtilityOrder(next);
                    }
                  }
                  setDraggedUtilityKey(null);
                  setUtilityDropTarget(null);
                }}
                onDragEnd={() => {
                  setDraggedUtilityKey(null);
                  setUtilityDropTarget(null);
                }}
                onContextMenu={(e) =>
                  openTaskbarContextMenu(e, {
                    scope: 'utility',
                    key: 'direct-command',
                    label: 'Direct Command',
                  })
                }
                onClick={() => {
                  hideItemTooltip();
                  onToggleDirectCommand();
                }}
                onMouseEnter={(e) => showItemTooltip('Direct Command', e.currentTarget)}
                onMouseLeave={hideItemTooltip}
                onFocus={(e) => showItemTooltip('Direct Command', e.currentTarget)}
                onBlur={hideItemTooltip}
                aria-label="Direct Command"
                title="Direct Command"
                aria-pressed={isDirectCommandOpen}
                aria-haspopup="dialog"
                className={`relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                  draggedUtilityKey === 'direct-command' ? 'opacity-45 scale-95' : ''
                } ${
                  isDropHighlight ? 'ring-2 ring-[#0078d4] dark:ring-[#4cc2ff]' : ''
                } ${
                  isDirectCommandOpen
                    ? 'bg-black/[0.08] ring-1 ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.14]'
                    : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                }`}
              >
                <img
                  src={DIRECT_COMMAND_ICON_URL}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="size-[20px] shrink-0 object-contain select-none"
                />
              </button>
            );
          })}

        {!isCenteredSearch && isSidebarMerged && (
          <>
            <span className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15" aria-hidden="true" />
            <nav aria-label="Bottom bar navigation" className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {mergedSidebarItems.map((item, index) => {
                const active = isMergedActive(item.key);
                const isDragging = draggedNavKey === item.key;
                const isDropLeft = navDropTarget?.key === item.key && navDropTarget.side === 'left';
                const isDropRight = navDropTarget?.key === item.key && navDropTarget.side === 'right';
                return (
                  <div key={item.key} className="relative flex items-center">
                    {isDropLeft && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1 bottom-1 left-0 z-20 w-[2.5px] rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                      />
                    )}
                    {isDropRight && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1 bottom-1 right-0 z-20 w-[2.5px] rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                      />
                    )}
                    <button
                      id={`bottombar-nav-${item.key}`}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        hideItemTooltip();
                        setContextMenu(null);
                        setDraggedNavKey(item.key);
                        e.dataTransfer.effectAllowed = 'move';
                        try {
                          e.dataTransfer.setData('text/plain', `nav:${item.key}`);
                        } catch {}
                      }}
                      onDragOver={(e) => {
                        if (!draggedNavKey || draggedNavKey === item.key) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const rect = e.currentTarget.getBoundingClientRect();
                        const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                        setNavDropTarget({ key: item.key, side });
                      }}
                      onDragLeave={() => {
                        if (navDropTarget?.key === item.key) setNavDropTarget(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedNavKey && draggedNavKey !== item.key) {
                          const keys = mergedSidebarItems.map((entry) => entry.key);
                          const fromIndex = keys.indexOf(draggedNavKey);
                          const targetIndex = keys.indexOf(item.key);
                          if (fromIndex !== -1 && targetIndex !== -1) {
                            const side = navDropTarget?.key === item.key ? navDropTarget.side : 'left';
                            const [moved] = keys.splice(fromIndex, 1);
                            let insertAt = side === 'right' ? targetIndex + 1 : targetIndex;
                            if (fromIndex < insertAt) insertAt -= 1;
                            insertAt = Math.max(0, Math.min(keys.length, insertAt));
                            keys.splice(insertAt, 0, moved);
                            persistTaskbarOrder(keys);
                          }
                        }
                        setDraggedNavKey(null);
                        setNavDropTarget(null);
                      }}
                      onDragEnd={() => {
                        setDraggedNavKey(null);
                        setNavDropTarget(null);
                      }}
                      onContextMenu={(e) =>
                        openTaskbarContextMenu(e, {
                          scope: 'nav-item',
                          key: item.key,
                          label: item.label,
                          index,
                        })
                      }
                      onClick={() => {
                        hideItemTooltip();
                        item.onClick();
                      }}
                      onMouseEnter={(e) => showItemTooltip(item.label, e.currentTarget)}
                      onMouseLeave={hideItemTooltip}
                      onFocus={(e) => showItemTooltip(item.label, e.currentTarget)}
                      onBlur={hideItemTooltip}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      title={item.label}
                      className={`relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                        isDragging ? 'opacity-45 scale-95' : ''
                      } ${
                        active
                          ? 'bg-black/[0.07] dark:bg-white/[0.1]'
                          : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                      }`}
                    >
                      {item.icon}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute bottom-[1px] left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>
          </>
        )}
      </div>
      </div>

      {isSidebarMerged && !isCenteredSearch && scrollState.hasOverflow && (
        <button
          id="bottombar-scroll-right"
          type="button"
          onClick={() => {
            hideItemTooltip();
            handleScrollBar('right');
          }}
          onMouseEnter={(e) => showItemTooltip('Scroll right', e.currentTarget)}
          onMouseLeave={hideItemTooltip}
          onFocus={(e) => showItemTooltip('Scroll right', e.currentTarget)}
          onBlur={hideItemTooltip}
          disabled={!scrollState.canScrollRight}
          aria-label="Scroll bottom bar right"
          title="Scroll right"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] outline-none transition-colors hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-[#0078d4] disabled:pointer-events-none disabled:opacity-30 dark:text-[#e5e7eb] dark:hover:bg-white/[0.08] dark:focus-visible:ring-[#4cc2ff]"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
      </div>

      {showTabs && !isCenteredSearch && (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div role="tablist" aria-label="Open app tabs" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab, index) => {
            const title = getTabTitle(tab.route);
            const isActive = tab.id === activeTabId;

            return (
              <div
                key={tab.id}
                role="presentation"
                className={`group flex h-9 min-w-[96px] max-w-[220px] flex-1 basis-0 items-center rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-[#111827] shadow-sm dark:bg-[#282c31] dark:text-white'
                    : 'text-[#5f6368] hover:bg-black/[0.05] dark:text-[#b5bbc4] dark:hover:bg-white/[0.06]'
                }`}
              >
                <button
                  id={`app-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`app-tab-panel-${tab.id}`}
                  aria-label={title}
                  tabIndex={isActive ? 0 : -1}
                  title={title}
                  data-app-tab-id={tab.id}
                  onClick={() => {
                    hideItemTooltip();
                    onSelectTab(tab.id);
                  }}
                  onMouseEnter={(e) => showItemTooltip(title, e.currentTarget)}
                  onMouseLeave={hideItemTooltip}
                  onFocus={(e) => showItemTooltip(title, e.currentTarget)}
                  onBlur={hideItemTooltip}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className="flex min-w-0 flex-1 items-center gap-2 truncate rounded-l-md px-2.5 py-2 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff]"
                >
                  <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
                    {getTabIcon(tab.route)}
                  </span>
                  <span className="truncate">{title}</span>
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Close ${title} tab`}
                    title={`Close ${title} tab`}
                    onClick={() => {
                      hideItemTooltip();
                      onCloseTab(tab.id);
                    }}
                    onMouseEnter={(e) => showItemTooltip(`Close ${title}`, e.currentTarget)}
                    onMouseLeave={hideItemTooltip}
                    className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-[#70757d] outline-none transition-colors hover:bg-black/[0.08] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#a5abb4] dark:hover:bg-white/[0.1] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
            })}
          </div>
          <button
            type="button"
            aria-label="Open new tab"
            title="Open new tab"
            onClick={() => {
              hideItemTooltip();
              onCreateTab();
            }}
            onMouseEnter={(e) => showItemTooltip('New tab', e.currentTarget)}
            onMouseLeave={hideItemTooltip}
            onFocus={(e) => showItemTooltip('New tab', e.currentTarget)}
            onBlur={hideItemTooltip}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#5f6368] outline-none transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#b5bbc4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {!isCenteredSearch && showTaskbarClock && (
        <TaskbarClockTray
          isTopBarBottom={isTopBarBottom}
          theme={theme}
          showItemTooltip={showItemTooltip}
          hideItemTooltip={hideItemTooltip}
          onContextMenu={(e) => openTaskbarContextMenu(e, { scope: 'bar' })}
        />
      )}

      {typeof document !== 'undefined' && createPortal(
        <>
          <AnimatePresence>
            {hoveredTooltip && !contextMenu && (
              <motion.div
                key="bottombar-hover-tooltip"
                role="tooltip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: `${hoveredTooltip.top}px`,
                  left: `${hoveredTooltip.left}px`,
                  transform: isTopBarBottom ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                  backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.50)' : 'rgba(24, 24, 28, 0.50)',
                  backdropFilter: 'blur(16px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                }}
                className="fluent-tooltip z-[2147483647] px-3 py-1.5 min-h-[30px] flex items-center rounded-[6px] text-[#111827] dark:text-white text-xs font-medium shadow-[0_4px_20px_rgba(0,0,0,0.18)] border-0 outline-none pointer-events-none whitespace-nowrap select-none"
              >
                {hoveredTooltip.label}
              </motion.div>
            )}
          </AnimatePresence>
          {contextMenu && (
            <div
              ref={contextMenuRef}
              role="menu"
              aria-label="Taskbar options"
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                ...flyoutPanelStyle,
                left: contextMenuPos.left,
                top: contextMenuPos.top,
              }}
              className={`fixed z-[2147483647] w-[236px] ${flyoutPanelClassName} fluent-context-menu`}
            >
              {contextMenu.scope === 'nav-item' && (() => {
                const targetItem = mergedSidebarItems.find((entry) => entry.key === contextMenu.key);
                return (
                  <>
                    {targetItem && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setContextMenu(null);
                          targetItem.onClick();
                        }}
                        className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                      >
                        <PanelsTopLeft className="size-4 shrink-0" />
                        <span className="truncate">Open {contextMenu.label}</span>
                      </button>
                    )}
                    {contextMenu.index > 0 && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          moveNavItemByStep(contextMenu.index, -1);
                          setContextMenu(null);
                        }}
                        className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                      >
                        <ArrowLeft className="size-4 shrink-0" />
                        <span className="truncate">Move left</span>
                      </button>
                    )}
                    {contextMenu.index < mergedSidebarItems.length - 1 && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          moveNavItemByStep(contextMenu.index, 1);
                          setContextMenu(null);
                        }}
                        className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                      >
                        <ArrowRight className="size-4 shrink-0" />
                        <span className="truncate">Move right</span>
                      </button>
                    )}
                    {mergedSidebarItems.length > 1 && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          unpinNavItem(contextMenu.key);
                          setContextMenu(null);
                        }}
                        className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                      >
                        <PinOff className="size-4 shrink-0" />
                        <span className="truncate">Unpin from taskbar</span>
                      </button>
                    )}
                    <div className="my-1 h-px bg-black/[0.08] dark:bg-white/[0.1]" />
                  </>
                );
              })()}

              {onToggleDirectCommand && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setContextMenu(null);
                    onToggleDirectCommand();
                  }}
                  className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <Terminal className="size-4 shrink-0" />
                  <span className="truncate">Direct Command</span>
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  updateSetting('widgetsFeed', !showWidgets);
                  setContextMenu(null);
                }}
                className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              >
                {showWidgets ? <EyeOff className="size-4 shrink-0" /> : <Eye className="size-4 shrink-0" />}
                <span className="truncate">{showWidgets ? 'Hide Widgets button' : 'Show Widgets button'}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleTaskbarWeather();
                  setContextMenu(null);
                }}
                className="w-full h-[34px] px-3 rounded-[6px] flex items-center justify-between gap-2 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <CloudSun className="size-4 shrink-0" />
                  <span className="truncate">Weather</span>
                </span>
                {showTaskbarWeather && <Check className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleTaskbarClock();
                  setContextMenu(null);
                }}
                className="w-full h-[34px] px-3 rounded-[6px] flex items-center justify-between gap-2 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Clock className="size-4 shrink-0" />
                  <span className="truncate">Date &amp; clock</span>
                </span>
                {showTaskbarClock && <Check className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  updateSetting('isTopBarBottom', !isTopBarBottom);
                  setContextMenu(null);
                }}
                className="w-full h-[34px] px-3 rounded-[6px] flex items-center justify-between gap-2 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <PanelsTopLeft className="size-4 shrink-0" />
                  <span className="truncate">Windows Mode</span>
                </span>
                {isTopBarBottom && <Check className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  resetTaskbarLayout();
                  setContextMenu(null);
                }}
                className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              >
                <RotateCcw className="size-4 shrink-0" />
                <span className="truncate">Reset taskbar layout</span>
              </button>

              <div className="my-1 h-px bg-black/[0.08] dark:bg-white/[0.1]" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  onNavigate?.('/settings');
                }}
                className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
              >
                <FluentSettingsIcon className="size-4 shrink-0" />
                <span className="truncate">Taskbar settings</span>
              </button>
            </div>
          )}
        </>,
        getAppPortalTarget() ?? document.body
      )}
    </div>
  );
};
