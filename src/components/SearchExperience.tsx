import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { getAppPortalTarget } from '../utils/appPortal';
import type { SearchAspectItem } from './TopBar';

interface SearchExperienceProps {
  isOpen: boolean;
  isTopBarBottom?: boolean;
  query: string;
  results: SearchAspectItem[];
  suggestedItems: SearchAspectItem[];
  topAppItems: SearchAspectItem[];
  toolItems: SearchAspectItem[];
  trendingItems: SearchAspectItem[];
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onSelectResult: (item: SearchAspectItem) => void;
  onClose: () => void;
  renderResultIcon: (item: SearchAspectItem) => React.ReactNode;
}

const formatRelativeAge = (timestamp?: number): string | null => {
  if (!timestamp) return null;
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
};

const getDefaultCategoryLabel = (type: SearchAspectItem['type']): string => {
  switch (type) {
    case 'page':
      return 'App';
    case 'setting':
    case 'setting-toggle':
    case 'setting-action':
      return 'System settings';
    case 'tool':
      return 'System';
    case 'channel':
      return 'Live TV';
    case 'news':
      return 'Feed';
    case 'note':
      return 'Notes';
    case 'gallery':
      return 'Files';
    case 'web-search':
      return 'Web search';
    case 'history':
      return 'Recent';
    default:
      return 'App';
  }
};

const formatItemMetadata = (item: SearchAspectItem): string => {
  const age = formatRelativeAge(item.timestamp);
  const label = item.subtitle?.trim() || getDefaultCategoryLabel(item.type);
  if (age && !label.toLowerCase().includes(age.toLowerCase())) {
    return `${age} • ${label}`;
  }
  return label;
};

export const SearchExperience: React.FC<SearchExperienceProps> = ({
  isOpen,
  isTopBarBottom = true,
  query,
  results,
  suggestedItems,
  topAppItems,
  toolItems,
  trendingItems,
  onQueryChange,
  onSubmit,
  onSelectResult,
  onClose,
  renderResultIcon,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const hasQuery = query.trim().length > 0;

  const idleItems = useMemo(() => {
    const merged: SearchAspectItem[] = [];
    const seen = new Set<string>();
    const sources = [...results, ...suggestedItems, ...topAppItems, ...toolItems, ...trendingItems];

    for (const item of sources) {
      const key = item.title.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 7) break;
    }

    return merged;
  }, [results, suggestedItems, topAppItems, toolItems, trendingItems]);

  const listItems = useMemo(
    () => (hasQuery ? results.slice(0, 10) : idleItems),
    [hasQuery, results, idleItems]
  );

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement.current?.isConnected) {
        previouslyFocusedElement.current.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onClose]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasQuery && listItems.length > 0) {
      onSelectResult(listItems[0]);
      return;
    }
    onSubmit();
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements?.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  };

  const renderLeadingIcon = (item: SearchAspectItem) => {
    if ((item.type === 'history' || item.type === 'web-search') && !item.logo) {
      return (
        <Search
          className="size-[18px] text-[#374151] dark:text-white/85"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      );
    }
    return (
      <span className="flex size-7 shrink-0 items-center justify-center [&>div]:!h-7 [&>div]:!w-7 [&>div>svg]:!h-6 [&>div>svg]:!w-6 [&>div>img]:!h-6 [&>div>img]:!w-6 [&>img]:!h-6 [&>img]:!w-6 [&>svg]:!h-5 [&>svg]:!w-5">
        {renderResultIcon(item)}
      </span>
    );
  };

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-experience-backdrop"
          data-search-experience="true"
          className="fixed inset-0 z-[2147483647] bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div
            className={`pointer-events-none fixed inset-x-0 flex justify-center overflow-hidden px-3 ${
              isTopBarBottom
                ? 'top-0 bottom-[44px] items-end pb-[10px]'
                : 'top-[44px] bottom-0 items-start pt-[10px]'
            }`}
          >
            <motion.section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="search-experience-title"
              onKeyDown={handleDialogKeyDown}
              initial={
                shouldReduceMotion
                  ? { y: 0 }
                  : { y: isTopBarBottom ? 'calc(100% + 24px)' : 'calc(-100% - 24px)' }
              }
              animate={{ y: 0 }}
              exit={
                shouldReduceMotion
                  ? { y: 0 }
                  : { y: isTopBarBottom ? 'calc(100% + 24px)' : 'calc(-100% - 24px)' }
              }
              transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto relative flex w-[min(430px,calc(100vw-24px))] max-h-[min(540px,calc(100dvh-72px))] overflow-hidden rounded-[14px] border border-black/[0.08] bg-[#eef3f9]/85 text-[#111827] shadow-[0_24px_64px_rgba(0,0,0,0.22)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#23272d]/88 dark:text-white dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)] ${
                isTopBarBottom ? 'flex-col' : 'flex-col-reverse'
              }`}
            >
            <h2 id="search-experience-title" className="sr-only">
              Search experience
            </h2>

            <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 space-y-0.5 sidebar-scroller">
              {listItems.length > 0 ? (
                listItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectResult(item)}
                    className="flex w-full cursor-pointer items-center gap-3.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-black/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4] dark:hover:bg-white/[0.07] dark:focus-visible:ring-[#4cc2ff]"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center">
                      {renderLeadingIcon(item)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-normal leading-[1.35] text-[#111827] dark:text-white/95">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] leading-[1.3] text-[#5f6368] dark:text-white/55">
                        {formatItemMetadata(item)}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div
                  className="px-4 py-8 text-center text-[13px] text-[#5f6368] dark:text-white/60"
                  aria-live="polite"
                >
                  No results found. Try another search.
                </div>
              )}
            </div>

            <form
              role="search"
              onSubmit={handleSubmit}
              className={`flex min-h-[78px] shrink-0 flex-col justify-start bg-white px-4 pt-3.5 pb-4 dark:bg-[#2c3037] ${
                isTopBarBottom
                  ? 'border-t border-black/[0.06] dark:border-white/[0.08]'
                  : 'border-b border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <label htmlFor="search-experience-input" className="sr-only">
                Search apps, settings, files, and the web
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  id="search-experience-input"
                  type="text"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Search"
                  className="min-w-0 flex-1 bg-transparent text-[14px] leading-snug text-[#111827] outline-none placeholder:text-[#6b7280] dark:text-white dark:placeholder:text-white/55"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => onQueryChange('')}
                    aria-label="Clear search"
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>
            </motion.section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  const portalTarget = getAppPortalTarget();
  return portalTarget ? createPortal(panel, portalTarget) : null;
};
