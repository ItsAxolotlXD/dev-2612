import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BatteryCharging,
  Bluetooth,
  BluetoothOff,
  Image as ImageIcon,
  Moon,
  PanelsTopLeft,
  SlidersHorizontal,
  Sun,
  SunMedium,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getAppPortalTarget, toAppPortalCoordinates } from '../utils/appPortal';
import { flyoutPanelClassName, flyoutPanelStyle } from './FlyoutDropdown';
import { useControlCenter } from '../hooks/useControlCenter';
import { useSettings } from '../hooks/useSettings';
import { FluentFileExplorerIcon, FluentSettingsIcon } from './FluentIcons';

interface ControlCenterTrayProps {
  isTopBarBottom?: boolean;
  theme?: 'dark' | 'light';
  showItemTooltip: (label: string, target: HTMLElement) => void;
  hideItemTooltip: () => void;
  onNavigate?: (route: string, state?: any) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const ControlCenterScreenOverlay: React.FC = () => {
  const { state } = useControlCenter();
  const dimAlpha = state.brightness < 100 ? Math.min(0.65, ((100 - state.brightness) / 100) * 0.72) : 0;

  if (dimAlpha <= 0 && !state.nightLightEnabled) return null;

  return (
    <div
      id="sparkle-control-center-screen-overlay"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2147483640] transition-colors duration-200"
      style={{
        backgroundColor:
          dimAlpha > 0 && state.nightLightEnabled
            ? `rgba(24, 14, 4, ${Math.min(0.75, dimAlpha + 0.14)})`
            : dimAlpha > 0
              ? `rgba(0, 0, 0, ${dimAlpha})`
              : 'rgba(255, 147, 41, 0.12)',
        mixBlendMode: dimAlpha === 0 && state.nightLightEnabled ? 'multiply' : undefined,
      }}
    />
  );
};

