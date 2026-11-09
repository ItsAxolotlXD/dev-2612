import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Gamepad2,
  Lightbulb,
  MessageSquareText,
  MoreHorizontal,
  PanelsTopLeft,
  Plus,
  Settings2,
  Smartphone,
  Sun,
  TrendingUp,
  X,
  MonitorCog,
  Sparkles,
} from 'lucide-react';
import { AddWidgetWindow } from './AddWidgetWindow';
import { WIDGET_CATALOG, type WidgetDefinition } from './widgetCatalog';

interface WidgetsFeedProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddedWidget extends WidgetDefinition {
  instanceId: string;
}

const gameTiles = [
  { label: 'Jigsaw puzzle', icon: PanelsTopLeft, color: 'from-fuchsia-500/70 to-indigo-500/80' },
  { label: 'Color blocks', icon: Gamepad2, color: 'from-sky-500/80 to-violet-500/80' },
  { label: 'Quick match', icon: Sparkles, color: 'from-orange-400/80 to-rose-500/80' },
  { label: 'Word search', icon: Compass, color: 'from-amber-400/80 to-emerald-500/80' },
  { label: 'Daily puzzle', icon: Sun, color: 'from-pink-400/80 to-fuchsia-600/80' },
  { label: 'Arcade', icon: Gamepad2, color: 'from-cyan-500/80 to-blue-600/80' },
];

const CardHeader = ({ icon, title, iconClass = 'text-white/80' }: { icon: ReactNode; title: string; iconClass?: string }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`shrink-0 ${iconClass}`}>{icon}</span>
      <span className="truncate text-[13px] font-medium text-white/90">{title}</span>
    </div>
    <MoreHorizontal className="h-5 w-5 shrink-0 text-white/75" aria-hidden="true" />
  </div>
);

const WeatherWidget = () => (
  <article className="min-h-[380px] rounded-[10px] border border-white/[0.035] bg-[#293126] p-4 shadow-sm">
    <CardHeader icon={<Sun className="h-4 w-4 fill-amber-400 text-amber-400" />} title="Sơn Dương" />
    <div className="flex items-center gap-3 py-2">
      <CloudSun className="h-14 w-14 shrink-0 text-sky-200" strokeWidth={1.4} aria-hidden="true" />
      <div className="flex items-start gap-1">
        <span className="text-[28px] font-semibold leading-none tracking-tight">18</span>
        <span className="mt-0.5 text-xs">°C</span>
      </div>
      <p className="ml-auto max-w-[116px] text-[11px] leading-[1.45] text-white/75">1–2 cm of rain expected on Thursday</p>
    </div>
    <div className="mt-4 grid grid-cols-5 gap-1 rounded-lg bg-black/15 px-2 py-3 text-center">
      {['6 PM', '7 PM', '8 PM', '9 PM', '10 PM'].map((hour, index) => (
        <div key={hour}>
          <div className="text-[10px] font-medium text-white/75">{hour}</div>
          <div className="mt-2 text-xs font-semibold">18°</div>
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-sky-300"><Droplets className="h-3 w-3" aria-hidden="true" />{[10, 7, 7, 7, 6][index]}%</div>
        </div>
      ))}
    </div>
    <div className="mt-5 grid grid-cols-5 gap-1 text-center">
      {[
        { day: 'Tue', icon: CloudSun, temperature: '22°', low: '16°' },
        { day: 'Wed', icon: CloudSun, temperature: '24°', low: '18°' },
        { day: 'Thu', icon: CloudRain, temperature: '20°', low: '18°' },
        { day: 'Fri', icon: CloudSun, temperature: '24°', low: '20°' },
        { day: 'Sat', icon: CloudSun, temperature: '28°', low: '22°' },
      ].map(({ day, icon: ForecastIcon, temperature, low }) => (
        <div key={day} className="flex flex-col items-center">
          <span className="text-[10px] font-medium text-white/80">{day}</span>
          <ForecastIcon className="my-2 h-6 w-6 text-sky-200" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-[11px] font-semibold">{temperature}</span>
          <span className="mt-1 text-[10px] text-white/55">{low}</span>
        </div>
      ))}
    </div>
    <button type="button" className="mt-4 w-full text-center text-[11px] font-medium text-sky-300 hover:text-sky-200">See full forecast</button>
  </article>
);

