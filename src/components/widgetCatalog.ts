import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Clapperboard,
  Clock3,
  Compass,
  Dumbbell,
  Gamepad2,
  Image as ImageIcon,
  Lightbulb,
  Smartphone,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
} from 'lucide-react';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  { id: 'casual-games', name: 'Casual Games', description: 'Take a quick break with a hand-picked game.', icon: Gamepad2, accent: 'text-violet-300' },
  { id: 'countdown', name: 'Countdown', description: 'Keep an upcoming date close at hand.', icon: Clock3, accent: 'text-sky-300' },
  { id: 'daily-discovery', name: 'Daily Discovery', description: 'A small idea or fact to explore each day.', icon: Compass, accent: 'text-cyan-300' },
  { id: 'daily-wonder', name: 'Daily Wonder', description: 'A short video and story for your day.', icon: Sparkles, accent: 'text-fuchsia-300' },
  { id: 'events-near-you', name: 'Events Near You', description: 'See what is happening around your area.', icon: CalendarDays, accent: 'text-amber-300' },
  { id: 'focus-session', name: 'Focus session', description: 'Set aside a quiet block of time to focus.', icon: Timer, accent: 'text-blue-300' },
  { id: 'phone-link', name: 'Phone Link', description: 'Keep calls and messages within reach.', icon: Smartphone, accent: 'text-cyan-300' },
  { id: 'photos', name: 'Photos', description: 'A rotating look back at your favorite moments.', icon: ImageIcon, accent: 'text-sky-300' },
  { id: 'sports', name: 'Sports', description: 'Follow scores and upcoming matchups.', icon: Trophy, accent: 'text-orange-300' },
  { id: 'timer', name: 'Timer', description: 'Start a timer for work, breaks, and more.', icon: Clock3, accent: 'text-sky-300' },
  { id: 'tips', name: 'Tips', description: 'Discover accessibility and productivity shortcuts.', icon: Lightbulb, accent: 'text-amber-300' },
  { id: 'todays-moment', name: "Today's Moment", description: 'A memorable photo from your collection.', icon: ImageIcon, accent: 'text-rose-300' },
  { id: 'watchlist', name: 'Watchlist', description: 'Keep an eye on the things you follow.', icon: TrendingUp, accent: 'text-emerald-300' },
  { id: 'video-highlights', name: 'Video highlights', description: 'Catch up on new clips and featured stories.', icon: Clapperboard, accent: 'text-indigo-300' },
  { id: 'fitness', name: 'Fitness', description: 'Track movement and your next activity.', icon: Dumbbell, accent: 'text-lime-300' },
];
