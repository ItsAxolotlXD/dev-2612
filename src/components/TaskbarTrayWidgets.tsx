import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  LayoutGrid,
  MapPin,
  RefreshCw,
  Wind,
} from 'lucide-react';
import { getAppPortalTarget, toAppPortalCoordinates } from '../utils/appPortal';
import { flyoutPanelClassName, flyoutPanelStyle } from './FlyoutDropdown';

type WeatherKind = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow';

interface WeatherState {
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKmh: number;
  condition: string;
  location: string;
  kind: WeatherKind;
  isLive: boolean;
}

const DEFAULT_WEATHER: WeatherState = {
  tempC: 32,
  feelsLikeC: 35,
  humidity: 58,
  windKmh: 11,
  condition: 'Sunny',
  location: 'Ho Chi Minh City',
  kind: 'sunny',
  isLive: false,
};

const WEATHER_UNIT_KEY = 'sparkle_taskbar_weather_unit_v1';
const WEATHER_DATA_KEY = 'sparkle_taskbar_weather_data_v1';
const CLOCK_24H_KEY = 'sparkle_taskbar_clock_24h_v1';

const mapWmoCodeToWeather = (code: number): { kind: WeatherKind; condition: string } => {
  if (code === 0) return { kind: 'sunny', condition: 'Sunny' };
  if (code === 1 || code === 2) return { kind: 'partly-cloudy', condition: 'Partly cloudy' };
  if (code === 3 || code === 45 || code === 48) return { kind: 'cloudy', condition: 'Cloudy' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', condition: 'Rainy' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', condition: 'Snow' };
  if (code >= 95) return { kind: 'storm', condition: 'Storm' };
  return { kind: 'sunny', condition: 'Clear' };
};

