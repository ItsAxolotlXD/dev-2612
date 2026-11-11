import React, { useEffect, useRef, useState } from 'react';

interface SparkleBootInstallFlowProps {
  isOpen: boolean;
  onFinish: () => void;
}

type BootStage = 'failure' | 'selection' | 'loading' | 'just-a-moment';

const MAIN_DISC = 'SPARKLE-PRODUCT-SERVER-VER26.0-PROD-X64-EN_US.sdisc';
const RESTRICTED_DISC = 'SPARKLE-PRODUCT-VER26.0-PROD-X64-EN_US.sdisc';
const INSTALL_DURATION_MS = 5000;

export const SparkleBootInstallFlow: React.FC<SparkleBootInstallFlowProps> = ({ isOpen, onFinish }) => {
  const [stage, setStage] = useState<BootStage>('failure');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [importedDiscs, setImportedDiscs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage !== 'loading') return;

    const startedAt = Date.now();
    const progressInterval = window.setInterval(() => {
      setLoadingProgress(Math.min(100, Math.round(((Date.now() - startedAt) / INSTALL_DURATION_MS) * 100)));
    }, 80);
    const stageTimeout = window.setTimeout(() => {
      setLoadingProgress(100);
      setStage('just-a-moment');
    }, INSTALL_DURATION_MS);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(stageTimeout);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'just-a-moment') return;

    const finishTimeout = window.setTimeout(onFinish, INSTALL_DURATION_MS);
    return () => window.clearTimeout(finishTimeout);
  }, [onFinish, stage]);

  if (!isOpen) return null;

  const startInstallation = () => {
    setLoadingProgress(0);
    setStage('loading');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    const names: string[] = [];
    if (files) {
      for (let index = 0; index < files.length; index += 1) {
        const file = files.item(index);
        if (file) names.push(file.name);
      }
    }
    if (names.length > 0) {
      setImportedDiscs((current) => [...new Set([...current, ...names])]);
    }
    event.currentTarget.value = '';
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Operating system boot and installation"
      className="fixed inset-0 z-[2147483647] min-h-dvh overflow-y-auto bg-black text-white"
      style={{ fontFamily: "Consolas, 'Lucida Console', 'Courier New', monospace" }}
    >
      {stage === 'failure' && (
        <div className="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-6 py-10 sm:px-12 sm:py-14">
          <div className="pt-[8vh] text-[14px] leading-7 sm:text-base sm:leading-8">
            <p>Failed to boot your operating system.</p>
            <p className="mt-2">ERROR_367: Operating system not found</p>
            <p className="mt-7 max-w-4xl leading-7 sm:mt-9 sm:leading-8">
              <button
                type="button"
                onClick={() => setStage('selection')}
                className="cursor-pointer text-left underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Press this line text
              </button>{' '}
              to select an available installation disc (.sdisc) to install operating system.
            </p>
          </div>
        </div>
      )}

      {stage === 'selection' && (
        <div className="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-6 py-10 sm:px-12 sm:py-14">
          <h1 className="mb-6 text-base font-normal sm:mb-8 sm:text-lg">Select available installation disc</h1>
          <div role="list" aria-label="Available installation discs" className="flex flex-col items-start gap-1 text-[13px] leading-7 sm:text-[15px] sm:leading-8">
            <div role="listitem">
              <button
                type="button"
                onClick={startInstallation}
                aria-label={`Select ${MAIN_DISC}, main installation disc`}
                className="max-w-full break-words text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {MAIN_DISC} <span>*main</span>
              </button>
            </div>
            <div role="listitem">
              <button
                type="button"
                disabled
                aria-label={`${RESTRICTED_DISC}, access denied`}
                className="max-w-full break-words cursor-not-allowed text-left text-white/45"
              >
                {RESTRICTED_DISC} <span>*access denied</span>
              </button>
            </div>
            {importedDiscs.map((disc) => (
              <div role="listitem" key={disc}>
                <button
                  type="button"
                  onClick={startInstallation}
                  aria-label={`Select imported installation disc ${disc}`}
                  className="max-w-full break-words text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {disc} <span>*imported</span>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 cursor-pointer text-left underline underline-offset-4 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Import more installation disc files...
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sdisc"
              multiple
              tabIndex={-1}
              aria-label="Choose installation disc files"
              className="sr-only"
              onChange={handleImport}
            />
          </div>
        </div>
      )}

      {stage === 'loading' && (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-6 text-center sm:gap-9">
          <p role="status" aria-live="polite" className="text-[14px] sm:text-base">
            Loading files and installation disc ...
          </p>
          <div
            role="progressbar"
            aria-label="Loading files and installation disc"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={loadingProgress}
            className="h-4 w-full max-w-[900px] border border-white p-[2px]"
          >
            <div
              className="h-full bg-white transition-[width] duration-75 ease-linear"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'just-a-moment' && (
        <div className="flex min-h-dvh items-center justify-center px-6 text-center">
          <p role="status" aria-live="polite" className="text-base sm:text-lg">Just a moment...</p>
        </div>
      )}
    </section>
  );
};
