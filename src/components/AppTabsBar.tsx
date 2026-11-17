import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudSun,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  PanelsTopLeft,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Terminal,
  X,
} from 'lucide-react';
import { getAppPortalTarget, toAppPortalCoordinates } from '../utils/appPortal';
import { getTabIcon, getTabTitle, type AppTab } from '../utils/tabMeta';
import { flyoutPanelClassName, flyoutPanelStyle } from './FlyoutDropdown';
import { ControlCenterTray } from './ControlCenterTray';
import { TaskbarClockTray, TaskbarWeatherTray } from './TaskbarTrayWidgets';
import { useSettings } from '../hooks/useSettings';
import {
  FluentFileExplorerIcon,
  FluentSettingsIcon,
  FluentStartIcon,
  SEARCH_EXPERIENCE_ICON_URLS,
} from './FluentIcons';

export type { AppTab };

const DIRECT_COMMAND_ICON_URL = '/assets/aistudio/direct_command_6240d59d.png';
const TASKBAR_UTILITY_ORDER_KEY = 'sparkle_taskbar_utility_order_v1';
const TASKBAR_SHOW_WEATHER_KEY = 'sparkle_taskbar_show_weather_v1';
const TASKBAR_SHOW_CLOCK_KEY = 'sparkle_taskbar_show_clock_v1';
const TASKBAR_SHOW_CONTROL_CENTER_KEY = 'sparkle_taskbar_show_control_center_v1';

type UtilityItemKey = 'widgets' | 'direct-command' | 'file-explorer';

const DEFAULT_UTILITY_ORDER: UtilityItemKey[] = ['widgets', 'direct-command', 'file-explorer'];

const normalizeUtilityOrder = (raw: unknown): UtilityItemKey[] => {
  const valid = new Set<UtilityItemKey>(DEFAULT_UTILITY_ORDER);
  const result: UtilityItemKey[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && valid.has(item as UtilityItemKey) && !result.includes(item as UtilityItemKey)) {
        result.push(item as UtilityItemKey);
      }
    }
  }
  for (const key of DEFAULT_UTILITY_ORDER) {
    if (!result.includes(key)) result.push(key);
  }
  return result;
};