export const ControlCenterTray: React.FC<ControlCenterTrayProps> = ({
  isTopBarBottom = true,
  theme = 'dark',
  showItemTooltip,
  hideItemTooltip,
  onNavigate,
  onContextMenu,
}) => {
  const { state, updateState } = useControlCenter();
  const { settings, updateSetting } = useSettings();
  const shouldReduceMotion = useReducedMotion();

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [flyoutCoords, setFlyoutCoords] = useState<{ right: number; top: number }>({
    right: 8,
    top: 52,
  });

  const updateFlyoutPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(window.innerWidth - 8, rect.right);
    const y = isTopBarBottom ? rect.top - 8 : rect.bottom + 8;
    const pt = toAppPortalCoordinates(x, y);
    setFlyoutCoords({
      right: Math.max(8, window.innerWidth - pt.x),
      top: pt.y,
    });
  }, [isTopBarBottom]);

  useEffect(() => {
    const handleToggleEvent = () => setIsOpen((prev) => !prev);
    const handleCloseEvent = () => setIsOpen(false);
    window.addEventListener('sparkle:toggle-control-center', handleToggleEvent);
    window.addEventListener('vplay:focus-topbar-search', handleCloseEvent);
    return () => {
      window.removeEventListener('sparkle:toggle-control-center', handleToggleEvent);
      window.removeEventListener('vplay:focus-topbar-search', handleCloseEvent);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateFlyoutPosition();

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (flyoutRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleOutside);
    }, 20);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', updateFlyoutPosition);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updateFlyoutPosition);
    };
  }, [isOpen, updateFlyoutPosition]);

  const VolumeIcon =
    state.isMuted || state.volume === 0 ? VolumeX : state.volume < 45 ? Volume1 : Volume2;

  const quickTiles = [
    {
      id: 'wifi',
      label: 'Wi-Fi',
      sublabel: state.wifiEnabled ? 'Sparkle 5G' : 'Off',
      active: state.wifiEnabled,
      icon: state.wifiEnabled ? (
        <Wifi className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      ),
      onToggle: () => updateState({ wifiEnabled: !state.wifiEnabled }),
    },
    {
      id: 'bluetooth',
      label: 'Bluetooth',
      sublabel: state.bluetoothEnabled ? 'Ready' : 'Off',
      active: state.bluetoothEnabled,
      icon: state.bluetoothEnabled ? (
        <Bluetooth className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <BluetoothOff className="size-4 shrink-0" aria-hidden="true" />
      ),
      onToggle: () => updateState({ bluetoothEnabled: !state.bluetoothEnabled }),
    },
    {
      id: 'theme',
      label: settings.theme === 'dark' ? 'Dark mode' : 'Light mode',
      sublabel: settings.theme === 'dark' ? 'On' : 'Off',
      active: settings.theme === 'dark',
      icon:
        settings.theme === 'dark' ? (
          <Moon className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <Sun className="size-4 shrink-0" aria-hidden="true" />
        ),
      onToggle: () => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'wallpaper',
      label: 'Wallpaper',
      sublabel: settings.isWallpaperAllowed ? 'On' : 'Off',
      active: settings.isWallpaperAllowed,
      icon: <ImageIcon className="size-4 shrink-0" aria-hidden="true" />,
      onToggle: () => updateSetting('isWallpaperAllowed', !settings.isWallpaperAllowed),
    },
    {
      id: 'night-light',
      label: 'Night light',
      sublabel: state.nightLightEnabled ? 'On' : 'Off',
      active: state.nightLightEnabled,
      icon: <SunMedium className="size-4 shrink-0" aria-hidden="true" />,
      onToggle: () => updateState({ nightLightEnabled: !state.nightLightEnabled }),
    },
    {
      id: 'windowed-tabs',
      label: 'Windowed',
      sublabel: settings.windowedTabs ? 'Desktop' : 'Tabs',
      active: settings.windowedTabs,
      icon: <PanelsTopLeft className="size-4 shrink-0" aria-hidden="true" />,
      onToggle: () => updateSetting('windowedTabs', !settings.windowedTabs),
    },
  ];

  const effectiveVolume = state.isMuted ? 0 : state.volume;

  return (
    <>
      <button
        ref={triggerRef}
        id="taskbar-control-center-tray"
        type="button"
        onClick={() => {
          hideItemTooltip();
          setIsOpen((prev) => !prev);
        }}
        onContextMenu={onContextMenu}
        onMouseEnter={(e) =>
          showItemTooltip(
            `Control Center · ${state.wifiEnabled ? 'Wi-Fi' : 'Offline'} · ${effectiveVolume}%`,
            e.currentTarget
          )
        }
        onMouseLeave={hideItemTooltip}
        onFocus={(e) =>
          showItemTooltip(
            `Control Center · ${state.wifiEnabled ? 'Wi-Fi' : 'Offline'} · ${effectiveVolume}%`,
            e.currentTarget
          )
        }
        onBlur={hideItemTooltip}
        aria-label="Open Control Center (Quick settings)"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`relative flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] px-2.5 text-[#1f2937] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:text-white/90 dark:focus-visible:ring-[#4cc2ff] ${
          isOpen
            ? 'bg-black/[0.08] ring-1 ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.14]'
            : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
        }`}
      >
        {state.wifiEnabled ? (
          <Wifi className="size-[15px] shrink-0" aria-hidden="true" />
        ) : (
          <WifiOff className="size-[15px] shrink-0 opacity-60" aria-hidden="true" />
        )}
        <VolumeIcon
          className={`size-[15px] shrink-0 ${effectiveVolume === 0 ? 'opacity-65' : ''}`}
          aria-hidden="true"
        />
        <BatteryCharging className="size-[16px] shrink-0" aria-hidden="true" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={flyoutRef}
                id="sparkle-control-center-flyout"
                role="dialog"
                aria-label="Control Center"
                initial={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: isTopBarBottom ? 14 : -14, scale: 0.97 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: isTopBarBottom ? 10 : -10, scale: 0.97 }
                }
                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  ...flyoutPanelStyle,
                  position: 'fixed',
                  right: `${flyoutCoords.right}px`,
                  top: `${flyoutCoords.top}px`,
                  transform: isTopBarBottom ? 'translateY(-100%)' : undefined,
                  backgroundColor:
                    theme === 'light' ? 'rgba(244, 246, 250, 0.94)' : 'rgba(30, 34, 40, 0.94)',
                }}
                className={`z-[2147483647] w-[min(360px,calc(100vw-16px))] ${flyoutPanelClassName} overflow-hidden p-0 text-[#111827] dark:text-white`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-2.5 dark:border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-3.5 text-[#0078d4] dark:text-[#4cc2ff]" aria-hidden="true" />
                    <span className="text-[12.5px] font-semibold tracking-tight">Control Center</span>
                  </div>
                  <span className="text-[11px] text-[#5f6368] dark:text-white/60">
                    {state.wifiEnabled ? 'Sparkle 5G' : 'Offline'}
                  </span>
                </div>

                {/* Quick Settings Grid (Windows 11 Quick Actions) */}
                <div className="grid grid-cols-3 gap-2 p-3.5">
                  {quickTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={tile.onToggle}
                      aria-pressed={tile.active}
                      className="group flex flex-col items-center gap-1.5 text-center outline-none"
                    >
                      <span
                        className={`flex h-12 w-full cursor-pointer items-center justify-center rounded-[8px] border transition-colors group-focus-visible:ring-2 group-focus-visible:ring-[#0078d4] dark:group-focus-visible:ring-[#4cc2ff] ${
                          tile.active
                            ? 'border-[#0078d4]/60 bg-[#0078d4] text-white hover:bg-[#106ebe] dark:border-[#60cdff]/50 dark:bg-[#4cc2ff] dark:text-[#0b141f] dark:hover:bg-[#60cdff]'
                            : 'border-black/[0.08] bg-white/75 text-[#111827] hover:bg-black/[0.06] dark:border-white/[0.1] dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.12]'
                        }`}
                      >
                        {tile.icon}
                      </span>
                      <span className="w-full truncate text-[11px] font-medium leading-tight text-[#111827] dark:text-white/90">
                        {tile.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Sliders: Brightness & Volume */}
                <div className="space-y-3 border-t border-black/[0.07] px-4 py-3.5 dark:border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateState({ brightness: state.brightness === 100 ? 75 : 100 })
                      }
                      aria-label="Reset display brightness"
                      title="Display brightness"
                      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]"
                    >
                      <SunMedium className="size-4" aria-hidden="true" />
                    </button>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={state.brightness}
                      aria-label="Screen brightness"
                      onChange={(e) => updateState({ brightness: Number(e.target.value) })}
                      className="h-1.5 flex-1 cursor-pointer accent-[#0078d4] dark:accent-[#4cc2ff]"
                    />
                    <span className="w-9 text-right text-[11.5px] font-medium tabular-nums text-[#4b5563] dark:text-white/75">
                      {state.brightness}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateState({ isMuted: !state.isMuted })}
                      aria-label={state.isMuted ? 'Unmute audio' : 'Mute audio'}
                      title={state.isMuted ? 'Unmute' : 'Mute'}
                      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]"
                    >
                      <VolumeIcon className="size-4" aria-hidden="true" />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={effectiveVolume}
                      aria-label="System volume"
                      onChange={(e) => {
                        const nextVol = Number(e.target.value);
                        updateState({ volume: nextVol, isMuted: nextVol === 0 });
                      }}
                      className="h-1.5 flex-1 cursor-pointer accent-[#0078d4] dark:accent-[#4cc2ff]"
                    />
                    <span className="w-9 text-right text-[11.5px] font-medium tabular-nums text-[#4b5563] dark:text-white/75">
                      {effectiveVolume}%
                    </span>
                  </div>
                </div>

                {/* Footer bar matching Windows 11 Quick Settings */}
                <div className="flex items-center justify-between border-t border-black/[0.07] bg-black/[0.025] px-3.5 py-2 dark:border-white/[0.08] dark:bg-black/20">
                  <div
                    className="flex items-center gap-1.5 text-[11.5px] font-medium tabular-nums text-[#374151] dark:text-white/85"
                    title="Battery: 94% · Plugged in"
                  >
                    <BatteryCharging className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>94%</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onNavigate('/explorer');
                        }}
                        aria-label="Open File Explorer"
                        title="Open File Explorer"
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]"
                      >
                        <FluentFileExplorerIcon className="size-4" />
                      </button>
                    )}
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onNavigate('/settings');
                        }}
                        aria-label="All settings"
                        title="All settings"
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]"
                      >
                        <FluentSettingsIcon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          getAppPortalTarget() ?? document.body
        )}
    </>
  );
};
