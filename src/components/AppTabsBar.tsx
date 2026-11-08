import React, { useState } from 'react';
import { Heart, Info, PanelsTopLeft, Plus, Terminal, X } from 'lucide-react';
import {
  FluentCameraIcon,
  FluentCraftmineIcon,
  FluentGalleryIcon,
  FluentHomeIcon,
  FluentInkCanvasIcon,
  FluentLiveTvIcon,
  FluentNewsIcon,
  FluentNotesIcon,
  FluentPhotopeaIcon,
  FluentScreenbugIcon,
  FluentSearchIcon,
  FluentSettingsIcon,
  FluentUpdatesIcon,
  FluentWatchIcon,
} from './FluentIcons';

export interface AppTab {
  id: number;
  route: string;
}

interface AppTabsBarProps {
  tabs: AppTab[];
  activeTabId: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSearch: () => void;
  onOpenAbout: () => void;
  showTabs?: boolean;
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
  showTabs = true,
  onSelectTab,
  onCreateTab,
  onCloseTab,
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

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
    <div className="sticky top-0 z-30 flex h-11 w-full shrink-0 items-center gap-1 border-b border-black/[0.08] bg-[#f3f3f3]/95 px-2 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#1b1f24]/95">
      <div
        role="search"
        aria-label="Search current page"
        className={`flex h-9 shrink-0 items-center overflow-hidden rounded-md border transition-[width,background-color] duration-200 ${
          isSearchExpanded
            ? 'w-[min(280px,45vw)] border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-[#282c31]'
            : 'w-9 border-transparent bg-transparent'
        }`}
      >
        <button
          type="button"
          aria-label={isSearchExpanded ? 'Open global search' : 'Expand tab search'}
          title={isSearchExpanded ? 'Open global search' : 'Expand tab search'}
          onClick={() => isSearchExpanded ? onOpenSearch() : setIsSearchExpanded(true)}
          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[#5f6368] outline-none transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#b5bbc4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
        >
          <FluentSearchIcon className="size-4" />
          {searchQuery && !isSearchExpanded && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]" aria-hidden="true" />}
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
              placeholder="Search"
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
                aria-label="Clear search"
                title="Clear search"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded text-[#70757d] outline-none hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#a5abb4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSearchExpanded(false)}
              aria-label="Collapse tab search"
              title="Collapse tab search"
              className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-[#70757d] outline-none hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#a5abb4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {showTabs && (
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
                onClick={() => onSelectTab(tab.id)}
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
                  onClick={() => onCloseTab(tab.id)}
                  className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-[#70757d] outline-none transition-colors hover:bg-black/[0.08] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#a5abb4] dark:hover:bg-white/[0.1] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          );
          })}
        </div>
      )}
      {showTabs && (
        <button
          type="button"
          aria-label="Open new tab"
        title="Open new tab"
        onClick={onCreateTab}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#5f6368] outline-none transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#b5bbc4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
      >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
