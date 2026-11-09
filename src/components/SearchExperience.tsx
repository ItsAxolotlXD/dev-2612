import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Award, Camera, ChevronRight, CircleUserRound, Gamepad2, Heart, House, Image as ImageIcon, Images, MessageCircle, MonitorPlay, MoreHorizontal, Newspaper, Paintbrush, Play, Radio, Search, Settings, Sparkles, StickyNote, Trophy, Tv, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getAppPortalTarget } from '../utils/appPortal';
import type { SearchAspectItem } from './TopBar';
import { Fluent3DSearchIcon } from './Fluent3DIcons';

interface SearchExperienceProps {
  isOpen: boolean;
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

const quizAnswers = ['Maureen Connolly', 'Helen Wills', 'Billie Jean King'];

const dashboardIcons: Record<string, { Icon: LucideIcon; color: string }> = {
  'page-home': { Icon: House, color: 'text-amber-200' },
  'page-watch': { Icon: Play, color: 'text-sky-200' },
  'page-news': { Icon: Newspaper, color: 'text-cyan-200' },
  'page-channels': { Icon: Radio, color: 'text-rose-200' },
  'page-favs': { Icon: Heart, color: 'text-pink-300' },
  'page-craftmine': { Icon: Gamepad2, color: 'text-emerald-200' },
  'page-photopea': { Icon: ImageIcon, color: 'text-violet-200' },
  'page-gallery': { Icon: Images, color: 'text-cyan-200' },
  'page-draws': { Icon: Paintbrush, color: 'text-orange-200' },
  'page-notes': { Icon: StickyNote, color: 'text-yellow-200' },
  'page-screenbox': { Icon: MonitorPlay, color: 'text-violet-200' },
  'page-camera': { Icon: Camera, color: 'text-teal-200' },
  'page-settings': { Icon: Settings, color: 'text-slate-200' },
  'tool-sticky': { Icon: StickyNote, color: 'text-yellow-200' },
  'tool-tts': { Icon: Play, color: 'text-sky-200' },
  'tool-findwords': { Icon: Search, color: 'text-cyan-200' },
  'tool-addstream': { Icon: Tv, color: 'text-rose-200' },
  'tool-discord': { Icon: MessageCircle, color: 'text-indigo-200' },
  'trending-vtv1-hd': { Icon: Tv, color: 'text-sky-200' },
  'trending-craftmine': { Icon: Gamepad2, color: 'text-emerald-200' },
  'trending-memories': { Icon: Images, color: 'text-cyan-200' },
  'trending-settings': { Icon: Settings, color: 'text-slate-200' },
};

export const SearchExperience: React.FC<SearchExperienceProps> = ({
  isOpen,
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
  const [today, setToday] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const hasQuery = query.trim().length > 0;
  const visibleResults = useMemo(() => results.slice(0, 12), [results]);

  useEffect(() => {
    setToday(new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date()));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAnswer(null);
      return;
    }

    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
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

  const renderDashboardIcon = (item: SearchAspectItem, isLarge = false) => {
    const dashboardIcon = dashboardIcons[item.id];
    if (!dashboardIcon) return renderResultIcon(item);
    const Icon = dashboardIcon.Icon;
    return <Icon className={`${isLarge ? 'size-6' : 'size-5'} ${dashboardIcon.color}`} strokeWidth={1.9} aria-hidden="true" />;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  const renderAppTile = (item: SearchAspectItem) => (
    <button
      key={item.id}
      type="button"
      aria-label={item.title}
      onClick={() => onSelectResult(item)}
      className="group flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.035] px-1.5 py-1 text-center transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93d7ff]"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.08] [&>div]:!h-8 [&>div]:!w-8 [&>div>svg]:!h-7 [&>div>svg]:!w-7 [&>div>img]:!h-7 [&>div>img]:!w-7">
        {renderDashboardIcon(item, true)}
      </span>
      <span className="max-w-full truncate text-[10px] font-medium text-white/90">{item.id === 'tool-tts' ? 'Read aloud' : item.id === 'tool-addstream' ? 'Add stream' : item.title}</span>
    </button>
  );

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-experience-backdrop"
          data-search-experience="true"
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-2.5 backdrop-blur-[3px] sm:p-3"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-experience-title"
            onKeyDown={handleDialogKeyDown}
            initial={shouldReduceMotion ? { y: 0 } : { y: '100%' }}
            animate={{ y: 0 }}
            exit={shouldReduceMotion ? { y: 0 } : { y: '100%' }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative flex h-[min(820px,calc(100dvh-20px))] w-[min(1240px,calc(100vw-20px))] flex-col overflow-hidden rounded-[22px] border border-white/[0.12] bg-[#25282c] text-white shadow-[0_32px_100px_rgba(0,0,0,0.6)]"
          >
            <div className="relative z-10 flex min-h-0 flex-1 flex-col p-3 sm:p-4 md:p-4">
              <h2 id="search-experience-title" className="sr-only">Search experience</h2>
              <form
                role="search"
                onSubmit={handleSubmit}
                className="flex h-12 shrink-0 items-center gap-3 rounded-full border border-white/[0.1] bg-[#30343a] px-4 shadow-sm shadow-black/20 sm:h-14 sm:px-5"
              >
                <Fluent3DSearchIcon className="size-6 shrink-0" aria-hidden="true" />
                <label htmlFor="search-experience-input" className="sr-only">Search apps, settings, files, and the web</label>
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
                  placeholder="Type here to search"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/55 sm:text-[15px]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => onQueryChange('')}
                    aria-label="Clear search"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close search"
                  title="Close search"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </form>

              <div className="mt-3 flex min-h-0 flex-1 gap-4 sm:mt-4 sm:gap-6">
                <aside className="hidden w-[min(29vw,260px)] shrink-0 overflow-y-auto pr-2 md:block">
                  <h2 className="mb-3 px-1 text-sm font-semibold text-white/95">Suggested</h2>
                  <div className="space-y-1">
                    {suggestedItems.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectResult(item)}
                        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium text-white/90 transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center [&>div]:!h-7 [&>div]:!w-7 [&>div>svg]:!h-6 [&>div>svg]:!w-6 [&>div>img]:!h-6 [&>div>img]:!w-6">
                          {renderDashboardIcon(item)}
                        </span>
                        <span className="truncate">{item.title}</span>
                      </button>
                    ))}
                  </div>
                </aside>