type TaskbarContextMenuState =
  | { x: number; y: number; scope: 'bar' }
  | { x: number; y: number; scope: 'utility'; key: UtilityItemKey | 'start' | 'search'; label: string }
  | { x: number; y: number; scope: 'window-tab'; tabId: number; label: string; isMinimized: boolean; isMaximized: boolean };

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
  windowedTabs?: boolean;
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
  onToggleWindowTab?: (tabId: number) => void;
  onMinimizeWindowTab?: (tabId: number) => void;
  onToggleMaximizeWindowTab?: (tabId: number) => void;
  onReorderWindowTabs?: (orderedIds: number[]) => void;
}

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
  windowedTabs = false,
  isTopBarBottom = false,
  currentRoute = '/',
  onNavigate,
  onSelectTab,
  onCreateTab,
  onCloseTab,
  onToggleWindowTab,
  onMinimizeWindowTab,
  onToggleMaximizeWindowTab,
  onReorderWindowTabs,
}) => {
  const { updateSetting } = useSettings();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [utilityOrder, setUtilityOrder] = useState<UtilityItemKey[]>(() => {
    try {
      const saved = localStorage.getItem(TASKBAR_UTILITY_ORDER_KEY);
      if (saved) {
        return normalizeUtilityOrder(JSON.parse(saved));
      }
    } catch {}
    return DEFAULT_UTILITY_ORDER;
  });
  const [draggedUtilityKey, setDraggedUtilityKey] = useState<UtilityItemKey | null>(null);
  const [utilityDropTarget, setUtilityDropTarget] = useState<UtilityItemKey | null>(null);
  const [draggedWindowId, setDraggedWindowId] = useState<number | null>(null);
  const [windowDropTarget, setWindowDropTarget] = useState<{ id: number; side: 'left' | 'right' } | null>(null);
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
  const [showTaskbarControlCenter, setShowTaskbarControlCenter] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TASKBAR_SHOW_CONTROL_CENTER_KEY) !== 'false';
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
  const primaryExplorerTab = windowedTabs
    ? tabs.find((t) => (t.route.split(/[?#]/)[0] || '/') === '/explorer')
    : undefined;
  const runningUnpinnedTabs = windowedTabs
    ? tabs.filter((t) => t.id !== primaryExplorerTab?.id)
    : tabs;
  const hasScrollableWindowIcons = windowedTabs && runningUnpinnedTabs.length > 0;
  const showBrowserTabStrip = showTabs && !windowedTabs && !isCenteredSearch;

  const showItemTooltip = useCallback(
    (label: string, target: HTMLElement) => {
      if (!label || draggedUtilityKey || draggedWindowId !== null || contextMenu) return;
      const rect = target.getBoundingClientRect();
      const clampedX = Math.max(48, Math.min(window.innerWidth - 48, rect.left + rect.width / 2));
      const anchorY = isTopBarBottom ? rect.top - 8 : rect.bottom + 8;
      const point = toAppPortalCoordinates(clampedX, anchorY);
      setHoveredTooltip({ label, top: point.y, left: point.x });
    },
    [isTopBarBottom, draggedUtilityKey, draggedWindowId, contextMenu]
  );

  const hideItemTooltip = useCallback(() => {
    setHoveredTooltip(null);
  }, []);

  useEffect(() => {
    setHoveredTooltip(null);
  }, [isDirectCommandOpen, isWidgetsOpen, isStartMenuOpen, isCenteredSearch, windowedTabs, tabs.length]);

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
    if (!el || !hasScrollableWindowIcons) {
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
  }, [hasScrollableWindowIcons]);

  useEffect(() => {
    updateScrollState();
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!container || !hasScrollableWindowIcons) return;

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(container);
    if (content) resizeObserver.observe(content);
    window.addEventListener('resize', updateScrollState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, hasScrollableWindowIcons, showWidgets, isCenteredSearch, tabs.length]);

  const handleScrollBar = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.round(el.clientWidth * 0.55));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  const persistUtilityOrder = useCallback((order: UtilityItemKey[]) => {
    setUtilityOrder(order);
    try {
      localStorage.setItem(TASKBAR_UTILITY_ORDER_KEY, JSON.stringify(order));
    } catch {}
  }, []);

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

  const toggleTaskbarControlCenter = useCallback(() => {
    setShowTaskbarControlCenter((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TASKBAR_SHOW_CONTROL_CENTER_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const resetTaskbarLayout = useCallback(() => {
    setUtilityOrder(DEFAULT_UTILITY_ORDER);
    setShowTaskbarWeather(true);
    setShowTaskbarClock(true);
    setShowTaskbarControlCenter(true);
    try {
      localStorage.removeItem(TASKBAR_UTILITY_ORDER_KEY);
      localStorage.removeItem(TASKBAR_SHOW_WEATHER_KEY);
      localStorage.removeItem(TASKBAR_SHOW_CLOCK_KEY);
      localStorage.removeItem(TASKBAR_SHOW_CONTROL_CENTER_KEY);
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

      {showBrowserTabStrip && !showTaskbarWeather && (
        <div className="hidden min-w-0 flex-1 sm:block" aria-hidden="true" />
      )}

      <div
        className={
          isCenteredSearch
            ? 'flex flex-1 items-center justify-center'
            : showBrowserTabStrip
              ? 'flex shrink-0 items-center gap-1'
              : 'flex min-w-0 flex-1 items-center justify-center gap-1'
        }
      >
        {hasScrollableWindowIcons && !isCenteredSearch && scrollState.hasOverflow && (
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
          className={
            hasScrollableWindowIcons
              ? 'min-w-0 max-w-full overflow-x-auto no-scrollbar'
              : 'flex shrink-0 items-center justify-center gap-1.5'
          }
        >
          <div
            ref={scrollContentRef}
            className={
              hasScrollableWindowIcons
                ? 'mx-auto flex w-max items-center justify-center gap-1 px-1'
                : 'flex shrink-0 items-center justify-center gap-1.5'
            }
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

                if (utilityKey === 'file-explorer') {
                  const isDropHighlight =
                    utilityDropTarget === 'file-explorer' &&
                    draggedUtilityKey &&
                    draggedUtilityKey !== 'file-explorer';
                  const isExplorerRunning = windowedTabs
                    ? Boolean(primaryExplorerTab)
                    : currentRoute === '/explorer';
                  const isExplorerFocused = windowedTabs
                    ? Boolean(primaryExplorerTab && !primaryExplorerTab.isMinimized && primaryExplorerTab.id === activeTabId)
                    : currentRoute === '/explorer';
                  return (
                    <button
                      key="utility-file-explorer"
                      id="taskbar-pinned-file-explorer"
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        hideItemTooltip();
                        setContextMenu(null);
                        setDraggedUtilityKey('file-explorer');
                        e.dataTransfer.effectAllowed = 'move';
                        try {
                          e.dataTransfer.setData('text/plain', 'utility:file-explorer');
                        } catch {}
                      }}
                      onDragOver={(e) => {
                        if (!draggedUtilityKey || draggedUtilityKey === 'file-explorer') return;
                        e.preventDefault();
                        setUtilityDropTarget('file-explorer');
                      }}
                      onDragLeave={() => {
                        if (utilityDropTarget === 'file-explorer') setUtilityDropTarget(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedUtilityKey && draggedUtilityKey !== 'file-explorer') {
                          const next = [...utilityOrder];
                          const from = next.indexOf(draggedUtilityKey);
                          const to = next.indexOf('file-explorer');
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
                      onContextMenu={(e) => {
                        if (primaryExplorerTab) {
                          openTaskbarContextMenu(e, {
                            scope: 'window-tab',
                            tabId: primaryExplorerTab.id,
                            label: 'File Explorer',
                            isMinimized: Boolean(primaryExplorerTab.isMinimized),
                            isMaximized: Boolean(primaryExplorerTab.isMaximized),
                          });
                        } else {
                          openTaskbarContextMenu(e, {
                            scope: 'utility',
                            key: 'file-explorer',
                            label: 'File Explorer',
                          });
                        }
                      }}
                      onClick={() => {
                        hideItemTooltip();
                        if (windowedTabs && primaryExplorerTab) {
                          if (onToggleWindowTab) onToggleWindowTab(primaryExplorerTab.id);
                          else onSelectTab(primaryExplorerTab.id);
                        } else {
                          onNavigate?.('/explorer');
                        }
                      }}
                      onMouseEnter={(e) => showItemTooltip('File Explorer', e.currentTarget)}
                      onMouseLeave={hideItemTooltip}
                      onFocus={(e) => showItemTooltip('File Explorer', e.currentTarget)}
                      onBlur={hideItemTooltip}
                      aria-label="File Explorer"
                      title="File Explorer"
                      aria-pressed={isExplorerFocused}
                      className={`relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                        draggedUtilityKey === 'file-explorer' ? 'opacity-45 scale-95' : ''
                      } ${
                        isDropHighlight ? 'ring-2 ring-[#0078d4] dark:ring-[#4cc2ff]' : ''
                      } ${
                        isExplorerFocused
                          ? 'bg-black/[0.08] dark:bg-white/[0.12]'
                          : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <FluentFileExplorerIcon className="size-[20px] shrink-0" />
                      {isExplorerRunning && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute bottom-[1px] left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all ${
                            isExplorerFocused
                              ? 'w-3.5 bg-[#0078d4] dark:bg-[#4cc2ff]'
                              : 'w-1.5 bg-black/35 dark:bg-white/45'
                          }`}
                        />
                      )}
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

            {/* Running open windows when WindowedTabs velocity is enabled (never extra pinned apps) */}
            {!isCenteredSearch && windowedTabs && runningUnpinnedTabs.length > 0 && (
              <>
                <span className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15" aria-hidden="true" />
                <nav aria-label="Open windows" className="flex shrink-0 items-center gap-1">
                  {runningUnpinnedTabs.map((win) => {
                    const title = getTabTitle(win.route);
                    const isMinimized = Boolean(win.isMinimized);
                    const isFocused = !isMinimized && win.id === activeTabId;
                    const isDragging = draggedWindowId === win.id;
                    const isDropLeft = windowDropTarget?.id === win.id && windowDropTarget.side === 'left';
                    const isDropRight = windowDropTarget?.id === win.id && windowDropTarget.side === 'right';
                    return (
                      <div key={win.id} className="relative flex items-center">
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
                          id={`taskbar-window-${win.id}`}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            hideItemTooltip();
                            setContextMenu(null);
                            setDraggedWindowId(win.id);
                            e.dataTransfer.effectAllowed = 'move';
                            try {
                              e.dataTransfer.setData('text/plain', `window:${win.id}`);
                            } catch {}
                          }}
                          onDragOver={(e) => {
                            if (draggedWindowId === null || draggedWindowId === win.id) return;
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
                            setWindowDropTarget({ id: win.id, side });
                          }}
                          onDragLeave={() => {
                            if (windowDropTarget?.id === win.id) setWindowDropTarget(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedWindowId !== null && draggedWindowId !== win.id && onReorderWindowTabs) {
                              const ids = tabs.map((t) => t.id);
                              const fromIdx = ids.indexOf(draggedWindowId);
                              const targetIdx = ids.indexOf(win.id);
                              if (fromIdx !== -1 && targetIdx !== -1) {
                                const side = windowDropTarget?.id === win.id ? windowDropTarget.side : 'left';
                                const [moved] = ids.splice(fromIdx, 1);
                                let insertAt = side === 'right' ? targetIdx + 1 : targetIdx;
                                if (fromIdx < insertAt) insertAt -= 1;
                                insertAt = Math.max(0, Math.min(ids.length, insertAt));
                                ids.splice(insertAt, 0, moved);
                                onReorderWindowTabs(ids);
                              }
                            }
                            setDraggedWindowId(null);
                            setWindowDropTarget(null);
                          }}
                          onDragEnd={() => {
                            setDraggedWindowId(null);
                            setWindowDropTarget(null);
                          }}
                          onContextMenu={(e) =>
                            openTaskbarContextMenu(e, {
                              scope: 'window-tab',
                              tabId: win.id,
                              label: title,
                              isMinimized,
                              isMaximized: Boolean(win.isMaximized),
                            })
                          }
                          onClick={() => {
                            hideItemTooltip();
                            if (onToggleWindowTab) onToggleWindowTab(win.id);
                            else onSelectTab(win.id);
                          }}
                          onMouseEnter={(e) =>
                            showItemTooltip(isMinimized ? `${title} (Minimized)` : title, e.currentTarget)
                          }
                          onMouseLeave={hideItemTooltip}
                          onFocus={(e) =>
                            showItemTooltip(isMinimized ? `${title} (Minimized)` : title, e.currentTarget)
                          }
                          onBlur={hideItemTooltip}
                          aria-label={isMinimized ? `Restore ${title}` : title}
                          aria-pressed={isFocused}
                          className={`relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                            isDragging ? 'opacity-45 scale-95' : ''
                          } ${
                            isFocused
                              ? 'bg-black/[0.08] dark:bg-white/[0.12]'
                              : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
                          }`}
                        >
                          <span className={isMinimized ? 'opacity-75' : ''}>
                            {getTabIcon(win.route, 'size-5 shrink-0')}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute bottom-[1px] left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all ${
                              isFocused
                                ? 'w-3.5 bg-[#0078d4] dark:bg-[#4cc2ff]'
                                : 'w-1.5 bg-black/35 dark:bg-white/45'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    id="taskbar-new-window-button"
                    type="button"
                    onClick={() => {
                      hideItemTooltip();
                      onCreateTab();
                    }}
                    onMouseEnter={(e) => showItemTooltip('New window', e.currentTarget)}
                    onMouseLeave={hideItemTooltip}
                    onFocus={(e) => showItemTooltip('New window', e.currentTarget)}
                    onBlur={hideItemTooltip}
                    aria-label="Open new window"
                    className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#5f6368] outline-none transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#b5bbc4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </button>
                </nav>
              </>
            )}
          </div>
        </div>

        {hasScrollableWindowIcons && !isCenteredSearch && scrollState.hasOverflow && (
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

      {showBrowserTabStrip && (
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

      {!isCenteredSearch && (showTaskbarControlCenter || showTaskbarClock) && (
        <div className="flex shrink-0 items-center gap-0.5">
          {showTaskbarControlCenter && (
            <ControlCenterTray
              isTopBarBottom={isTopBarBottom}
              theme={theme}
              showItemTooltip={showItemTooltip}
              hideItemTooltip={hideItemTooltip}
              onNavigate={onNavigate}
              onContextMenu={(e) => openTaskbarContextMenu(e, { scope: 'bar' })}
            />
          )}
          {showTaskbarClock && (
            <TaskbarClockTray
              isTopBarBottom={isTopBarBottom}
              theme={theme}
              showItemTooltip={showItemTooltip}
              hideItemTooltip={hideItemTooltip}
              onContextMenu={(e) => openTaskbarContextMenu(e, { scope: 'bar' })}
            />
          )}
        </div>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
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
                {contextMenu.scope === 'window-tab' && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (contextMenu.isMinimized) {
                          onSelectTab(contextMenu.tabId);
                        } else if (onMinimizeWindowTab) {
                          onMinimizeWindowTab(contextMenu.tabId);
                        }
                        setContextMenu(null);
                      }}
                      className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      <Minimize2 className="size-4 shrink-0" />
                      <span className="truncate">{contextMenu.isMinimized ? 'Restore' : 'Minimize'} {contextMenu.label}</span>
                    </button>
                    {onToggleMaximizeWindowTab && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onToggleMaximizeWindowTab(contextMenu.tabId);
                          setContextMenu(null);
                        }}
                        className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                      >
                        <Maximize2 className="size-4 shrink-0" />
                        <span className="truncate">{contextMenu.isMaximized ? 'Restore size' : 'Maximize'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onCloseTab(contextMenu.tabId);
                        setContextMenu(null);
                      }}
                      className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      <X className="size-4 shrink-0" />
                      <span className="truncate">Close window</span>
                    </button>
                    <div className="my-1 h-px bg-black/[0.08] dark:bg-white/[0.1]" />
                  </>
                )}

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
                    toggleTaskbarControlCenter();
                    setContextMenu(null);
                  }}
                  className="w-full h-[34px] px-3 rounded-[6px] flex items-center justify-between gap-2 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <SlidersHorizontal className="size-4 shrink-0" />
                    <span className="truncate">Control Center</span>
                  </span>
                  {showTaskbarControlCenter && <Check className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />}
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
                    updateSetting('windowedTabs', !windowedTabs);
                    setContextMenu(null);
                  }}
                  className="w-full h-[34px] px-3 rounded-[6px] flex items-center justify-between gap-2 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Maximize2 className="size-4 shrink-0" />
                    <span className="truncate">WindowedTabs</span>
                  </span>
                  {windowedTabs && <Check className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />}
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
