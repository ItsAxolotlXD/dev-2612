import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SparkverAboutWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SparkverAboutWindow = ({ isOpen, onClose }: SparkverAboutWindowProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const okButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = window.requestAnimationFrame(() => okButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableButtons = [closeButtonRef.current, okButtonRef.current].filter(
        (button): button is HTMLButtonElement => button !== null,
      );
      const firstButton = focusableButtons[0];
      const lastButton = focusableButtons[focusableButtons.length - 1];

      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault();
        lastButton?.focus();
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault();
        firstButton?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div id="sparkver-about-window" className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sparkver-about-title"
        className="w-full max-w-[460px] overflow-hidden rounded-[7px] border border-[#c9c9c9] bg-[#f2f2f2] text-[#171717] shadow-[0_24px_72px_rgba(0,0,0,0.42)]"
        style={{ fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif" }}
      >
        <header id="sparkver-about-titlebar" className="flex h-9 items-center justify-between border-b border-[#dedede] bg-[#fafafa] pl-3">
          <span className="truncate text-[12px] font-normal">About Sparkle</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close About Sparkle"
            className="flex h-9 w-11 shrink-0 items-center justify-center text-[#222] transition-colors hover:bg-[#e81123] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="px-5 pb-5 pt-5 sm:px-6">
          <div className="flex min-h-[64px] items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[5px] bg-[#21133a] p-2.5">
              <img
                src="/icons/monochrome-512.png"
                alt="Sparkle logo"
                draggable={false}
                className="h-full w-full object-contain"
              />
            </div>
            <h1
              id="sparkver-about-title"
              className="text-[29px] font-normal leading-tight tracking-[-0.04em] sm:text-[32px]"
            >
              Sparkle by LAC
            </h1>
          </div>

          <div className="my-4 h-px w-full bg-[#9b9b9b]" />

          <div className="space-y-3 px-1 text-[12px] leading-[1.5]">
            <p>Version Dev Test (Build 26103.12.fs_dev_release)</p>
            <p>© LAC Project. All rights reserved.</p>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              id="sparkver-about-ok"
              ref={okButtonRef}
              type="button"
              onClick={onClose}
              className="h-7 min-w-[76px] rounded-[3px] border border-[#0078d4] bg-[#f8f8f8] px-4 text-[12px] text-[#171717] shadow-[inset_0_0_0_1px_#ffffff] transition-colors hover:bg-[#eaf4fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1"
            >
              OK
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
