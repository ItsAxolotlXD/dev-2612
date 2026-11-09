import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MoreHorizontal, Plus, Search, X } from 'lucide-react';
import { WIDGET_CATALOG, type WidgetDefinition } from './widgetCatalog';
import { showAppToast } from '../utils/toast';

interface AddWidgetWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: WidgetDefinition) => void;
}

export const AddWidgetWindow = ({ isOpen, onClose, onAddWidget }: AddWidgetWindowProps) => {
  const [selectedWidgetId, setSelectedWidgetId] = useState('timer');
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const selectedWidget = WIDGET_CATALOG.find((widget) => widget.id === selectedWidgetId) ?? WIDGET_CATALOG[0];
  const SelectedIcon = selectedWidget.icon;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => titleRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[3px] sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-widget-window-title"
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96, y: prefersReducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97, y: prefersReducedMotion ? 0 : 6 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="flex max-h-[calc(100dvh-24px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[10px] border border-white/15 bg-[#20231f] text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:max-h-[min(620px,calc(100dvh-48px))]"
          >
            <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#191c19] pl-4">
              <h2 id="add-widget-window-title" ref={titleRef} tabIndex={-1} className="text-[13px] font-medium tracking-wide text-white/90 focus:outline-none">
                Add widget
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Add widget window"
                className="flex h-11 w-11 cursor-pointer items-center justify-center text-white/75 transition-colors hover:bg-rose-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)]">
              <nav aria-label="Available widgets" className="flex max-h-[220px] min-h-0 flex-col border-b border-white/[0.08] bg-[#1b1e1b] sm:max-h-none sm:border-b-0 sm:border-r">
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-1 overflow-y-auto p-2 sm:block sm:space-y-0.5">
                  {WIDGET_CATALOG.map((widget) => {
                    const Icon = widget.icon;
                    const isSelected = widget.id === selectedWidget.id;
                    return (
                      <button
                        key={widget.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedWidgetId(widget.id)}
                        className={`flex min-h-10 w-full items-center gap-2.5 rounded-[5px] px-2.5 py-1.5 text-left text-[11px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 sm:text-[13px] ${
                          isSelected ? 'bg-white/[0.09] text-white' : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${widget.accent}`} aria-hidden="true" />
                        <span className="min-w-0 whitespace-normal break-words">{widget.name}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => showAppToast('More widget collections are coming soon.')}
                  className="flex h-11 shrink-0 items-center gap-2 border-t border-white/[0.08] px-3 text-left text-[12px] text-sky-300 transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Find more widgets
                </button>
              </nav>

              <div className="flex min-h-0 flex-col items-center overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
                <div className="mb-5 text-center">
                  <SelectedIcon className={`mx-auto mb-2 h-6 w-6 ${selectedWidget.accent}`} aria-hidden="true" />
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{selectedWidget.name}</h3>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-white/55 sm:text-sm">{selectedWidget.description}</p>
                </div>

                <div className="flex min-h-[210px] w-full max-w-[430px] flex-1 items-center justify-center rounded-[10px] border border-white/[0.06] bg-[#292c29] p-5 sm:min-h-[280px]">
                  <div className="w-full max-w-[300px] rounded-[11px] border border-black/50 bg-[#222522] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.34)]">
                    <div className="mb-5 flex items-center justify-between text-sm font-semibold text-white/80">
                      <div className="flex items-center gap-2.5">
                        <SelectedIcon className={`h-4 w-4 ${selectedWidget.accent}`} aria-hidden="true" />
                        <span>{selectedWidget.name}</span>
                      </div>
                      <MoreHorizontal className="h-4 w-4 text-white/55" aria-hidden="true" />
                    </div>
                    {selectedWidget.id === 'timer' || selectedWidget.id === 'focus-session' ? (
                      <div className="flex flex-col items-center pb-1">
                        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[9px] border-white/[0.06] border-t-sky-400 border-r-sky-400">
                          <div className="text-center">
                            <div className="text-[32px] font-semibold leading-none tabular-nums">3:21</div>
                            <div className="mt-1 text-[11px] text-white/45">hrs&nbsp; mins</div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-[10px] text-white/55">
                          <span><span className="mr-1 text-amber-400">●</span>First day of school</span>
                          <span><span className="mr-1 text-sky-400">●</span>Off work</span>
                        </div>
                      </div>
                    ) : selectedWidget.id === 'photos' || selectedWidget.id === 'todays-moment' ? (
                      <div className="overflow-hidden rounded-[7px] border border-white/10">
                        <img src="/search-experience/forest-wallpaper.png" alt="Sunlit forest and mountain scenery" className="h-36 w-full object-cover" />
                        <div className="p-3 text-xs text-white/65">A favorite moment, ready for your board.</div>
                      </div>
                    ) : (
                      <div className="flex min-h-36 flex-col items-center justify-center rounded-[7px] bg-white/[0.035] p-5 text-center">
                        <SelectedIcon className={`mb-3 h-9 w-9 ${selectedWidget.accent}`} aria-hidden="true" />
                        <span className="text-sm font-medium text-white/85">{selectedWidget.name}</span>
                        <span className="mt-1 text-xs leading-relaxed text-white/45">{selectedWidget.description}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddWidget(selectedWidget)}
                  className="mt-5 inline-flex h-10 min-w-[148px] items-center justify-center gap-2 rounded-[6px] bg-sky-400 px-5 text-[13px] font-semibold text-slate-950 shadow-[0_5px_18px_rgba(56,189,248,0.18)] transition-colors hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#20231f]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add widget
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
