import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { AppToastDetail } from '../utils/toast';
import { useDrivers } from '../hooks/useDrivers';
import { TOAST_NOTIFICATION_SOUND_SRC } from '../constants/assets';

export const GlobalToast: React.FC = () => {
  const [toast, setToast] = useState<AppToastDetail | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isResolutionInstalled } = useDrivers();

  useEffect(() => {
    try {
      const audio = new Audio(TOAST_NOTIFICATION_SOUND_SRC);
      audio.preload = 'auto';
      audio.volume = 0.65;
      audioRef.current = audio;
    } catch (e) {
      console.warn('Init toast audio failed', e);
    }
  }, []);

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent<AppToastDetail>;
      if (!customEvent.detail || !customEvent.detail.message) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setToast(customEvent.detail);

      // Play Windows Notify System Generic sound
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {
            try {
              const fallbackAudio = new Audio(TOAST_NOTIFICATION_SOUND_SRC);
              fallbackAudio.volume = 0.65;
              fallbackAudio.play().catch(() => {});
            } catch {}
          });
        } else {
          const freshAudio = new Audio(TOAST_NOTIFICATION_SOUND_SRC);
          freshAudio.volume = 0.65;
          freshAudio.play().catch(() => {});
        }
      } catch (err) {
        console.warn('Toast sound play error:', err);
      }

      // Auto dismiss after 4 seconds
      timerRef.current = setTimeout(() => {
        setToast(null);
      }, 4000);
    };

    window.addEventListener('app:show-toast', handleShowToast);
    return () => {
      window.removeEventListener('app:show-toast', handleShowToast);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Split title and message if title is not explicitly provided
  let title = toast?.title || '';
  let description = '';

  if (toast) {
    if (toast.title) {
      title = toast.title;
      description = toast.message;
    } else if (toast.message.includes('\n')) {
      const lines = toast.message.split('\n');
      title = lines[0];
      description = lines.slice(1).join(' ');
    } else if (toast.message.includes('. ') && toast.message.length > 35) {
      const idx = toast.message.indexOf('. ');
      title = toast.message.slice(0, idx + 1);
      description = toast.message.slice(idx + 2);
    } else {
      title = toast.message;
      description = '';
    }
  }

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id || toast.message}
          initial={{ opacity: 0, x: 120 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 120 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 right-4 z-[99999] w-[350px] max-w-[calc(100vw-32px)] bg-[#1f1f1f] text-white px-3.5 py-3 rounded-[2px] shadow-[0_12px_36px_rgba(0,0,0,0.75)] border border-[#333333] select-none pointer-events-auto flex flex-col font-sans"
          style={{
            backgroundColor: '#1f1f1f',
            fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
          }}
        >
          {/* Header Row: App Icon + App Name ("Sparkle" / "WinFormsApp1") + Close X */}
          <div className="flex items-center justify-between text-xs text-[#cccccc]">
            <div className="flex items-center gap-2">
              {/* Windows Application Icon matching user reference image */}
              <div className="w-4 h-4 rounded-[1px] bg-[#0078d7] p-[1.5px] flex items-center justify-center shrink-0 shadow-xs">
                <div className="w-full h-full bg-white flex flex-col justify-between p-[0.5px]">
                  <div className="w-full h-[2.5px] bg-[#0078d7]" />
                  <div className="w-1.5 h-1.5 bg-[#0078d7]" />
                </div>
              </div>
              <span className="text-[12px] font-normal text-[#cccccc] tracking-normal">
                {toast.appName || 'Sparkle'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-2 text-left">
            {/* Title: Bold white text */}
            <div className="font-semibold text-white text-[13.5px] sm:text-[14px] leading-snug">
              {title}
            </div>

            {/* Subtext / Description: Secondary grey text */}
            {description ? (
              <div className="text-[12px] sm:text-[12.5px] text-[#a6a6a6] leading-normal mt-0.5">
                {description}
              </div>
            ) : null}
          </div>

          {/* Action button if provided */}
          {toast.actionLabel && toast.onAction && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="px-3 py-1 rounded-[2px] bg-[#0078d7] hover:bg-[#106ebe] text-white font-medium text-xs transition-colors cursor-pointer border-none"
              >
                {toast.actionLabel}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
