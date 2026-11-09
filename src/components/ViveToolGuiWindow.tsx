import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SlidersHorizontal, Terminal, X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

type Feature = {
  label: string;
  description: string;
  key: 'navigationMode' | 'searchColorfulExperiment' | 'widgetsFeed' | 'fluentIcons' | 'dynamicSidebarIcons';
};

const FEATURES: Feature[] = [
  { label: 'Taskbar Mode', description: 'Move navigation to a Windows 11-style bottom taskbar.', key: 'navigationMode' },
  { label: 'Search UI upgraded', description: 'Enable the upgraded search experience and colorful shortcuts.', key: 'searchColorfulExperiment' },
  { label: 'Widgets Feed', description: 'Show the live widgets feed in the navigation.', key: 'widgetsFeed' },
  { label: 'Fluent icons', description: 'Use the refreshed Fluent icon set throughout Sparkle.', key: 'fluentIcons' },
  { label: 'Dynamic sidebar icons', description: 'Let navigation icons adapt to the active view.', key: 'dynamicSidebarIcons' },
];

interface ViveToolGuiWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ViveToolGuiWindow = ({ isOpen, onClose }: ViveToolGuiWindowProps) => {
  const { settings, updateSetting } = useSettings();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => document.getElementById('vivetool-gui-taskbar')?.focus());
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

  const isEnabled = (feature: Feature) =>
    feature.key === 'navigationMode' ? settings.navigationMode === 'taskbar' : settings[feature.key];

  const toggleFeature = (feature: Feature) => {
    const enabled = isEnabled(feature);
    if (feature.key === 'navigationMode') {
      updateSetting('navigationMode', enabled ? 'sidebar' : 'taskbar');
    } else {
      updateSetting(feature.key, !enabled);
    }
  };

  return (
    <div aria-hidden={!isOpen} className="pointer-events-none fixed inset-0 z-[2147483647] flex items-center justify-center overflow-hidden p-2 sm:p-4">
      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            aria-modal={false}
            aria-labelledby="vivetool-gui-title"
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.94 }}
            className="pointer-events-auto flex max-h-[min(680px,calc(100dvh-1rem))] w-full max-w-[620px] flex-col overflow-hidden rounded-xl border border-black/15 bg-[#f4f4f4] shadow-[0_24px_72px_rgba(0,0,0,0.42)] dark:border-white/15 dark:bg-[#111821]"
          >
            <header className="flex h-11 shrink-0 items-center justify-between border-b border-black/10 bg-white/70 px-4 dark:border-white/10 dark:bg-[#1b1f24]">
              <div className="flex items-center gap-2.5 text-sm text-[#171717] dark:text-slate-100">
                <SlidersHorizontal className="size-4 text-[#0078d4]" aria-hidden="true" />
                <span id="vivetool-gui-title">ViveTool GUI</span>
              </div>
              <button type="button" onClick={onClose} aria-label="Close ViveTool GUI" className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[#333] hover:bg-black/10 dark:text-white dark:hover:bg-white/10">
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>
            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 rounded-lg border border-[#0078d4]/20 bg-[#0078d4]/[0.08] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Terminal className="size-4 text-[#0078d4]" aria-hidden="true" /> Experimental features</div>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Quickly enable or disable Sparkle features without typing a viVeTool command.</p>
              </div>
              <div className="flex flex-col gap-3">
                {FEATURES.map((feature) => {
                  const enabled = isEnabled(feature);
                  return (
                    <div key={feature.key} className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white">{feature.label}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{feature.description}</p></div>
                      <button id={feature.key === 'navigationMode' ? 'vivetool-gui-taskbar' : undefined} type="button" role="switch" aria-checked={enabled} onClick={() => toggleFeature(feature)} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111821] ${enabled ? 'bg-[#0078d4]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        <span className="sr-only">{enabled ? 'Disable' : 'Enable'} {feature.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
