import React from 'react';
import { Plus, X } from 'lucide-react';

export interface AppTab {
  id: number;
  route: string;
}

interface AppTabsBarProps {
  tabs: AppTab[];
  activeTabId: number;
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

export const AppTabsBar: React.FC<AppTabsBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onCloseTab,
}) => {
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

  return (
    <div
      role="tablist"
      aria-label="Open app tabs"
      className="sticky top-0 z-30 flex h-11 w-full shrink-0 items-center gap-1 border-b border-black/[0.08] bg-[#f3f3f3]/95 px-2 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#1b1f24]/95"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
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
                className="min-w-0 flex-1 truncate rounded-l-md px-3 py-2 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff]"
              >
                {title}
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
      <button
        type="button"
        aria-label="Open new tab"
        title="Open new tab"
        onClick={onCreateTab}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#5f6368] outline-none transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-[#b5bbc4] dark:hover:bg-white/[0.08] dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
};
