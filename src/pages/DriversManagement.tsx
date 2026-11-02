import React from 'react';
import { motion } from 'motion/react';
import {
  HardDrive,
  Monitor,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Wand2,
  X
} from 'lucide-react';
import { useDrivers } from '../hooks/useDrivers';

interface DriversManagementProps {
  onOpenDriverModal?: () => void;
  onClose?: () => void;
}

export const DriversManagement: React.FC<DriversManagementProps> = ({
  onOpenDriverModal,
  onClose,
}) => {
  const {
    isResolutionInstalled,
    isVisualInstalled,
    installResolutionDriver,
    rollbackResolutionDriver,
    installVisualDriver,
    rollbackVisualDriver,
    resetAllDrivers,
  } = useDrivers();

  const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.screen.height : 1080;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col items-start justify-between gap-4 pb-2 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#0078d4]/10 dark:bg-[#0078d4]/20 border border-[#0078d4]/30 flex items-center justify-center text-[#0078d4] shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 id="driver-management-panel-title" className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111827] dark:text-white">
              Manage Drivers
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] dark:text-[#a0a0a0] mt-0.5">
              Manage display resolution adapters, visual effects drivers, and GPU composition.
            </p>
          </div>
        </div>

        {/* Top Action buttons */}
        <div className="flex w-full items-center justify-end gap-2">
          {onOpenDriverModal && (
            <button
              type="button"
              onClick={onOpenDriverModal}
              className="px-3.5 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Launch Driver Setup Wizard</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Manage Drivers panel"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-black/15 text-[#4b5563] transition-colors hover:bg-black/5 hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:border-white/20 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* System Status Banner */}
      <div
        className={`p-4 sm:p-5 rounded-lg border transition-all ${
          isResolutionInstalled && isVisualInstalled
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {isResolutionInstalled && isVisualInstalled ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-semibold text-sm sm:text-base">
              {isResolutionInstalled && isVisualInstalled
                ? 'All Sparkle System Drivers Up to Date'
                : 'Attention: Some Important Drivers Are Missing or Ignored'}
            </div>
            <p className="text-xs sm:text-sm opacity-90 mt-1 leading-relaxed">
              {isResolutionInstalled && isVisualInstalled
                ? `Hardware accelerated Fluent composition and native widescreen resolution (${screenWidth}x${screenHeight}) are operating normally.`
                : !isResolutionInstalled && !isVisualInstalled
                ? 'Sparkle is currently running in fallback 4:3 stretched mode without visual blur effects. Install both drivers below for the best experience.'
                : !isResolutionInstalled
                ? 'Resolution driver missing: Sparkle is displayed in 4:3 aspect ratio stretched horizontally to 16:9.'
                : 'Visual driver missing: Sparkle is running in solid color mode without backdrop blur or transparency.'}
            </p>
          </div>
        </div>
      </div>

      {/* Installed Drivers Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-[#111827] dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0078d4]" />
          <span>Device Drivers &amp; Display Adapters</span>
        </h2>

        {/* 1. Resolution Driver Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 flex flex-col justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isResolutionInstalled
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-semibold text-sm sm:text-base text-[#111827] dark:text-white">
                  Sparkle Resolution Display Driver
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isResolutionInstalled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isResolutionInstalled ? 'Installed (Native Resolution)' : 'Missing (4:3 Stretched)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#666666] dark:text-[#a0a0a0] mt-1 max-w-xl">
                {isResolutionInstalled
                  ? `Adapts display resolution to native screen dimensions (${screenWidth}x${screenHeight}). 4:3 stretched distortion is disabled.`
                  : 'Missing driver: Running in low 1024x768 4:3 resolution stretched horizontally to 16:9 full screen.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end shrink-0">
            {isResolutionInstalled ? (
              <button
                type="button"
                onClick={rollbackResolutionDriver}
                className="px-3.5 py-1.5 rounded border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium text-[#111827] dark:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rollback to 4:3 Stretched</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={installResolutionDriver}
                className="px-4 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Install Resolution Driver</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* 2. Visual Effects Driver Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 flex flex-col justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isVisualInstalled
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-amber-500/15 text-amber-500'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-semibold text-sm sm:text-base text-[#111827] dark:text-white">
                  Sparkle Visual Effects &amp; Composition Driver
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isVisualInstalled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isVisualInstalled ? 'Installed (Blur & Transparency Active)' : 'Disabled (Solid Color Mode)'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#666666] dark:text-[#a0a0a0] mt-1 max-w-xl">
                {isVisualInstalled
                  ? 'Hardware-accelerated WinUI 3 backdrop blur, Acrylic materials, and fluid mica transparency are active.'
                  : 'Visual drivers ignored: UI surfaces render in flat solid colors without backdrop blur or transparency.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end shrink-0">
            {isVisualInstalled ? (
              <button
                type="button"
                onClick={rollbackVisualDriver}
                className="px-3.5 py-1.5 rounded border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium text-[#111827] dark:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Disable (Solid Colors)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={installVisualDriver}
                className="px-4 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] active:bg-[#005a9e] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Install Visual Driver</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* 3. Media Decoder Driver (Core System Driver) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 flex flex-col justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-semibold text-sm sm:text-base text-[#111827] dark:text-white">
                  Sparkle Media &amp; Audio Controller
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Operating Normally
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#666666] dark:text-[#a0a0a0] mt-1 max-w-xl">
                High-definition HLS/MPEG-TS television pipeline, audio synthesizer, and channel decoders.
              </p>
            </div>
          </div>

          <div className="text-xs text-[#888888] font-mono self-end">
            v26.11.0-STABLE
          </div>
        </motion.div>
      </div>

      {/* Hardware & Display Specifications */}
      <div className="p-5 rounded-lg border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/10 space-y-3">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-white">
          Hardware &amp; Display Specifications
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded bg-black/5 dark:bg-white/5 space-y-1">
            <div className="text-[#888888]">Display Controller</div>
            <div className="font-semibold text-[#111827] dark:text-white">Sparkle Virtual SVGA-II</div>
          </div>
          <div className="p-3 rounded bg-black/5 dark:bg-white/5 space-y-1">
            <div className="text-[#888888]">Detected Screen</div>
            <div className="font-semibold text-[#111827] dark:text-white">{screenWidth} × {screenHeight}</div>
          </div>
          <div className="p-3 rounded bg-black/5 dark:bg-white/5 space-y-1">
            <div className="text-[#888888]">Aspect Ratio Mode</div>
            <div className="font-semibold text-[#111827] dark:text-white">
              {isResolutionInstalled ? 'Native 16:9 Adapt' : '4:3 Stretched to 16:9'}
            </div>
          </div>
          <div className="p-3 rounded bg-black/5 dark:bg-white/5 space-y-1">
            <div className="text-[#888888]">Composition Engine</div>
            <div className="font-semibold text-[#111827] dark:text-white">
              {isVisualInstalled ? 'Fluent Acrylic / Blur' : 'Solid Opaque Surfaces'}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Drivers */}
      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={resetAllDrivers}
          className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset all drivers to missing state (Test 4:3 stretched mode)</span>
        </button>
      </div>
    </div>
  );
};