                <main className="min-w-0 flex-1 overflow-y-auto pr-1">
                  <header className="mb-3 flex min-h-8 items-center justify-between gap-3 px-1">
                    <p className="text-[13px] font-semibold tracking-[0.01em] text-white/90">
                      Today <span className="mx-1.5 text-white/60" aria-hidden="true">•</span> {today || 'Today'}
                    </p>
                    <div className="flex items-center gap-2 text-white/75" aria-label="Search dashboard">
                      <Sparkles className="size-4 text-amber-200" aria-hidden="true" />
                      <span className="hidden text-[11px] font-medium sm:inline">Search hub</span>
                      <span className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.08]">
                        <CircleUserRound className="size-4" aria-hidden="true" />
                      </span>
                      <MoreHorizontal className="size-5" aria-hidden="true" />
                    </div>
                  </header>

                  {hasQuery ? (
                    <section aria-labelledby="search-experience-results-title" className="pb-5">
                      <div className="mb-3 flex items-center justify-between gap-3 px-1">
                        <h2 id="search-experience-results-title" className="text-sm font-semibold text-white/95">
                          Results for &ldquo;{query.trim()}&rdquo;
                        </h2>
                        <span className="text-xs text-white/60">{results.length}</span>
                      </div>
                      {visibleResults.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 backdrop-blur-md">
                          {visibleResults.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => onSelectResult(item)}
                              className="flex min-h-[64px] w-full items-center gap-3 border-b border-white/[0.07] px-3 text-left last:border-b-0 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 sm:px-4"
                            >
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] [&>div]:!h-9 [&>div]:!w-9 [&>div>svg]:!h-8 [&>div>svg]:!w-8 [&>div>img]:!h-8 [&>div>img]:!w-8">
                                {renderResultIcon(item)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-white/95">{item.title}</span>
                                {item.subtitle && <span className="mt-0.5 block truncate text-xs text-white/60">{item.subtitle}</span>}
                              </span>
                              <ArrowUpRight className="size-4 shrink-0 text-white/45" aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/[0.08] bg-black/20 px-5 py-10 text-center text-sm text-white/70" aria-live="polite">
                          No results found. Try another search.
                        </div>
                      )}
                    </section>
                  ) : (
                    <div className="space-y-4 pb-5 sm:space-y-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <article className="group relative flex h-[236px] flex-col justify-end overflow-hidden rounded-xl border border-white/[0.1] bg-black/25">
                          <img
                            src="/search-experience/river-city-at-dusk.png"
                            alt="An old riverside city and bridge glowing at dusk"
                            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" aria-hidden="true" />
                          <div className="relative z-10 p-4 sm:p-5">
                            <p className="mb-1 text-[11px] font-semibold text-white/75">Image of the day</p>
                            <h2 className="max-w-[22ch] text-[18px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[20px]">
                              A quiet evening over the old town
                            </h2>
                          </div>
                        </article>

                        <article className="flex h-[236px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#30343a]/65 backdrop-blur-md">
                          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5 sm:px-5">
                            <div>
                              <p className="text-[11px] font-semibold text-white/65">Daily quiz</p>
                              <h2 className="mt-1 text-[13px] font-semibold leading-snug text-white sm:text-[14px]">
                                Who completed the first calendar-year Grand Slam?
                              </h2>
                            </div>
                            <Trophy className="mt-1 size-4 shrink-0 text-amber-200" aria-hidden="true" />
                          </div>
                          <div className="flex flex-1 flex-col justify-center gap-2 p-3 sm:p-4">
                            {quizAnswers.map((answer) => {
                              const isSelected = selectedAnswer === answer;
                              const isCorrectAnswer = answer === 'Maureen Connolly';
                              return (
                                <button
                                  key={answer}
                                  type="button"
                                  onClick={() => setSelectedAnswer(answer)}
                                  aria-pressed={isSelected}
                                  className={`min-h-9 rounded-full border px-3 text-left text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                                    isSelected
                                      ? isCorrectAnswer
                                        ? 'border-emerald-200/60 bg-emerald-300/20 text-white'
                                        : 'border-rose-200/50 bg-rose-300/15 text-white'
                                      : 'border-white/[0.1] bg-white/[0.045] text-white/90 hover:bg-white/[0.1]'
                                  }`}
                                >
                                  <span className="flex items-center justify-between gap-2">
                                    {answer}
                                    {isSelected && isCorrectAnswer && <Award className="size-4 shrink-0 text-emerald-200" aria-hidden="true" />}
                                  </span>
                                </button>
                              );
                            })}
                            {selectedAnswer && (
                              <p className={`px-1 text-[11px] ${selectedAnswer === 'Maureen Connolly' ? 'text-emerald-100' : 'text-white/70'}`} aria-live="polite">
                                {selectedAnswer === 'Maureen Connolly'
                                  ? 'Correct — she completed the Grand Slam in 1953.'
                                  : 'Not quite. Give it another try.'}
                              </p>
                            )}
                          </div>
                        </article>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <section aria-labelledby="search-experience-apps-title" className="rounded-xl border border-white/[0.08] bg-[#30343a]/60 p-3.5 backdrop-blur-md sm:p-4">
                          <div className="mb-2.5 flex items-center justify-between px-1">
                            <h2 id="search-experience-apps-title" className="text-[13px] font-medium text-white/80">Top apps</h2>
                            <ChevronRight className="size-4 text-white/45" aria-hidden="true" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {topAppItems.slice(0, 4).map(renderAppTile)}
                          </div>
                        </section>

                        <section aria-labelledby="search-experience-tools-title" className="rounded-xl border border-white/[0.08] bg-[#30343a]/60 p-3.5 backdrop-blur-md sm:p-4">
                          <div className="mb-2.5 flex items-center justify-between px-1">
                            <h2 id="search-experience-tools-title" className="text-[13px] font-medium text-white/80">Tools & shortcuts</h2>
                            <Sparkles className="size-4 text-sky-200/80" aria-hidden="true" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {toolItems.slice(0, 4).map(renderAppTile)}
                          </div>
                        </section>
                      </div>

                      <section aria-labelledby="search-experience-trending-title" className="rounded-xl border border-white/[0.08] bg-[#30343a]/60 p-3.5 backdrop-blur-md sm:p-4">
                        <div className="mb-2.5 flex items-center justify-between px-1">
                          <h2 id="search-experience-trending-title" className="text-[13px] font-medium text-white/80">Trending searches</h2>
                          <MoreHorizontal className="size-4 text-white/55" aria-hidden="true" />
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {trendingItems.slice(0, 4).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => onSelectResult(item)}
                              className="flex min-h-11 items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-left text-[12px] text-white/85 transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                            >
                              <span className="flex size-7 shrink-0 items-center justify-center [&>div]:!h-7 [&>div]:!w-7 [&>div>svg]:!h-6 [&>div>svg]:!w-6 [&>div>img]:!h-6 [&>div>img]:!w-6">
                                {renderDashboardIcon(item)}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{item.title}</span>
                              <ChevronRight className="size-3.5 shrink-0 text-white/45" aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}
                </main>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  const portalTarget = getAppPortalTarget();
  return portalTarget ? createPortal(panel, portalTarget) : null;
};
