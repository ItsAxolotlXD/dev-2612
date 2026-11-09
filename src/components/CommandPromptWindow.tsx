import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { Terminal, X } from 'lucide-react';
import { CommandPrompt } from '../pages/CommandPrompt';

interface CommandPromptWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onOpenAbout: () => void;
  onOpenLegacySearch: () => void;
}

export const CommandPromptWindow = ({
  isOpen,
  onClose,
  onSearch,
  onOpenAbout,
  onOpenLegacySearch,
}: CommandPromptWindowProps) => {
  const dragAreaRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();
  const prefersReducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById('command-prompt-input')?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [isOpen, onClose]);

  const handleTitlebarPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest('button')) return;
    event.preventDefault();
    dragControls.start(event.nativeEvent);
  };

  return (
    <div
      ref={dragAreaRef}
      aria-hidden={!isOpen}
      className="pointer-events-none fixed inset-0 z-[2147483647] flex items-center justify-center overflow-hidden p-2 sm:p-4"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.section
            id="command-prompt-window"
            role="dialog"
            aria-modal={false}
            aria-labelledby="command-prompt-window-title"
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={dragAreaRef}
            dragElastic={0}
            dragMomentum={false}
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex h-[min(680px,calc(100dvh-1rem))] min-h-[420px] w-full max-w-[820px] flex-col overflow-hidden rounded-[8px] border border-black/15 bg-[#f2f2f2] shadow-[0_24px_72px_rgba(0,0,0,0.42)] dark:border-white/15 dark:bg-[#111821]"
            style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif" }}
          >
            <header
              onPointerDown={handleTitlebarPointerDown}
              className="flex h-9 shrink-0 touch-none select-none cursor-grab items-center justify-between border-b border-[#dedede] bg-[#fafafa] pl-3 active:cursor-grabbing dark:border-white/10 dark:bg-[#1b1f24]"
            >
              <span id="command-prompt-window-title" className="flex min-w-0 items-center gap-2 truncate text-[12px] font-normal text-[#171717] dark:text-slate-100">
                <Terminal className="size-4 shrink-0 text-[#0078d4]" aria-hidden="true" />
                Command Prompt
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Command Prompt"
                className="flex h-9 w-11 shrink-0 cursor-pointer items-center justify-center text-[#222] transition-colors hover:bg-[#e81123] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4] dark:text-white dark:focus-visible:ring-[#4cc2ff]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1">
              <CommandPrompt
                onSearch={onSearch}
                onOpenAbout={onOpenAbout}
                onOpenLegacySearch={onOpenLegacySearch}
                isWindowContent
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