export const WeatherGlyph: React.FC<{ kind: WeatherKind; size?: 'sm' | 'lg' }> = ({ kind, size = 'sm' }) => {
  const dim = size === 'lg' ? 'size-10' : 'size-[18px]';
  const iconDim = size === 'lg' ? 'size-9' : 'size-[18px]';

  if (kind === 'sunny') {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 rounded-full ${dim}`}
        style={{
          background: 'linear-gradient(145deg, #ffe14d 0%, #ffa726 55%, #f57c00 100%)',
          boxShadow: size === 'lg' ? '0 0 18px rgba(255, 167, 38, 0.45)' : '0 0 6px rgba(255, 167, 38, 0.35)',
        }}
      />
    );
  }
  if (kind === 'partly-cloudy') {
    return <CloudSun className={`${iconDim} shrink-0 text-amber-400`} strokeWidth={1.8} aria-hidden="true" />;
  }
  if (kind === 'cloudy') {
    return <Cloud className={`${iconDim} shrink-0 text-slate-400 dark:text-slate-200`} strokeWidth={1.8} aria-hidden="true" />;
  }
  if (kind === 'rain') {
    return <CloudRain className={`${iconDim} shrink-0 text-sky-400`} strokeWidth={1.8} aria-hidden="true" />;
  }
  if (kind === 'storm') {
    return <CloudLightning className={`${iconDim} shrink-0 text-amber-400`} strokeWidth={1.8} aria-hidden="true" />;
  }
  if (kind === 'snow') {
    return <CloudSnow className={`${iconDim} shrink-0 text-sky-200`} strokeWidth={1.8} aria-hidden="true" />;
  }
  return <CloudDrizzle className={`${iconDim} shrink-0 text-sky-400`} strokeWidth={1.8} aria-hidden="true" />;
};

interface TaskbarWeatherTrayProps {
  isTopBarBottom?: boolean;
  theme?: 'dark' | 'light';
  showWidgets?: boolean;
  onToggleWidgets?: () => void;
  showItemTooltip: (label: string, target: HTMLElement) => void;
  hideItemTooltip: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const TaskbarWeatherTray: React.FC<TaskbarWeatherTrayProps> = ({
  isTopBarBottom = true,
  theme = 'dark',
  showWidgets = false,
  onToggleWidgets,
  showItemTooltip,
  hideItemTooltip,
  onContextMenu,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [useFahrenheit, setUseFahrenheit] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WEATHER_UNIT_KEY) === 'F';
    } catch {
      return false;
    }
  });
  const [weather, setWeather] = useState<WeatherState>(() => {
    try {
      const saved = localStorage.getItem(WEATHER_DATA_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.tempC === 'number' && typeof parsed.condition === 'string') {
          return { ...DEFAULT_WEATHER, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_WEATHER;
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [flyoutCoords, setFlyoutCoords] = useState<{ left: number; top: number }>({ left: 8, top: 52 });

  const formatTemp = useCallback(
    (tempC: number) => {
      const val = useFahrenheit ? Math.round((tempC * 9) / 5 + 32) : Math.round(tempC);
      return `${val}°${useFahrenheit ? 'F' : 'C'}`;
    },
    [useFahrenheit]
  );

  const toggleUnit = () => {
    setUseFahrenheit((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WEATHER_UNIT_KEY, next ? 'F' : 'C');
      } catch {}
      return next;
    });
  };

  const resetDefaultWeather = () => {
    setWeather(DEFAULT_WEATHER);
    setSyncError(null);
    try {
      localStorage.removeItem(WEATHER_DATA_KEY);
    } catch {}
  };

  const syncLiveWeather = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    const fetchForCoords = async (lat: number, lon: number, label: string) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Unable to fetch weather');
      const data = await res.json();
      const current = data?.current;
      if (!current) throw new Error('Invalid weather response');

      const mapped = mapWmoCodeToWeather(Number(current.weather_code ?? 0));
      const nextWeather: WeatherState = {
        tempC: Math.round(Number(current.temperature_2m ?? 32)),
        feelsLikeC: Math.round(Number(current.apparent_temperature ?? current.temperature_2m ?? 35)),
        humidity: Math.round(Number(current.relative_humidity_2m ?? 60)),
        windKmh: Math.round(Number(current.wind_speed_10m ?? 10)),
        condition: mapped.condition,
        kind: mapped.kind,
        location: label,
        isLive: true,
      };
      setWeather(nextWeather);
      try {
        localStorage.setItem(WEATHER_DATA_KEY, JSON.stringify(nextWeather));
      } catch {}
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await fetchForCoords(pos.coords.latitude, pos.coords.longitude, 'Current location');
              } catch {
                await fetchForCoords(10.8231, 106.6297, 'Ho Chi Minh City');
              }
              resolve();
            },
            async () => {
              try {
                await fetchForCoords(10.8231, 106.6297, 'Ho Chi Minh City');
              } catch (err) {
                setSyncError(err instanceof Error ? err.message : 'Weather unavailable');
              }
              resolve();
            },
            { timeout: 4500 }
          );
        });
      } else {
        await fetchForCoords(10.8231, 106.6297, 'Ho Chi Minh City');
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Weather unavailable');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateFlyoutPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(8, Math.min(rect.left, window.innerWidth - 312));
    const y = isTopBarBottom ? rect.top - 8 : rect.bottom + 8;
    const pt = toAppPortalCoordinates(x, y);
    setFlyoutCoords({ left: pt.x, top: pt.y });
  }, [isTopBarBottom]);

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

  const tempDisplay = formatTemp(weather.tempC);
  const hourlyPreview = useMemo(
    () => [
      { label: 'Now', temp: weather.tempC },
      { label: '+1h', temp: weather.tempC },
      { label: '+2h', temp: weather.tempC - 1 },
      { label: '+3h', temp: weather.tempC - 2 },
      { label: '+4h', temp: weather.tempC - 3 },
    ],
    [weather.tempC]
  );

  return (
    <>
      <button
        ref={triggerRef}
        id="taskbar-weather-tray"
        type="button"
        onClick={() => {
          hideItemTooltip();
          setIsOpen((prev) => !prev);
        }}
        onContextMenu={onContextMenu}
        onMouseEnter={(e) => showItemTooltip(`${tempDisplay} · ${weather.condition}`, e.currentTarget)}
        onMouseLeave={hideItemTooltip}
        onFocus={(e) => showItemTooltip(`${tempDisplay} · ${weather.condition}`, e.currentTarget)}
        onBlur={hideItemTooltip}
        aria-label={`Weather: ${tempDisplay}, ${weather.condition}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`group relative flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] px-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
          isOpen
            ? 'bg-black/[0.08] ring-1 ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.14]'
            : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
        }`}
      >
        <WeatherGlyph kind={weather.kind} size="sm" />
        <span className="flex flex-col items-start justify-center leading-none">
          <span className="text-[11.5px] font-medium leading-[1.15] tracking-tight tabular-nums text-[#111827] dark:text-white">
            {tempDisplay}
          </span>
          <span className="text-[10.5px] font-normal leading-[1.15] text-[#4b5563] dark:text-white/75">
            {weather.condition}
          </span>
        </span>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={flyoutRef}
                role="dialog"
                aria-label="Weather details"
                initial={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: isTopBarBottom ? 12 : -12, scale: 0.97 }
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
                  left: `${flyoutCoords.left}px`,
                  top: `${flyoutCoords.top}px`,
                  transform: isTopBarBottom ? 'translateY(-100%)' : undefined,
                  backgroundColor: theme === 'light' ? 'rgba(246, 248, 252, 0.92)' : 'rgba(30, 34, 40, 0.92)',
                }}
                className={`z-[2147483647] w-[300px] ${flyoutPanelClassName} p-3.5 text-[#111827] dark:text-white`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#4b5563] dark:text-white/70">
                      <MapPin className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" aria-hidden="true" />
                      <span className="truncate">{weather.location}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <WeatherGlyph kind={weather.kind} size="lg" />
                      <div>
                        <div className="text-[24px] font-semibold leading-none tracking-tight tabular-nums text-[#111827] dark:text-white">
                          {tempDisplay}
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-[#4b5563] dark:text-white/80">
                          {weather.condition}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleUnit}
                    aria-label="Switch temperature unit"
                    className="cursor-pointer rounded-[6px] border border-black/[0.08] bg-black/[0.04] px-2 py-1 text-[11px] font-semibold text-[#111827] transition-colors hover:bg-black/[0.08] dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
                  >
                    {useFahrenheit ? '°F' : '°C'}
                  </button>
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-[8px] border border-black/[0.06] bg-black/[0.03] p-2 text-center dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <div>
                    <div className="text-[10px] text-[#5f6368] dark:text-white/55">Feels like</div>
                    <div className="mt-0.5 text-[11.5px] font-semibold tabular-nums">
                      {formatTemp(weather.feelsLikeC)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#5f6368] dark:text-white/55">
                      <Droplets className="size-3 text-sky-500" aria-hidden="true" />
                      <span>Humidity</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-semibold tabular-nums">{weather.humidity}%</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#5f6368] dark:text-white/55">
                      <Wind className="size-3 text-sky-400" aria-hidden="true" />
                      <span>Wind</span>
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-semibold tabular-nums">{weather.windKmh} km/h</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-5 gap-1 rounded-[8px] border border-black/[0.06] bg-black/[0.025] px-1.5 py-2 text-center dark:border-white/[0.08] dark:bg-white/[0.03]">
                  {hourlyPreview.map((slot) => (
                    <div key={slot.label} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-[#5f6368] dark:text-white/55">{slot.label}</span>
                      <WeatherGlyph kind={weather.kind} size="sm" />
                      <span className="text-[11px] font-medium tabular-nums">
                        {formatTemp(slot.temp).replace(/[CF]/, '')}
                      </span>
                    </div>
                  ))}
                </div>

                {syncError && (
                  <p className="mt-2 text-[11px] text-rose-500 dark:text-rose-300">{syncError}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={syncLiveWeather}
                    disabled={isSyncing}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-black/[0.08] bg-black/[0.04] px-2.5 py-1.5 text-[11.5px] font-medium text-[#111827] transition-colors hover:bg-black/[0.08] disabled:opacity-50 dark:border-white/[0.1] dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.12]"
                  >
                    <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>{isSyncing ? 'Syncing...' : 'Sync live weather'}</span>
                  </button>

                  {weather.isLive && (
                    <button
                      type="button"
                      onClick={resetDefaultWeather}
                      className="cursor-pointer rounded-[6px] border border-black/[0.08] bg-black/[0.04] px-2.5 py-1.5 text-[11.5px] font-medium text-[#4b5563] transition-colors hover:bg-black/[0.08] dark:border-white/[0.1] dark:bg-white/[0.07] dark:text-white/80 dark:hover:bg-white/[0.12]"
                    >
                      Reset
                    </button>
                  )}

                  {showWidgets && onToggleWidgets && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onToggleWidgets();
                      }}
                      aria-label="Open Widgets board"
                      className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-[6px] bg-[#0078d4] px-2.5 py-1.5 text-[11.5px] font-medium text-white transition-colors hover:bg-[#106ebe]"
                    >
                      <LayoutGrid className="size-3.5" aria-hidden="true" />
                      <span>Widgets</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          getAppPortalTarget() ?? document.body
        )}
    </>
  );
};

interface TaskbarClockTrayProps {
  isTopBarBottom?: boolean;
  theme?: 'dark' | 'light';
  showItemTooltip: (label: string, target: HTMLElement) => void;
  hideItemTooltip: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const TaskbarClockTray: React.FC<TaskbarClockTrayProps> = ({
  isTopBarBottom = true,
  theme = 'dark',
  showItemTooltip,
  hideItemTooltip,
  onContextMenu,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [now, setNow] = useState<Date>(() => new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [use24Hour, setUse24Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLOCK_24H_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [flyoutCoords, setFlyoutCoords] = useState<{ right: number; top: number }>({ right: 8, top: 52 });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    if (!isOpen) return;
    const today = new Date();
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(`${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`);
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

  const toggle24Hour = () => {
    setUse24Hour((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CLOCK_24H_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const formattedTime = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24Hour,
      }),
    [now, use24Hour]
  );

  const formattedTimeWithSeconds = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: !use24Hour,
      }),
    [now, use24Hour]
  );

  const formattedShortDate = useMemo(() => {
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, [now]);

  const formattedFullDate = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [now]
  );

  const monthTitle = useMemo(
    () =>
      viewMonth.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [viewMonth]
  );

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      key: string;
      day: number;
      inCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      cells.push({
        key: `${py}-${pm}-${d}`,
        day: d,
        inCurrentMonth: false,
        isToday: py === todayY && pm === todayM && d === todayD,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        key: `${year}-${month}-${d}`,
        day: d,
        inCurrentMonth: true,
        isToday: year === todayY && month === todayM && d === todayD,
      });
    }

    const remainder = 42 - cells.length;
    for (let d = 1; d <= remainder; d++) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      cells.push({
        key: `${ny}-${nm}-${d}`,
        day: d,
        inCurrentMonth: false,
        isToday: ny === todayY && nm === todayM && d === todayD,
      });
    }

    return cells;
  }, [viewMonth, now]);

  return (
    <>
      <button
        ref={triggerRef}
        id="taskbar-clock-tray"
        type="button"
        onClick={() => {
          hideItemTooltip();
          setIsOpen((prev) => !prev);
        }}
        onContextMenu={onContextMenu}
        onMouseEnter={(e) => showItemTooltip(formattedFullDate, e.currentTarget)}
        onMouseLeave={hideItemTooltip}
        onFocus={(e) => showItemTooltip(formattedFullDate, e.currentTarget)}
        onBlur={hideItemTooltip}
        aria-label={`Time and date: ${formattedTime}, ${formattedFullDate}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`relative flex h-9 shrink-0 cursor-pointer flex-col items-end justify-center rounded-[6px] px-2.5 text-right outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
          isOpen
            ? 'bg-black/[0.08] ring-1 ring-black/[0.08] dark:bg-white/[0.14] dark:ring-white/[0.14]'
            : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
        }`}
      >
        <span className="text-[11px] font-medium leading-[1.2] tracking-tight tabular-nums text-[#111827] dark:text-white">
          {formattedTime}
        </span>
        <span className="text-[10.5px] font-normal leading-[1.2] tabular-nums text-[#374151] dark:text-white/85">
          {formattedShortDate}
        </span>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={flyoutRef}
                role="dialog"
                aria-label="Date and clock calendar"
                initial={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: isTopBarBottom ? 12 : -12, scale: 0.97 }
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
                  backgroundColor: theme === 'light' ? 'rgba(246, 248, 252, 0.92)' : 'rgba(30, 34, 40, 0.92)',
                }}
                className={`z-[2147483647] w-[308px] ${flyoutPanelClassName} overflow-hidden p-0 text-[#111827] dark:text-white`}
              >
                {/* Digital Clock Header */}
                <div className="border-b border-black/[0.08] bg-black/[0.02] px-4 py-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[22px] font-semibold leading-none tracking-tight tabular-nums text-[#111827] dark:text-white">
                        {formattedTimeWithSeconds}
                      </div>
                      <div className="mt-1.5 text-[11.5px] font-medium text-[#0078d4] dark:text-[#4cc2ff]">
                        {formattedFullDate}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggle24Hour}
                      aria-label="Toggle 12 or 24 hour clock"
                      className="cursor-pointer rounded-[6px] border border-black/[0.08] bg-black/[0.04] px-2 py-1 text-[10.5px] font-semibold text-[#111827] transition-colors hover:bg-black/[0.08] dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
                    >
                      {use24Hour ? '24H' : '12H'}
                    </button>
                  </div>
                </div>

                {/* Monthly Calendar Grid */}
                <div className="p-3.5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#111827] dark:text-white">
                      {monthTitle}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                          setSelectedDateKey(`${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`);
                        }}
                        aria-label="Jump to today"
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-[6px] px-2 text-[11px] font-medium text-[#4b5563] transition-colors hover:bg-black/[0.06] hover:text-[#111827] dark:text-white/75 dark:hover:bg-white/[0.08] dark:hover:text-white"
                      >
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        <span>Today</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                        }
                        aria-label="Previous month"
                        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/80 dark:hover:bg-white/[0.08]"
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                        }
                        aria-label="Next month"
                        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/80 dark:hover:bg-white/[0.08]"
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1 grid grid-cols-7 text-center">
                    {WEEKDAY_HEADERS.map((day) => (
                      <span
                        key={day}
                        className="py-1 text-[10.5px] font-semibold text-[#5f6368] dark:text-white/55"
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {calendarCells.map((cell) => {
                      const isSelected = selectedDateKey === cell.key;
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => setSelectedDateKey(cell.key)}
                          className={`mx-auto flex size-8 cursor-pointer items-center justify-center rounded-full text-[12px] tabular-nums transition-colors ${
                            cell.isToday
                              ? 'bg-[#0078d4] font-semibold text-white'
                              : isSelected
                                ? 'bg-[#0078d4]/15 font-semibold text-[#0078d4] ring-1 ring-[#0078d4] dark:bg-[#4cc2ff]/15 dark:text-[#4cc2ff] dark:ring-[#4cc2ff]'
                                : cell.inCurrentMonth
                                  ? 'text-[#111827] hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]'
                                  : 'text-[#9ca3af] hover:bg-black/[0.04] dark:text-white/30 dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
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
