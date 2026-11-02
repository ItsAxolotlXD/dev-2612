import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AppWindow, FileText, Search, Settings, X } from 'lucide-react';
import type { SearchAspectItem } from './TopBar';

type SearchPaneCategory = 'apps' | 'settings' | 'files';

const categories: {
  id: SearchPaneCategory;
  label: string;
  Icon: typeof AppWindow;
}[] = [
  { id: 'apps', label: 'Apps', Icon: AppWindow },
  { id: 'settings', label: 'Settings', Icon: Settings },
  { id: 'files', label: 'Files', Icon: FileText },
];

const getItemCategory = (item: SearchAspectItem): SearchPaneCategory => {
  if (['setting', 'setting-toggle', 'setting-action'].includes(item.type)) {
    return 'settings';
  }

  if (
    item.type === 'note' ||
    item.type === 'gallery' ||
    item.id.startsWith('gallery-item-') ||
    /\b(file|files|gallery|document|media)\b/i.test(item.subtitle || '')
  ) {
    return 'files';
  }

  return 'apps';
};

interface SearchPaneProps {
  isOpen: boolean;
  query: string;
  results: SearchAspectItem[];
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onSelectResult: (item: SearchAspectItem) => void;
  onClose: () => void;
  renderResultIcon: (item: SearchAspectItem) => React.ReactNode;
}

export const SearchPane: React.FC<SearchPaneProps> = ({
  isOpen,
  query,
  results,
  onQueryChange,
  onSubmit,
  onSelectResult,
  onClose,
  renderResultIcon,
}) => {
  const [activeCategory, setActiveCategory] = useState<SearchPaneCategory>('apps');
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const selectedCategory = categories.find((category) => category.id === activeCategory) ?? categories[0];
  const filteredResults = useMemo(
    () => results.filter((item) => getItemCategory(item) === activeCategory),
    [activeCategory, results]
  );

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const pane = (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="topbar-search-pane"
          data-search-pane="true"
          role="region"
          aria-labelledby="topbar-search-pane-title"
          initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%', opacity: 1 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%', opacity: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.12 }
              : { type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }
          }
          className="fixed inset-y-0 right-0 z-[2147483647] flex h-[100dvh] w-[min(360px,100vw)] flex-col overflow-y-auto border-l border-white/10 bg-[#1f0062] text-white shadow-[-18px_0_48px_rgba(0,0,0,0.3)] sidebar-scroller"
          style={{
            paddingTop: 'max(28px, env(safe-area-inset-top))',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="px-8 sm:px-10">
            <div className="mb-5 flex items-center justify-between">
              <h2
                id="topbar-search-pane-title"
                className="text-[28px] font-normal leading-none tracking-[-0.025em]"
              >
                Search
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search pane"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-2 text-[14px] font-medium text-white/90">
              {selectedCategory.label}
            </div>
            <form
              role="search"
              onSubmit={handleSubmit}
              className="flex h-[38px] w-full items-stretch overflow-hidden bg-white"
            >
              <input
                ref={inputRef}
                id="search-pane-input"
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`Search ${selectedCategory.label.toLowerCase()}`}
                placeholder="Type to search"
                className="min-w-0 flex-1 px-2.5 text-[14px] text-[#17121f] placeholder:text-[#7a7485]"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex w-[38px] shrink-0 items-center justify-center bg-[#5423c7] text-white transition-colors hover:bg-[#6536d4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              >
                <Search className="h-[19px] w-[19px]" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-7 flex flex-col" role="group" aria-label="Search categories">
              {categories.map(({ id, label, Icon }) => {
                const isActive = activeCategory === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory(id)}
                    className={`-mx-3 flex min-h-[58px] items-center gap-3 px-3 text-left text-[14px] font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 ${
                      isActive ? 'bg-[#4d1eb5]' : 'hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center bg-[#5a35c1] text-white shadow-sm">
                      <Icon className="h-[25px] w-[25px]" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-white/20 pt-3">
              <div className="mb-2 flex items-center justify-between text-[12px] text-white/65">
                <span>{query.trim() ? 'Results' : 'Suggested'}</span>
                {filteredResults.length > 0 && <span>{filteredResults.length}</span>}
              </div>

              {filteredResults.length > 0 ? (
                <div className="-mx-2 flex flex-col">
                  {filteredResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex min-h-[58px] items-center gap-2 px-2 transition-colors hover:bg-white/[0.07]"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectResult(item)}
                        title={item.title}
                        className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
                      >
                        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center bg-white/[0.08]">
                          {renderResultIcon(item)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] leading-tight text-white/95">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="mt-1 block truncate text-[11px] leading-tight text-white/60">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                      </button>

                      {item.type === 'setting-toggle' && item.customToggle && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.customToggle.checked}
                          aria-label={`Toggle ${item.title}`}
                          onClick={item.customToggle.onToggle}
                          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                            item.customToggle.checked ? 'bg-[#bba2ff]' : 'bg-white/25'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                              item.customToggle.checked ? 'translate-x-[18px]' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      )}

                      {item.customAction && (
                        <button
                          type="button"
                          onClick={() => {
                            item.customAction?.onAction();
                            onClose();
                          }}
                          className="shrink-0 border border-white/30 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                        >
                          {item.customAction.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-5 text-[13px] leading-relaxed text-white/65" aria-live="polite">
                  {query.trim()
                    ? `No ${selectedCategory.label.toLowerCase()} found for “${query.trim()}”.`
                    : `Type a search to find ${selectedCategory.label.toLowerCase()}.`}
                </p>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );

  return typeof document === 'undefined' ? null : createPortal(pane, document.body);
};