const PhotosWidget = () => (
  <article className="group relative min-h-[320px] overflow-hidden rounded-[10px] border border-white/[0.05] bg-[#252924] shadow-sm">
    <img src="/search-experience/forest-wallpaper.png" alt="Sunlight falling across a green forest" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/75" />
    <div className="relative flex h-full min-h-[320px] flex-col p-4">
      <CardHeader icon={<span className="block h-2.5 w-2.5 rounded-full bg-sky-400" />} title="Photos" />
      <div className="mt-auto text-center">
        <p className="mx-auto max-w-[280px] text-[15px] font-semibold leading-snug text-white drop-shadow-md">Relive your memories by uploading your photos to the OneDrive app.</p>
        <button type="button" className="mt-3 rounded bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/65">Get mobile app</button>
      </div>
    </div>
  </article>
);

const TipsWidget = () => (
  <article className="min-h-[150px] rounded-[10px] border border-white/[0.035] bg-[#293126] p-4 shadow-sm">
    <CardHeader icon={<Lightbulb className="h-4 w-4 fill-amber-300 text-amber-300" />} title="Tips" />
    <div className="flex gap-3">
      <div className="relative mt-1 flex h-10 w-[58px] shrink-0 items-center justify-center rounded-md bg-slate-600/90">
        <MessageSquareText className="h-7 w-7 text-sky-300" aria-hidden="true" />
        <span className="absolute left-2 top-2 h-0.5 w-6 bg-sky-300/90" />
        <span className="absolute left-2 top-4 h-0.5 w-4 bg-sky-300/70" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-snug">Use live captions for audio</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/75">Press Windows key + Ctrl + L to enable quickly</p>
        <button type="button" className="mt-3 text-[11px] font-medium text-sky-300 hover:text-sky-200">More accessibility tips</button>
      </div>
    </div>
  </article>
);

const MarketsWidget = () => (
  <article className="min-h-[150px] rounded-[10px] border border-white/[0.035] bg-[#293126] p-4 shadow-sm">
    <CardHeader icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} title="Markets" />
    <div className="grid grid-cols-3 gap-3 pt-1">
      {[
        { name: 'S&P 500', change: '+0.31%', price: '7,376.86', positive: true },
        { name: 'DOW', change: '-0.46%', price: '51,285.73', positive: false },
        { name: 'NASDAQ', change: '+1.09%', price: '24,579.43', positive: true },
      ].map((market) => (
        <div key={market.name} className="min-w-0">
          <p className="truncate text-[11px] font-medium">{market.name}</p>
          <p className={`mt-1 text-[10px] ${market.positive ? 'text-emerald-400' : 'text-rose-300'}`}>{market.change}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold tabular-nums">{market.price}</p>
        </div>
      ))}
    </div>
    <button type="button" className="mt-3 w-full text-center text-[11px] font-medium text-sky-300 hover:text-sky-200">See more in Markets</button>
  </article>
);

