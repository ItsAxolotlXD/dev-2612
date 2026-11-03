import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

interface SparkverAboutWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SparkverAboutWindow: React.FC<SparkverAboutWindowProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const okButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('header button');
      const lastButton = okButtonRef.current;

      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstButton?.focus();
      } else if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton?.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    okButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence initial={false}>
      {isOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-6">
          <motion.div
            key="sparkver-about-backdrop"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}
            className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-[1px]"
          />

          <motion.div
            key="sparkver-about-window"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sparkver-about-title"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 5 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 360, damping: 32, mass: 0.85 }
            }
            className="relative z-10 flex max-h-[calc(100dvh-24px)] min-h-[350px] w-full max-w-[460px] flex-col overflow-hidden rounded-[7px] border border-[#c7c7c7] bg-[#f1f1f1] text-[#171717] shadow-[0_24px_64px_rgba(0,0,0,0.42)]"
          >
            <header className="flex h-8 shrink-0 items-center justify-between bg-[#f3f3f3] pl-3">
              <span className="text-[12px] font-normal text-[#2b2b2b]">About Sparkle</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close About Sparkle"
                title="Close"
                className="flex h-8 w-10 items-center justify-center text-[#222] transition-colors hover:bg-[#c42b1c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="flex min-h-[88px] shrink-0 items-center gap-4 px-6 py-4">
              <img
                src="/icons/monochrome-512.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-[54px] w-[54px] shrink-0 object-contain"
                style={{ filter: 'brightness(0)' }}
              />
              <h1
                id="sparkver-about-title"
                className="text-[30px] font-light leading-none tracking-[-0.04em] text-[#e6005a] sm:text-[34px]"
              >
                Sparkle by LAC
              </h1>
            </div>

            <div className="mx-4 h-px shrink-0 bg-[#9c9c9c]" />

            <div className="flex-1 space-y-4 overflow-y-auto px-8 py-4 text-[12px] leading-[1.45] text-[#111827]">
              <div className="space-y-1.5">
                <p>Version Dev Test (Build 26103.12.fs_dev_release)</p>
                <p>(C) LAC Project. All rights reserved.</p>
              </div>
              <p className="max-w-[360px]">
                This development build is provided for testing and evaluation. Features and details may change as work continues.
              </p>
            </div>

            <footer className="flex shrink-0 justify-end px-4 pb-4 pt-1">
              <button
                ref={okButtonRef}
                type="button"
                onClick={onClose}
                className="h-7 min-w-[74px] rounded-[3px] border border-[#0078d4] bg-[#f9f9f9] px-3 text-[12px] text-[#111827] transition-colors hover:bg-[#e8f3fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]"
              >
                OK
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
