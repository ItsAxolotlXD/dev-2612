import { useEffect, useState } from 'react';
import { SpinningRing } from './SpinningRing';

const UNINSTALL_DURATION_MS = 60_000;

interface SparkleUninstallScreenProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function SparkleUninstallScreen({ isOpen, onComplete }: SparkleUninstallScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const startedAt = Date.now();
    setProgress(0);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(99, Math.floor((elapsed / UNINSTALL_DURATION_MS) * 100)));
    }, 250);
    const timeout = window.setTimeout(() => {
      setProgress(100);
      onComplete();
    }, UNINSTALL_DURATION_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="sparkle-uninstall-title"
      className="fixed inset-0 z-[2147483647] flex min-h-dvh w-full items-center justify-center overflow-y-auto rounded-none border-0 bg-[#2165B5] px-6 py-8 text-white sm:px-10 sm:py-10"
      style={{
        backgroundColor: '#2165B5',
        borderRadius: 0,
        fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5">
        <div
          id="sparkle-uninstall-title"
          className="text-[22px] font-semibold leading-tight sm:text-[24px]"
        >
          Uninstalling Sparkle
        </div>
        <p className="max-w-[720px] text-[15px] leading-relaxed text-white/90 sm:text-base">
          Thank you for trying this build of Sparkle. We&apos;re preparing uninstallation and go back to previous build (if possible).
        </p>
        <div className="mt-4 flex items-center gap-3 text-sm sm:text-base">
          <SpinningRing size={22} className="shrink-0" ariaLabel="Uninstalling Sparkle" />
          <span>{progress}% complete</span>
        </div>
        <div
          role="progressbar"
          aria-label="Sparkle uninstallation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}% complete`}
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/25"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
