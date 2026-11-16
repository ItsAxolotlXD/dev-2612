import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUp, ExternalLink, RotateCcw, Terminal, X } from 'lucide-react';
import { getAppPortalTarget } from '../utils/appPortal';
import { useSettings } from '../hooks/useSettings';
import { useDrivers } from '../hooks/useDrivers';
import {
  EXPERIMENTS,
  executeSparkleCommand,
  type CommandResult,
} from '../utils/commandRunner';

interface DirectCommandExperienceProps {
  isOpen: boolean;
  isTopBarBottom?: boolean;
  onSearch: (query: string) => void;
  onOpenAbout: () => void;
  onOpenLegacySearch: () => void;
  onOpenViveToolGui: () => void;
  onOpenFullCommandPrompt?: () => void;
  onClose: () => void;
}

type TranscriptEntry = {
  id: number;
  command: string;
  result: Exclude<CommandResult, { kind: 'clear' }>;
};

interface QuickCommandItem {
  id: string;
  command: string;
  description: string;
  category: string;
  fillOnly?: boolean;
}

export const DirectCommandExperience: React.FC<DirectCommandExperienceProps> = ({
  isOpen,
  isTopBarBottom = true,
  onSearch,
  onOpenAbout,
  onOpenLegacySearch,
  onOpenViveToolGui,
  onOpenFullCommandPrompt,
  onClose,
}) => {
  const { settings, updateSetting } = useSettings();
  const {
    resolutionStatus,
    visualStatus,
    installResolutionDriver,
    rollbackResolutionDriver,
    installVisualDriver,
    rollbackVisualDriver,
  } = useDrivers();

  const [command, setCommand] = useState('');
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const nextEntryId = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  const quickCommands: QuickCommandItem[] = useMemo(() => {
    const wallpaperAction = settings.isWallpaperAllowed ? 'disable' : 'enable';
    const baseItems: QuickCommandItem[] = [
      {
        id: 'quick-wallpaper',
        command: `/vivetool /${wallpaperAction} /id:519482736 /velocity`,
        description: `${settings.isWallpaperAllowed ? 'Disable' : 'Enable'} IsWallpaperAllowed (App wallpaper)`,
        category: 'Velocity',
      },
      {
        id: 'quick-list',
        command: '/vivetool /list',
        description: 'List all experimental features & 9-digit IDs',
        category: 'viVeTool',
      },
      {
        id: 'quick-gui',
        command: '/vivetool /gui',
        description: 'Open ViveTool GUI toggles',
        category: 'viVeTool',
      },
      {
        id: 'quick-sparkver',
        command: '/sparkver',
        description: 'Open About Sparkle version dialog',
        category: 'System',
      },
      {
        id: 'quick-search',
        command: '/search ',
        description: 'Search Sparkle with keyword',
        category: 'Navigation',
        fillOnly: true,
      },
      {
        id: 'quick-legacy-search',
        command: '/debug legacysearch',
        description: 'Open legacy search page',
        category: 'Debug',
      },
      {
        id: 'quick-drivers-visuals',
        command: `/drivers /${visualStatus === 'installed' ? 'uninstall' : 'install'} /visuals`,
        description: `${visualStatus === 'installed' ? 'Uninstall' : 'Install'} Visual effects driver`,
        category: 'Drivers',
      },
      {
        id: 'quick-drivers-resolution',
        command: `/drivers /${resolutionStatus === 'installed' ? 'uninstall' : 'install'} /resolution`,
        description: `${resolutionStatus === 'installed' ? 'Uninstall' : 'Install'} Resolution driver`,
        category: 'Drivers',
      },
    ];

    const featureSuggestions: QuickCommandItem[] = EXPERIMENTS.filter(
      (exp) => exp.name !== 'IsWallpaperAllowed'
    ).map((exp) => {
      const enabled = settings[exp.settingKey];
      return {
        id: `quick-exp-${exp.id}`,
        command: `/vivetool /${enabled ? 'disable' : 'enable'} /id:${exp.id} /velocity`,
        description: `${enabled ? 'Disable' : 'Enable'} ${exp.name} (ID ${exp.id})`,
        category: 'Velocity',
      };
    });

    return [...baseItems, ...featureSuggestions];
  }, [settings, visualStatus, resolutionStatus]);

  const filteredQuickCommands = useMemo(() => {
    const q = command.trim().toLowerCase();
    if (!q) return quickCommands.slice(0, 6);
    return quickCommands
      .filter(
        (item) =>
          item.command.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [command, quickCommands]);

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

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (el && entries.length > 0) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [entries]);

  const runCommandString = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    setCommand('');
    setHistoryIndex(-1);
    setCommandHistory((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)].slice(0, 25));

    const result = executeSparkleCommand(trimmed, {
      settings,
      updateSetting,
      resolutionStatus,
      visualStatus,
      installResolutionDriver,
      rollbackResolutionDriver,
      installVisualDriver,
      rollbackVisualDriver,
      onSearch: (query) => {
        onClose();
        onSearch(query);
      },
      onOpenAbout: () => {
        onClose();
        onOpenAbout();
      },
      onOpenLegacySearch: () => {
        onClose();
        onOpenLegacySearch();
      },
      onOpenViveToolGui: () => {
        onClose();
        onOpenViveToolGui();
      },
    });

    if (result.kind === 'clear') {
      setEntries([]);
      return;
    }

    const entry: TranscriptEntry = {
      id: nextEntryId.current++,
      command: trimmed,
      result,
    };
    setEntries((prev) => [...prev, entry]);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runCommandString(command);
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

    if (event.key === 'ArrowUp' && commandHistory.length > 0) {
      event.preventDefault();
      const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIdx);
      setCommand(commandHistory[nextIdx] || '');
      return;
    }

    if (event.key === 'ArrowDown' && commandHistory.length > 0) {
      event.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommand(commandHistory[nextIdx] || '');
      }
      return;
    }

    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  };

  const handleQuickItemClick = (item: QuickCommandItem) => {
    if (item.fillOnly) {
      setCommand(item.command);
      inputRef.current?.focus();
      return;
    }
    runCommandString(item.command);
    inputRef.current?.focus();
  };

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="direct-command-experience-backdrop"
          data-search-experience="true"
          data-direct-command-experience="true"
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
              aria-labelledby="direct-command-experience-title"
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
              <h2 id="direct-command-experience-title" className="sr-only">
                Direct Command
              </h2>

              <div
                ref={scrollAreaRef}
                className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2 sidebar-scroller"
              >
                {/* Header bar inside Direct Command */}
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src="/assets/aistudio/direct_command_6240d59d.png"
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="size-4 shrink-0 object-contain"
                    />
                    <span className="truncate text-[12px] font-semibold text-[#111827] dark:text-white/90">
                      Direct Command
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {entries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEntries([])}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#5f6368] transition-colors hover:bg-black/[0.06] hover:text-[#111827] dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <RotateCcw className="size-3" aria-hidden="true" />
                        <span>Clear</span>
                      </button>
                    )}
                    {onOpenFullCommandPrompt && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenFullCommandPrompt();
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#0078d4] transition-colors hover:bg-[#0078d4]/10 dark:text-[#4cc2ff] dark:hover:bg-[#4cc2ff]/15"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        <span>Terminal</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Executed Command Transcript */}
                {entries.length > 0 && (
                  <div className="space-y-2 px-1">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[10px] border border-black/[0.06] bg-white/65 p-2.5 font-mono text-[11.5px] leading-relaxed dark:border-white/[0.08] dark:bg-[#14181f]/80"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="shrink-0 text-[#0078d4] dark:text-[#4cc2ff]">Sparkle&gt;</span>
                          <span className="break-all font-medium text-[#111827] dark:text-slate-100">
                            {entry.command}
                          </span>
                        </div>
                        {entry.result.kind === 'message' ? (
                          <p
                            className={`mt-1 break-words font-sans text-[12px] ${
                              entry.result.tone === 'error'
                                ? 'text-red-600 dark:text-[#ff8b8b]'
                                : entry.result.tone === 'success'
                                  ? 'text-[#0f7b0f] dark:text-[#8be9a7]'
                                  : 'text-[#4b5563] dark:text-slate-300'
                            }`}
                          >
                            {entry.result.message}
                          </p>
                        ) : (
                          <div className="mt-2 space-y-1 font-sans">
                            <p className="text-[11px] text-[#5f6368] dark:text-slate-400">
                              {entry.result.experiments.length} experimental features
                            </p>
                            <div className="max-h-[210px] overflow-y-auto rounded-lg border border-black/[0.08] bg-white/70 dark:border-white/10 dark:bg-black/20">
                              {entry.result.experiments.map((experiment) => (
                                <button
                                  key={experiment.id}
                                  type="button"
                                  onClick={() => {
                                    const nextCmd = `/vivetool /${experiment.enabled ? 'disable' : 'enable'} /id:${experiment.id} /velocity`;
                                    runCommandString(nextCmd);
                                  }}
                                  className="flex w-full items-center justify-between gap-2 border-t border-black/[0.05] px-2.5 py-1.5 text-left text-[11.5px] first:border-t-0 hover:bg-black/[0.04] dark:border-white/[0.06] dark:hover:bg-white/[0.06]"
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-[#111827] dark:text-slate-100">
                                      {experiment.name}
                                    </span>
                                    <span className="block font-mono text-[10px] text-[#5f6368] dark:text-slate-400">
                                      {experiment.id}
                                    </span>
                                  </span>
                                  <span
                                    className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                      experiment.enabled
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#8be9a7]'
                                        : 'bg-black/[0.05] text-[#6b7280] dark:bg-white/[0.07] dark:text-slate-400'
                                    }`}
                                  >
                                    {experiment.enabled ? 'ENABLED' : 'DISABLED'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Command Suggestions */}
                <div className="space-y-0.5">
                  <div className="px-2 pt-1 pb-0.5 text-[11px] font-medium text-[#5f6368] dark:text-white/55">
                    {command.trim() ? 'Matching commands' : 'Quick commands'}
                  </div>
                  {filteredQuickCommands.length > 0 ? (
                    filteredQuickCommands.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleQuickItemClick(item)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-black/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4] dark:hover:bg-white/[0.07] dark:focus-visible:ring-[#4cc2ff]"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-black/[0.05] text-[#0078d4] dark:bg-white/[0.08] dark:text-[#4cc2ff]">
                          <Terminal className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[12px] font-medium leading-[1.35] text-[#111827] dark:text-white/95">
                            {item.command}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] leading-[1.3] text-[#5f6368] dark:text-white/55">
                            {item.category} • {item.description}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-[12px] text-[#5f6368] dark:text-white/60">
                      Press Enter to execute <span className="font-mono">{command.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className={`flex min-h-[78px] shrink-0 flex-col justify-start bg-white px-4 pt-3.5 pb-4 dark:bg-[#2c3037] ${
                  isTopBarBottom
                    ? 'border-t border-black/[0.06] dark:border-white/[0.08]'
                    : 'border-b border-black/[0.06] dark:border-white/[0.08]'
                }`}
              >
                <label htmlFor="direct-command-input" className="sr-only">
                  Enter a Sparkle command
                </label>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-mono text-[13px] font-semibold text-[#0078d4] dark:text-[#4cc2ff]"
                  >
                    &gt;
                  </span>
                  <input
                    ref={inputRef}
                    id="direct-command-input"
                    type="text"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Type a command (e.g. /vivetool /list)"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[13.5px] leading-snug text-[#111827] outline-none placeholder:font-sans placeholder:text-[#6b7280] dark:text-white dark:placeholder:text-white/55"
                  />
                  {command && (
                    <button
                      type="button"
                      onClick={() => setCommand('')}
                      aria-label="Clear command"
                      className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-black/[0.06] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-[#4cc2ff]"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="submit"
                    aria-label="Run command"
                    disabled={!command.trim()}
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#0078d4] text-white transition-colors hover:bg-[#1689e5] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#4cc2ff] dark:text-black dark:hover:bg-[#70d0ff]"
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
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
