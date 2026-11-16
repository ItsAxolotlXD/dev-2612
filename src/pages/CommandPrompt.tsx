import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, Terminal } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useDrivers } from '../hooks/useDrivers';
import { executeSparkleCommand, type CommandResult } from '../utils/commandRunner';

type TranscriptEntry = {
  id: number;
  command: string;
  result: Exclude<CommandResult, { kind: 'clear' }>;
};

interface CommandPromptProps {
  onSearch: (query: string) => void;
  onOpenAbout: () => void;
  onOpenLegacySearch: () => void;
  onOpenViveToolGui: () => void;
  isWindowContent?: boolean;
}

export const CommandPrompt: React.FC<CommandPromptProps> = ({
  onSearch,
  onOpenAbout,
  onOpenLegacySearch,
  onOpenViveToolGui,
  isWindowContent = false,
}) => {
  const { settings, updateSetting } = useSettings();
  const {
    resolutionStatus,
    visualStatus,
    installResolutionDriver,
    rollbackResolutionDriver,
    installVisualDriver,
    rollbackVisualDriver,
  } = useDrivers();
  const [command, setCommand] = useState('');
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const nextEntryId = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) {
      transcript.scrollTo({ top: transcript.scrollHeight, behavior: 'smooth' });
    }
  }, [entries]);

  const appendEntry = (rawCommand: string, result: Exclude<CommandResult, { kind: 'clear' }>) => {
    const entry: TranscriptEntry = {
      id: nextEntryId.current,
      command: rawCommand,
      result,
    };
    nextEntryId.current += 1;
    setEntries((currentEntries) => [...currentEntries, entry]);
  };

  const runCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rawCommand = command.trim();
    if (!rawCommand) return;

    setCommand('');
    const result = executeSparkleCommand(rawCommand, {
      settings,
      updateSetting,
      resolutionStatus,
      visualStatus,
      installResolutionDriver,
      rollbackResolutionDriver,
      installVisualDriver,
      rollbackVisualDriver,
      onSearch,
      onOpenAbout,
      onOpenLegacySearch,
      onOpenViveToolGui,
    });

    if (result.kind === 'clear') {
      setEntries([]);
      return;
    }

    appendEntry(rawCommand, result);
  };

  return (
    <div className={isWindowContent ? 'flex h-full min-h-0 w-full flex-col' : 'mx-auto flex w-full max-w-5xl flex-col gap-5 pb-10 pt-2'}>
      <section
        aria-label="Command Prompt terminal"
        className={`flex flex-col overflow-hidden bg-[#090d12] ${
          isWindowContent
            ? 'h-full min-h-0 w-full rounded-none border-0 shadow-none'
            : 'min-h-[420px] rounded-xl border border-[#263241] shadow-xl shadow-black/10 dark:shadow-black/25'
        }`}
      >
        {!isWindowContent && (
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#111821] px-4">
            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
              <Terminal className="h-4 w-4 text-[#4cc2ff]" aria-hidden="true" />
              <span>Command Prompt</span>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
              viVeTool
            </span>
          </div>
        )}

        <div
          ref={transcriptRef}
          role="log"
          aria-label="Command output"
          aria-relevant="additions text"
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 font-mono text-xs leading-relaxed text-slate-200 sm:px-6 sm:text-sm"
        >
          <div className="space-y-1 text-slate-400">
            <p>Sparkle Command Prompt</p>
            <p>Type /vivetool /list to show all available experimental features.</p>
            <p>Type /vivetool /gui to open ViveTool GUI and toggle features.</p>
            <p>Manage display drivers with /drivers /install|/uninstall /visuals|/resolution.</p>
            <p>{'Search Sparkle with /search <keyword>.'}</p>
            <p>Open About Sparkle with /sparkver.</p>
            <p>{'Open the legacy search page with /debug legacysearch.'}</p>
          </div>

          {entries.map((entry) => (
            <div key={entry.id} className="space-y-2.5">
              <div className="flex flex-wrap gap-x-2">
                <span className="shrink-0 text-[#77c8ff]">Sparkle\Services\Users&gt;</span>
                <span className="break-all text-slate-100">{entry.command}</span>
              </div>

              {entry.result.kind === 'message' ? (
                <p
                  className={`break-words pl-0 sm:pl-1 ${
                    entry.result.tone === 'error'
                      ? 'text-[#ff8b8b]'
                      : entry.result.tone === 'success'
                        ? 'text-[#8be9a7]'
                        : 'text-slate-300'
                  }`}
                >
                  {entry.result.message}
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-slate-400">
                    {entry.result.experiments.length} experimental features available.
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full table-fixed border-collapse text-left text-[10px] sm:text-xs">
                      <colgroup>
                        <col className="w-[46%]" />
                        <col className="w-[30%]" />
                        <col className="w-[24%]" />
                      </colgroup>
                      <thead className="bg-white/[0.06] text-slate-300">
                        <tr>
                          <th scope="col" className="px-1.5 py-2 font-semibold sm:px-3 md:px-4">Features name</th>
                          <th scope="col" className="px-1.5 py-2 font-semibold sm:px-3 md:px-4">Features ID</th>
                          <th scope="col" className="px-1.5 py-2 font-semibold sm:px-3 md:px-4">State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.result.experiments.map((experiment) => (
                          <tr key={experiment.id} className="border-t border-white/[0.08]">
                            <td className="px-1.5 py-2 text-slate-100 sm:px-3 md:px-4">{experiment.name}</td>
                            <td className="px-1.5 py-2 font-mono text-slate-300 sm:px-3 md:px-4">{experiment.id}</td>
                            <td className="px-1.5 py-2 sm:px-3 md:px-4">
                              <span className={`whitespace-nowrap text-[10px] font-semibold ${experiment.enabled ? 'text-[#8be9a7]' : 'text-slate-400'}`}>
                                {experiment.enabled ? 'ENABLED' : 'DISABLED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={runCommand}
          className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] bg-[#111821] p-3 sm:px-5"
        >
          <label htmlFor="command-prompt-input" className="sr-only">Enter a command</label>
          <span aria-hidden="true" className="hidden shrink-0 font-mono text-xs text-[#77c8ff] sm:inline">
            Sparkle\Services\Users&gt;
          </span>
          <input
            id="command-prompt-input"
            type="text"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) {
                event.preventDefault();
              }
            }}
            placeholder="/vivetool /list"
            autoFocus={isWindowContent}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#090d12] px-3 py-2.5 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#4cc2ff]/70 focus:ring-2 focus:ring-[#4cc2ff]/20"
          />
          <button
            type="submit"
            aria-label="Run command"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-[#0078d4] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#1689e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cc2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111821]"
          >
            <span>Run</span>
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </section>

      {!isWindowContent && (
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          Example: <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono dark:bg-white/[0.08]">/vivetool /enable /id:742839516</code>
        </p>
      )}
    </div>
  );
};
