import React, { useEffect, useRef, useState } from 'react';

interface SparkleBootloaderProps {
  isOpen: boolean;
  onReady: () => void;
}

type BootScreen = 'boot-error' | 'disc-selection' | 'import-error';
type InstallPhase = 'loading-files' | 'just-a-moment' | null;

const INSTALLATION_DISCS = [
  { name: 'SPARKLE-PRODUCT-SERVER-VER26.0-PROD-X64-EN_US.sdisc', status: '*main' },
  { name: 'SPARKLE-PRODUCT-VER26.0-PROD-X64-EN_US.sdisc', status: '*access denied' },
  { name: 'Import more installation disc files...', status: '' },
];

const DISC_PIXELS = ['00111100', '01233210', '12300321', '12300321', '01233210', '00111100'];
const PIXEL_COLORS: Record<string, string> = {
  '1': '#777777',
  '2': '#c9c9c9',
  '3': '#ffffff',
};

function PixelDiscIcon() {
  return (
    <span aria-hidden="true" className="grid shrink-0 grid-cols-8" style={{ imageRendering: 'pixelated' }}>
      {DISC_PIXELS.join('').split('').map((pixel, index) => (
        <span
          key={index}
          className="size-[2px]"
          style={{ backgroundColor: PIXEL_COLORS[pixel] ?? 'transparent' }}
        />
      ))}
    </span>
  );
}

export function SparkleBootloader({ isOpen, onReady }: SparkleBootloaderProps) {
  const [screen, setScreen] = useState<BootScreen>('boot-error');
  const [installPhase, setInstallPhase] = useState<InstallPhase>(null);
  const [highlightedDisc, setHighlightedDisc] = useState(0);
  const [discStatus, setDiscStatus] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setScreen('boot-error');
    setInstallPhase(null);
    setHighlightedDisc(0);
    setDiscStatus('');
  }, [isOpen]);

  useEffect(() => {
    if (screen !== 'boot-error' && screen !== 'disc-selection' && screen !== 'import-error') return;
    rootRef.current?.focus();
  }, [screen]);

  useEffect(() => {
    if (installPhase === 'loading-files') {
      const timer = window.setTimeout(() => setInstallPhase('just-a-moment'), 5000);
      return () => window.clearTimeout(timer);
    }

    if (installPhase === 'just-a-moment') {
      const timer = window.setTimeout(onReady, 5000);
      return () => window.clearTimeout(timer);
    }
  }, [installPhase, onReady]);

  if (!isOpen) return null;

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const selectDisc = (index: number) => {
    setHighlightedDisc(index);
    setDiscStatus('');

    if (index === 0) {
      setInstallPhase('loading-files');
      return;
    }

    if (index === 1) {
      setDiscStatus('Access denied: this installation disc is not available.');
      return;
    }

    openFilePicker();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (installPhase) return;

    if (screen === 'boot-error') {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setScreen('disc-selection');
      }
      return;
    }

    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      setScreen(screen === 'import-error' ? 'disc-selection' : 'boot-error');
      return;
    }

    if (screen !== 'disc-selection') return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedDisc((current) => (current + direction + INSTALLATION_DISCS.length) % INSTALLATION_DISCS.length);
      setDiscStatus('');
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDisc(highlightedDisc);
    }
  };

  return (
    <div
      ref={rootRef}
      data-testid="sparkle-bootloader"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[2147483647] overflow-y-auto bg-black px-6 py-10 text-white outline-none sm:px-12 sm:py-12"
      style={{ fontFamily: "Consolas, 'Courier New', monospace", fontSize: 'clamp(14px, 1.25vw, 18px)', lineHeight: 1.75 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".sdisc,application/octet-stream"
        aria-label="Import installation disc file"
        className="sr-only"
        onChange={(event) => {
          if (event.currentTarget.files?.length) setScreen('import-error');
        }}
      />

      {installPhase === 'loading-files' ? (
        <section className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-4xl flex-col justify-center gap-7" aria-label="Loading installation disc">
          <p>Sparkle is loading files and installation disc...</p>
          <div className="h-5 w-full border border-white p-[3px]" aria-label="Loading progress">
            <div className="h-full bg-white" style={{ animation: 'sparkle-bootloader-progress 5s linear forwards' }} />
          </div>
          <style>{'@keyframes sparkle-bootloader-progress { from { width: 0%; } to { width: 100%; } }'}</style>
        </section>
      ) : installPhase === 'just-a-moment' ? (
        <section className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-4xl flex-col items-center justify-center gap-6" aria-label="Preparing installation">
          <span aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          <p>Just a moment...</p>
        </section>
      ) : screen === 'boot-error' ? (
        <div role="main" className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-4xl flex-col justify-center gap-2">
          <p>Failed to boot your operating system.</p>
          <p>ERROR_367: Operating system not found</p>
          <p className="mt-5 max-w-3xl">
            <button
              type="button"
              onClick={() => setScreen('disc-selection')}
              className="underline decoration-1 underline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Press this line text
            </button>{' '}
            to select an available installation disc (.sdisc) to install operating system.
          </p>
          <p className="mt-7 text-sm text-white/70">Use arrow keys or click to navigate.</p>
        </div>
      ) : screen === 'disc-selection' ? (
        <div role="main" className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-4xl flex-col justify-center">
          <p className="mb-1">Select available installation disc to install</p>
          <p className="mb-6 text-sm text-white/70">Use arrow keys or click to navigate.</p>
          <div role="listbox" aria-label="Available installation discs" className="flex flex-col gap-1">
            {INSTALLATION_DISCS.map((disc, index) => {
              const isImport = index === 2;
              const isSelected = highlightedDisc === index;

              return (
                <button
                  key={disc.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-disc-index={index}
                  tabIndex={isSelected ? 0 : -1}
                  onFocus={() => setHighlightedDisc(index)}
                  onClick={() => selectDisc(index)}
                  className={`flex min-h-10 w-full items-center gap-3 px-3 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-white ${isSelected ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                >
                  {isImport ? <span aria-hidden="true" className="w-4 shrink-0" /> : <PixelDiscIcon />}
                  <span className="min-w-0 break-all">{disc.name}</span>
                  {disc.status && <span className="ml-auto shrink-0 pl-3">{disc.status}</span>}
                </button>
              );
            })}
          </div>
          {discStatus && <p role="alert" className="mt-5 text-white">{discStatus}</p>}
        </div>
      ) : (
        <div role="main" className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-4xl flex-col justify-center gap-3">
          <p>Unable to load imported installation disc.</p>
          <p className="max-w-3xl">
            This is probably due to your installation disc contains an expired build of Sparkle or it is missing some important files to load.
          </p>
          <p className="mt-2">
            Try to install via a pre-installed installation disc or{' '}
            <button
              type="button"
              onClick={openFilePicker}
              className="underline decoration-1 underline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              import a different one
            </button>
          </p>
          <p className="mt-4 text-sm text-white/70">Use arrow keys or click to navigate.</p>
        </div>
      )}
    </div>
  );
}