const GamesWidget = () => (
  <article className="min-h-[340px] rounded-[10px] border border-white/[0.035] bg-[#2b2c2a] p-4 shadow-sm">
    <CardHeader icon={<Gamepad2 className="h-4 w-4 text-sky-300" />} title="Games" />
    <div className="grid grid-cols-3 gap-2">
      {gameTiles.map(({ label, icon: TileIcon, color }) => (
        <button key={label} type="button" aria-label={label} className={`flex aspect-square items-center justify-center overflow-hidden rounded-[8px] bg-gradient-to-br ${color} shadow-inner transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`}>
          <TileIcon className="h-8 w-8 text-white drop-shadow-md" strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
    <div className="mt-3 flex items-center justify-between">
      <div className="flex gap-1.5" aria-hidden="true"><span className="h-1.5 w-1.5 rounded-full bg-white/60" /><span className="h-1.5 w-1.5 rounded-full bg-white/25" /></div>
      <button type="button" className="text-[11px] font-medium text-sky-300 hover:text-sky-200">Explore more games</button>
    </div>
  </article>
);

const PhoneLinkWidget = () => (
  <article className="flex min-h-[174px] flex-col rounded-[10px] border border-white/[0.035] bg-[#303536] p-4 shadow-sm">
    <CardHeader icon={<Smartphone className="h-4 w-4 text-sky-300" />} title="Phone Link" />
    <div className="mt-auto">
      <p className="text-[12px] font-semibold">Use your mobile device from your PC</p>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-white/75"><Smartphone className="h-3.5 w-3.5" aria-hidden="true" />Make and take calls</div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/75"><MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />Read and reply to messages</div>
    </div>
  </article>
);

const DailyWonderWidget = () => (
  <article className="min-h-[174px] rounded-[10px] border border-white/[0.035] bg-[#293126] p-4 shadow-sm">
    <CardHeader icon={<Sparkles className="h-4 w-4 text-violet-300" />} title="Daily Wonder" />
    <div className="flex items-center gap-3">
      <img src="/search-experience/river-city-at-dusk.png" alt="A historic city and river at dusk" className="h-[66px] w-[96px] shrink-0 rounded-md object-cover" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-white/65">Drone TV</p>
        <p className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-snug">Mastering the skies: Featured cinematic views</p>
      </div>
    </div>
    <button type="button" className="mt-3 w-full text-center text-[11px] font-medium text-sky-300 hover:text-sky-200">Watch more videos like this</button>
  </article>
);

const HistoryWidget = () => (
  <article className="min-h-[174px] rounded-[10px] border border-white/[0.035] bg-[#34312b] p-4 shadow-sm">
    <CardHeader icon={<MonitorCog className="h-4 w-4 text-cyan-300" />} title="High-tech history quiz" />
    <div className="flex items-center gap-3">
      <div className="flex h-[70px] w-[96px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-500 to-slate-800"><MonitorCog className="h-9 w-9 text-slate-100/90" strokeWidth={1.4} aria-hidden="true" /></div>
      <p className="text-[12px] font-medium leading-snug">Which of these did Ada Lovelace publish?</p>
    </div>
    <button type="button" className="mt-3 w-full text-center text-[11px] font-medium text-sky-300 hover:text-sky-200">Take the quiz</button>
  </article>
);

const AddedWidgetCard = ({ widget }: { widget: AddedWidget; key?: string }) => {
  const Icon = widget.icon;
  return (
    <article className="min-h-[174px] rounded-[10px] border border-white/[0.035] bg-[#293126] p-4 shadow-sm">
      <CardHeader icon={<Icon className={`h-4 w-4 ${widget.accent}`} />} title={widget.name} />
      <div className="flex min-h-[100px] flex-col items-center justify-center text-center">
        <Icon className={`mb-2 h-8 w-8 ${widget.accent}`} aria-hidden="true" />
        <p className="max-w-[230px] text-[11px] leading-relaxed text-white/70">{widget.description}</p>
      </div>
    </article>
  );
};

const DiscoverView = ({ onAddWidget }: { onAddWidget: () => void }) => (
  <div className="mx-auto flex max-w-4xl flex-col items-start rounded-[14px] border border-white/[0.06] bg-white/[0.035] p-6 sm:p-8">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300"><Compass className="h-5 w-5" aria-hidden="true" /></div>
    <h2 className="text-xl font-semibold tracking-tight">Find a widget for your day</h2>
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">Add useful snapshots for focus, photos, sports, and more. Choose a widget to preview it before adding it to your board.</p>
    <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {WIDGET_CATALOG.slice(0, 5).map((widget) => {
        const Icon = widget.icon;
        return <div key={widget.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2.5"><Icon className={`h-4 w-4 shrink-0 ${widget.accent}`} aria-hidden="true" /><span className="truncate text-[11px] text-white/75">{widget.name}</span></div>;
      })}
    </div>
    <button type="button" onClick={onAddWidget} className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-sky-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"><Plus className="h-4 w-4" aria-hidden="true" />Browse widgets</button>
  </div>
);

export const WidgetsFeed = ({ isOpen, onClose }: WidgetsFeedProps) => {
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'widgets' | 'discover'>('widgets');
  const [addedWidgets, setAddedWidgets] = useState<AddedWidget[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const closeAddWidgetWindow = useCallback(() => setIsAddWidgetOpen(false), []);

  useEffect(() => {
    if (!isOpen) {
      setIsAddWidgetOpen(false);
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isAddWidgetOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = boardRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !boardRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAddWidgetOpen, onClose]);

  const addWidgetToBoard = useCallback((widget: WidgetDefinition) => {
    setAddedWidgets((current) => [...current, { ...widget, instanceId: `${widget.id}-${Date.now()}-${current.length}` }]);
    setActiveSection('widgets');
    setIsAddWidgetOpen(false);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[1100] bg-black/55 p-1.5 backdrop-blur-[3px] sm:p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <motion.section
              ref={boardRef}
              id="widgets-feed-window"
              role="dialog"
              aria-modal="true"
              aria-labelledby="widgets-feed-title"
              aria-hidden={isAddWidgetOpen}
              initial={{ x: prefersReducedMotion ? 0 : '-100%', opacity: prefersReducedMotion ? 1 : 0.88 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: prefersReducedMotion ? 0 : '-100%', opacity: prefersReducedMotion ? 1 : 0.88 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-full overflow-hidden rounded-[12px] border border-white/15 bg-[#1d241b] text-white shadow-[0_28px_96px_rgba(0,0,0,0.55)]"
              onClick={(event) => event.stopPropagation()}
            >
              <aside className="flex w-[66px] shrink-0 flex-col items-center justify-between border-r border-white/[0.07] bg-[#172018] py-3 sm:w-[78px] sm:py-4">
                <div className="flex w-full flex-col items-center gap-2 px-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveSection('widgets')}
                    aria-current={activeSection === 'widgets' ? 'page' : undefined}
                    className={`flex w-full flex-col items-center gap-1 rounded-[7px] px-1 py-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${activeSection === 'widgets' ? 'bg-white/[0.09] text-white' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    <PanelsTopLeft className="h-5 w-5 text-sky-300" aria-hidden="true" />
                    Widgets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('discover')}
                    aria-current={activeSection === 'discover' ? 'page' : undefined}
                    className={`flex w-full flex-col items-center gap-1 rounded-[7px] px-1 py-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${activeSection === 'discover' ? 'bg-white/[0.09] text-white' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    <Compass className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                    Discover
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddWidgetOpen(true)}
                  aria-label="Manage widgets"
                  className="flex h-10 w-10 items-center justify-center rounded-md text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  <Settings2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-[62px] shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6">
                  <h1 id="widgets-feed-title" className="text-[17px] font-semibold tracking-tight sm:text-lg">{activeSection === 'widgets' ? 'Widgets' : 'Discover'}</h1>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddWidgetOpen(true)}
                      aria-label="Add widgets"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      <Plus className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <button
                      ref={closeButtonRef}
                      type="button"
                      onClick={onClose}
                      aria-label="Close Widgets Feed"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-3 sm:px-6 sm:pb-7 sm:pt-4">
                  {activeSection === 'widgets' ? (
                    <div className="grid grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-3.5">
                      <div className="md:row-span-2"><WeatherWidget /></div>
                      <div className="md:row-span-2"><PhotosWidget /></div>
                      <TipsWidget />
                      <MarketsWidget />
                      <div className="md:row-span-2"><GamesWidget /></div>
                      <PhoneLinkWidget />
                      <DailyWonderWidget />
                      <HistoryWidget />
                      {addedWidgets.map((widget) => <AddedWidgetCard key={widget.instanceId} widget={widget} />)}
                    </div>
                  ) : (
                    <DiscoverView onAddWidget={() => setIsAddWidgetOpen(true)} />
                  )}
                </main>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AddWidgetWindow
        isOpen={isOpen && isAddWidgetOpen}
        onClose={closeAddWidgetWindow}
        onAddWidget={addWidgetToBoard}
      />
    </>
  );
};
