import React, { useEffect, useState } from 'react';
import { ArrowLeft, HardDrive, Lock, RefreshCw, SkipForward, Terminal } from 'lucide-react';

interface SparkleAdvancedOptionsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRecoveryWizard: () => void;
  onInstallDrivers: () => void;
  onOpenCommandPrompt: () => void;
  onSkipSetup: () => void;
}

export const SparkleAdvancedOptionsScreen: React.FC<SparkleAdvancedOptionsScreenProps> = ({
  isOpen,
  onClose,
  onOpenRecoveryWizard,
  onInstallDrivers,
  onOpenCommandPrompt,
  onSkipSetup,
}) => {
  const [isSkipPromptOpen, setIsSkipPromptOpen] = useState(false);
  const [skipPassword, setSkipPassword] = useState('');
  const [skipError, setSkipError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsSkipPromptOpen(false);
      setSkipPassword('');
      setSkipError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const options = [
    {
      title: 'Recovery Environment Wizard',
      description: 'Open the recovery wizard to repair or reset Sparkle.',
      Icon: RefreshCw,
      onSelect: onOpenRecoveryWizard,
    },
    {
      title: 'Install Drivers',
      description: 'Continue to the driver installation and setup tools.',
      Icon: HardDrive,
      onSelect: onInstallDrivers,
    },
    {
      title: 'Skip Out of Box Experience',
      description: 'Skip the setup experience after confirming the password.',
      Icon: SkipForward,
      keepOpen: true,
      onSelect: () => setIsSkipPromptOpen(true),
    },
    {
      title: 'Open Command Prompt',
      description: 'Open the Sparkle command prompt window.',
      Icon: Terminal,
      onSelect: onOpenCommandPrompt,
    },
  ];

  const handleSkipSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (skipPassword !== 'oobeskip') {
      setSkipError('The password is incorrect. Try again.');
      return;
    }

    onClose();
    onSkipSetup();
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="sparkle-advanced-options-title"
      className="fixed inset-0 z-[2147483647] flex min-h-dvh w-full flex-col overflow-y-auto rounded-none bg-[#2165B5] px-6 py-6 text-white sm:px-10 sm:py-8"
      style={{
        backgroundColor: '#2165B5',
        borderRadius: 0,
        fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <header className="mx-auto flex w-full max-w-[1100px] items-center gap-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to setup"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/50 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 id="sparkle-advanced-options-title" className="text-[28px] font-light tracking-tight sm:text-[34px]">
          Advanced options
        </h1>
      </header>

      <div className="mx-auto w-full max-w-[1100px] flex-1 pt-7 sm:pt-8">
        <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 sm:gap-x-8">
          {options.map(({ title, description, Icon, onSelect, keepOpen }) => (
            <button
              key={title}
              type="button"
              onClick={() => {
                if (!keepOpen) onClose();
                onSelect();
              }}
              className="group flex min-h-[94px] w-full items-center gap-3 border border-transparent p-2 text-left transition hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="flex size-[68px] shrink-0 items-center justify-center bg-[#49A9DB] text-white">
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[17px] font-normal leading-tight sm:text-[18px]">{title}</span>
                <span className="max-w-[270px] text-[11px] leading-snug text-white/85">{description}</span>
              </span>
            </button>
          ))}
        </div>

        {isSkipPromptOpen && (
          <form
            onSubmit={handleSkipSubmit}
            className="mt-5 w-full max-w-[480px] border border-white/60 bg-[#1D5B9F] p-5 sm:mt-6"
          >
            <div className="flex items-center gap-2 text-[15px] font-medium">
              <Lock className="size-4" aria-hidden="true" />
              <label htmlFor="oobe-skip-password">Confirm password to skip setup</label>
            </div>
            <input
              id="oobe-skip-password"
              type="password"
              autoFocus
              autoComplete="off"
              value={skipPassword}
              onChange={(event) => {
                setSkipPassword(event.target.value);
                setSkipError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
                  event.preventDefault();
                }
              }}
              aria-invalid={Boolean(skipError)}
              aria-describedby={skipError ? 'oobe-skip-password-error' : undefined}
              className="mt-3 h-10 w-full border border-white/65 bg-[#164D87] px-3 text-sm text-white outline-none placeholder:text-white/60 focus-visible:ring-2 focus-visible:ring-white"
              placeholder="Enter password"
            />
            {skipError && (
              <p id="oobe-skip-password-error" role="alert" className="mt-2 text-sm text-white">
                {skipError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSkipPromptOpen(false);
                  setSkipPassword('');
                  setSkipError('');
                }}
                className="min-h-10 border border-white/70 px-4 text-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-10 border border-white bg-white px-4 text-sm font-medium text-[#2165B5] transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D5B9F]"
              >
                Skip setup
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
