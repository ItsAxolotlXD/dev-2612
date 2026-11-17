import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Film,
  FolderPlus,
  Home as HomeIcon,
  ListMusic,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Music,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Settings as SettingsIcon,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';

type NavSection = 'home' | 'music' | 'videos' | 'queue' | 'playlist' | 'settings';
type MusicSubTab = 'songs' | 'albums' | 'artists';
type SortOrder = 'az' | 'za' | 'artist';
type RepeatMode = 'off' | 'all' | 'one';

interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  durationSec: number;
  mediaType: 'audio' | 'video';
  coverGradient: string;
  coverAccent: string;
  coverPattern: 'skyline' | 'concrete' | 'room' | 'corridor' | 'astro' | 'water' | 'palm' | 'portrait' | 'neon' | 'video';
  synthScale: number[];
  bpm: number;
  objectUrl?: string;
}

interface MediaPlaylist {
  id: string;
  name: string;
  kind: 'music' | 'video';
  trackIds: string[];
}

const INITIAL_TRACKS: MediaTrack[] = [
  {
    id: 'track-certain-emotion',
    title: 'A Certain Kind Of Emotion',
    artist: 'Flight of Venus',
    album: 'A Certain Kind Of Emotion',
    genre: 'Synthwave',
    durationSec: 214,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(155deg, #0b2447 0%, #19376d 45%, #a5d7e8 100%)',
    coverAccent: '#60a5fa',
    coverPattern: 'skyline',
    synthScale: [261.63, 311.13, 392.0, 466.16, 523.25],
    bpm: 96,
  },
  {
    id: 'track-all-i-have',
    title: 'All I Have Is Me',
    artist: 'Kicking Gloves',
    album: 'All I Have Is Me',
    genre: 'Indie',
    durationSec: 192,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(135deg, #4b5563 0%, #9ca3af 55%, #facc15 100%)',
    coverAccent: '#facc15',
    coverPattern: 'concrete',
    synthScale: [293.66, 349.23, 440.0, 523.25, 587.33],
    bpm: 108,
  },
  {
    id: 'track-all-arguments',
    title: 'All The Arguments',
    artist: 'Ginger Teenager',
    album: 'All The Arguments',
    genre: 'Pop',
    durationSec: 205,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(145deg, #713f12 0%, #a16207 42%, #fde68a 100%)',
    coverAccent: '#f59e0b',
    coverPattern: 'room',
    synthScale: [220.0, 261.63, 329.63, 392.0, 440.0],
    bpm: 104,
  },
  {
    id: 'track-ardor',
    title: 'Ardor & Anticipation',
    artist: 'Pointlessknot',
    album: 'Ardor & Anticipation',
    genre: 'Ambient',
    durationSec: 248,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(180deg, #14532d 0%, #3f6212 52%, #bef264 100%)',
    coverAccent: '#a3e635',
    coverPattern: 'corridor',
    synthScale: [196.0, 246.94, 293.66, 369.99, 440.0],
    bpm: 82,
  },
  {
    id: 'track-touch-punk',
    title: 'A Touch Of Your Punk',
    artist: 'Compass Tribute',
    album: 'A Touch Of Your Punk',
    genre: 'Electronic',
    durationSec: 186,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(145deg, #ea580c 0%, #f97316 45%, #38bdf8 100%)',
    coverAccent: '#fb923c',
    coverPattern: 'astro',
    synthScale: [329.63, 392.0, 493.88, 587.33, 659.25],
    bpm: 118,
  },
  {
    id: 'track-complete-strangers',
    title: 'Complete Strangers',
    artist: 'Corbin Revival',
    album: 'Complete Strangers',
    genre: 'Indie',
    durationSec: 229,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(155deg, #450a0a 0%, #b91c1c 50%, #fda4af 100%)',
    coverAccent: '#f43f5e',
    coverPattern: 'water',
    synthScale: [246.94, 293.66, 369.99, 440.0, 493.88],
    bpm: 92,
  },
  {
    id: 'track-compromise',
    title: 'Compromise Moves Fast',
    artist: 'Pete Brown',
    album: 'Compromise Moves Fast',
    genre: 'Synthwave',
    durationSec: 218,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(160deg, #1e1b4b 0%, #9333ea 52%, #fbbf24 100%)',
    coverAccent: '#e879f9',
    coverPattern: 'palm',
    synthScale: [261.63, 329.63, 392.0, 493.88, 523.25],
    bpm: 112,
  },
  {
    id: 'track-crazy-times',
    title: 'Crazy Times',
    artist: 'Saving Gabrielle',
    album: 'Crazy Times',
    genre: 'Pop',
    durationSec: 199,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(150deg, #172554 0%, #2563eb 55%, #f472b6 100%)',
    coverAccent: '#93c5fd',
    coverPattern: 'portrait',
    synthScale: [293.66, 369.99, 440.0, 554.37, 587.33],
    bpm: 110,
  },
  {
    id: 'track-manic-trust',
    title: 'Manic Trust',
    artist: 'Deaf Tortoises',
    album: 'Night Frequencies',
    genre: 'Electronic',
    durationSec: 209,
    mediaType: 'audio',
    coverGradient: 'linear-gradient(145deg, #311042 0%, #6d28d9 48%, #f97316 100%)',
    coverAccent: '#fb923c',
    coverPattern: 'neon',
    synthScale: [220.0, 261.63, 329.63, 440.0, 523.25],
    bpm: 116,
  },
  {
    id: 'video-sunset-reel',
    title: 'Coastal Horizon Reel',
    artist: 'Sparkle Studio Clips',
    album: 'Video Library',
    genre: 'Ambient',
    durationSec: 65,
    mediaType: 'video',
    coverGradient: 'linear-gradient(135deg, #0f172a 0%, #0284c7 55%, #38bdf8 100%)',
    coverAccent: '#38bdf8',
    coverPattern: 'video',
    synthScale: [196.0, 246.94, 293.66, 392.0, 440.0],
    bpm: 86,
  },
  {
    id: 'video-neon-motion',
    title: 'Midnight Synth Session',
    artist: 'Studio Live',
    album: 'Video Library',
    genre: 'Synthwave',
    durationSec: 84,
    mediaType: 'video',
    coverGradient: 'linear-gradient(135deg, #1f0a2e 0%, #be185d 55%, #fb7185 100%)',
    coverAccent: '#f43f5e',
    coverPattern: 'video',
    synthScale: [220.0, 277.18, 329.63, 440.0, 554.37],
    bpm: 105,
  },
];

const INITIAL_PLAYLISTS: MediaPlaylist[] = [
  { id: 'pl-workout', name: 'Workout Playlist', kind: 'music', trackIds: ['track-touch-punk', 'track-manic-trust', 'track-compromise'] },
  { id: 'pl-pop', name: 'Pop Music Collection', kind: 'music', trackIds: ['track-all-arguments', 'track-crazy-times', 'track-all-i-have'] },
  { id: 'pl-wedding', name: "Kim's Wedding", kind: 'video', trackIds: ['video-sunset-reel', 'video-neon-motion'] },
  { id: 'pl-enjoy', name: 'Enjoy Pop', kind: 'music', trackIds: ['track-certain-emotion', 'track-complete-strangers'] },
  { id: 'pl-80s', name: "Upbeat 80's Groove", kind: 'music', trackIds: ['track-compromise', 'track-manic-trust', 'track-touch-punk'] },
  { id: 'pl-uplifting', name: 'Uplifting Motions', kind: 'music', trackIds: ['track-ardor', 'track-all-i-have'] },
  { id: 'pl-dream', name: 'Fantastic Dream', kind: 'music', trackIds: ['track-complete-strangers', 'track-certain-emotion'] },
];

const formatTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AlbumCoverArt: React.FC<{ track: MediaTrack; className?: string }> = ({ track, className = 'w-full h-full' }) => (
  <div
    className={`relative overflow-hidden select-none ${className}`}
    style={{ background: track.coverGradient }}
  >
    {track.coverPattern === 'skyline' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="0" y="0" width="46" height="100" fill="#071326" opacity="0.55" />
        <rect x="46" y="0" width="6" height="100" fill="#f8fafc" opacity="0.9" />
        <rect x="8" y="20" width="32" height="58" fill="#bae6fd" opacity="0.65" />
        <rect x="18" y="14" width="12" height="64" fill="#0f172a" opacity="0.7" />
        <circle cx="72" cy="70" r="8" fill="#0f172a" opacity="0.82" />
        <rect x="67" y="77" width="10" height="23" rx="3" fill="#0f172a" opacity="0.85" />
      </svg>
    )}
    {track.coverPattern === 'concrete' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="36,12 90,12 90,66 36,66" fill="#fde047" opacity="0.9" />
        <line x1="0" y1="68" x2="100" y2="26" stroke="#1f2937" strokeWidth="2.5" opacity="0.65" />
        <rect x="8" y="62" width="84" height="30" fill="#e5e7eb" opacity="0.35" />
      </svg>
    )}
    {track.coverPattern === 'room' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="10" y="10" width="20" height="20" rx="2" fill="#292524" opacity="0.7" />
        <rect x="35" y="10" width="20" height="20" rx="2" fill="#292524" opacity="0.7" />
        <rect x="60" y="10" width="20" height="20" rx="2" fill="#292524" opacity="0.7" />
        <rect x="18" y="54" width="64" height="26" rx="4" fill="#f43f5e" opacity="0.82" />
        <circle cx="50" cy="40" r="10" fill="#fde68a" opacity="0.92" />
      </svg>
    )}
    {track.coverPattern === 'corridor' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="12" y="10" width="76" height="80" fill="none" stroke="#d9f99d" strokeWidth="3" opacity="0.45" />
        <rect x="24" y="20" width="52" height="60" fill="none" stroke="#d9f99d" strokeWidth="2.5" opacity="0.55" />
        <rect x="36" y="30" width="28" height="40" fill="#ecfccb" opacity="0.28" />
        <circle cx="50" cy="52" r="5" fill="#052e16" />
        <rect x="46" y="57" width="8" height="28" rx="3" fill="#052e16" />
      </svg>
    )}
    {track.coverPattern === 'astro' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="52" cy="52" r="34" fill="#0ea5e9" opacity="0.85" />
        <circle cx="52" cy="36" r="15" fill="#f97316" />
        <circle cx="52" cy="36" r="9" fill="#1e293b" opacity="0.8" />
        <path d="M28 84C30 62 74 62 76 84" fill="#ef4444" />
        <circle cx="24" cy="34" r="5" fill="#fbbf24" opacity="0.9" />
      </svg>
    )}
    {track.coverPattern === 'water' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="52" cy="58" rx="32" ry="18" fill="#fecdd3" opacity="0.6" />
        <path d="M10 38Q50 20 90 42" stroke="#ffe4e6" strokeWidth="3" fill="none" opacity="0.7" />
        <circle cx="48" cy="46" r="9" fill="#fff1f2" opacity="0.9" />
      </svg>
    )}
    {track.coverPattern === 'palm' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="56" r="24" fill="#f59e0b" opacity="0.92" />
        <rect x="24" y="64" width="52" height="4" fill="#9333ea" opacity="0.55" />
        <path d="M62 88L58 46" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
        <path d="M58 46C46 36 36 42 32 50M58 46C70 36 80 42 84 50M58 46C50 30 64 26 74 32" stroke="#1e1b4b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
    )}
    {track.coverPattern === 'portrait' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="44" y="0" width="56" height="100" fill="#ec4899" opacity="0.25" />
        <circle cx="46" cy="44" r="18" fill="#dbeafe" opacity="0.88" />
        <path d="M22 92C22 68 70 68 70 92" fill="#1e3a8a" opacity="0.9" />
      </svg>
    )}
    {track.coverPattern === 'neon' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="46" r="22" fill="#fb923c" opacity="0.85" />
        <circle cx="50" cy="46" r="13" fill="#1e1b4b" opacity="0.85" />
        <path d="M18 88C24 66 76 66 82 88" fill="#c084fc" opacity="0.85" />
      </svg>
    )}
    {track.coverPattern === 'video' && (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="22" fill="rgba(255,255,255,0.22)" />
        <polygon points="44,38 66,50 44,62" fill="#ffffff" />
      </svg>
    )}
  </div>
);

export const MediaPlayer: React.FC = () => {
  const [tracks, setTracks] = useState<MediaTrack[]>(INITIAL_TRACKS);
  const [playlists, setPlaylists] = useState<MediaPlaylist[]>(INITIAL_PLAYLISTS);
  const [activeNav, setActiveNav] = useState<NavSection>('music');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(INITIAL_PLAYLISTS[0].id);
  const [musicSubTab, setMusicSubTab] = useState<MusicSubTab>('albums');
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const [selectedGenre, setSelectedGenre] = useState<string>('All genres');
  const [libraryLocations, setLibraryLocations] = useState<string[]>([
    'C:\\Users\\Sparkle\\Music',
    'C:\\Users\\Sparkle\\Videos',
  ]);

  // Playback State (starts on "Manic Trust" at 1:24 matching the reference screenshot)
  const [queueIds, setQueueIds] = useState<string[]>(() => INITIAL_TRACKS.filter((t) => t.mediaType === 'audio').map((t) => t.id));
  const [currentTrackId, setCurrentTrackId] = useState<string>('track-manic-trust');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(84);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState(false);
  const [isCompactPlayer, setIsCompactPlayer] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const synthCtxRef = useRef<AudioContext | null>(null);
  const synthTimerRef = useRef<number | null>(null);
  const synthStepRef = useRef(0);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) ?? tracks[0],
    [currentTrackId, tracks]
  );

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      tracks.forEach((t) => {
        if (t.objectUrl) URL.revokeObjectURL(t.objectUrl);
      });
    };
  }, []);

  // Stop Web Audio synth helper
  const stopSynth = useCallback(() => {
    if (synthTimerRef.current !== null) {
      window.clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
  }, []);

  // Procedural Web Audio synth note for built-in tracks without external audio files
  const startSynthForTrack = useCallback(
    (track: MediaTrack) => {
      stopSynth();
      if (track.objectUrl) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!synthCtxRef.current) {
          synthCtxRef.current = new AudioCtx();
        }
        const ctx = synthCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const stepMs = Math.round((60 / track.bpm) * 500);
        const playStep = () => {
          if (isMuted || volume <= 0.01) return;
          const freq = track.synthScale[synthStepRef.current % track.synthScale.length];
          synthStepRef.current += 1;

          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = track.genre === 'Ambient' ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          const peakGain = Math.min(0.12, volume * 0.12);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.38);
        };

        playStep();
        synthTimerRef.current = window.setInterval(playStep, stepMs);
      } catch {
        // ignore Web Audio restrictions
      }
    },
    [isMuted, stopSynth, volume]
  );

  // Sync HTMLAudio/Video or Synth + progress timer
  const handleSelectTrack = useCallback((track: MediaTrack, autoPlay = true) => {
    setCurrentTrackId(track.id);
    setCurrentTime(0);
    setIsPlaying(autoPlay);
    if (track.mediaType === 'video') {
      setIsNowPlayingExpanded(true);
    }
    setQueueIds((prev) => (prev.includes(track.id) ? prev : [...prev, track.id]));
  }, []);

  const playNextTrack = useCallback(() => {
    if (queueIds.length === 0) return;
    if (repeatMode === 'one') {
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }
    if (isShuffle && queueIds.length > 1) {
      const candidates = queueIds.filter((id) => id !== currentTrackId);
      const nextId = candidates[Math.floor(Math.random() * candidates.length)];
      const nextTrack = tracks.find((t) => t.id === nextId);
      if (nextTrack) handleSelectTrack(nextTrack, true);
      return;
    }
    const idx = queueIds.indexOf(currentTrackId);
    const nextIdx = idx + 1;
    if (nextIdx >= queueIds.length) {
      if (repeatMode === 'all') {
        const first = tracks.find((t) => t.id === queueIds[0]);
        if (first) handleSelectTrack(first, true);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
      return;
    }
    const nextTrack = tracks.find((t) => t.id === queueIds[nextIdx]);
    if (nextTrack) handleSelectTrack(nextTrack, true);
  }, [currentTrackId, handleSelectTrack, isShuffle, queueIds, repeatMode, tracks]);

  const playPreviousTrack = useCallback(() => {
    if (currentTime > 4) {
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      if (videoRef.current) videoRef.current.currentTime = 0;
      return;
    }
    if (queueIds.length === 0) return;
    const idx = queueIds.indexOf(currentTrackId);
    const prevIdx = idx <= 0 ? queueIds.length - 1 : idx - 1;
    const prevTrack = tracks.find((t) => t.id === queueIds[prevIdx]);
    if (prevTrack) handleSelectTrack(prevTrack, true);
  }, [currentTime, currentTrackId, handleSelectTrack, queueIds, tracks]);

  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      stopSynth();
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    if (currentTrack.objectUrl) {
      stopSynth();
      const mediaEl = currentTrack.mediaType === 'video' ? videoRef.current : audioRef.current;
      if (mediaEl) {
        mediaEl.volume = isMuted ? 0 : volume;
        mediaEl.playbackRate = playbackRate;
        void mediaEl.play().catch(() => {});
      }
      return;
    }

    startSynthForTrack(currentTrack);
    const tick = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev + playbackRate >= currentTrack.durationSec) {
          window.setTimeout(() => playNextTrack(), 0);
          return currentTrack.durationSec;
        }
        return prev + playbackRate;
      });
    }, 1000);

    return () => {
      window.clearInterval(tick);
      stopSynth();
    };
  }, [currentTrack, isMuted, isPlaying, playbackRate, playNextTrack, startSynthForTrack, stopSynth, volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.playbackRate = playbackRate;
    }
  }, [isMuted, playbackRate, volume]);

  useEffect(() => () => stopSynth(), [stopSynth]);

  const handleSeek = (nextSec: number) => {
    const clamped = Math.max(0, Math.min(currentTrack.durationSec, nextSec));
    setCurrentTime(clamped);
    if (currentTrack.objectUrl) {
      if (currentTrack.mediaType === 'audio' && audioRef.current) {
        audioRef.current.currentTime = clamped;
      } else if (currentTrack.mediaType === 'video' && videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
    }
  };

  const handleImportMediaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const imported: MediaTrack[] = [];
    Array.from<File>(fileList).forEach((file, idx) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mkv|mov)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^.]+$/, '');
      imported.push({
        id: `local-${Date.now()}-${idx}`,
        title: cleanName,
        artist: 'Local File',
        album: isVideo ? 'Local Videos' : 'Local Music',
        genre: 'Local',
        durationSec: 180,
        mediaType: isVideo ? 'video' : 'audio',
        coverGradient: isVideo
          ? 'linear-gradient(135deg, #0f172a 0%, #0369a1 60%, #38bdf8 100%)'
          : 'linear-gradient(135deg, #7c2d12 0%, #ea580c 55%, #fdba74 100%)',
        coverAccent: '#ea580c',
        coverPattern: isVideo ? 'video' : 'neon',
        synthScale: [261.63, 329.63, 392.0, 523.25],
        bpm: 100,
        objectUrl: url,
      });
    });

    setTracks((prev) => [...imported, ...prev]);
    if (imported[0]) {
      setLibraryLocations((prev) =>
        prev.includes('Local Imported Files') ? prev : [...prev, 'Local Imported Files']
      );
      handleSelectTrack(imported[0], true);
      setActiveNav(imported[0].mediaType === 'video' ? 'videos' : 'music');
    }
    e.target.value = '';
  };

  const availableGenres = useMemo(() => {
    const set = new Set<string>(['All genres']);
    tracks.filter((t) => t.mediaType === 'audio').forEach((t) => set.add(t.genre));
    return Array.from(set);
  }, [tracks]);

  const filteredMusicTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = tracks.filter((t) => {
      if (t.mediaType !== 'audio') return false;
      if (selectedGenre !== 'All genres' && t.genre !== selectedGenre) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortOrder === 'za') return b.title.localeCompare(a.title);
      if (sortOrder === 'artist') return a.artist.localeCompare(b.artist);
      return a.title.localeCompare(b.title);
    });
  }, [searchQuery, selectedGenre, sortOrder, tracks]);

  const groupedAlbums = useMemo(() => {
    const groups = new Map<string, MediaTrack[]>();
    for (const track of filteredMusicTracks) {
      const firstChar = track.title.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      const arr = groups.get(letter) ?? [];
      arr.push(track);
      groups.set(letter, arr);
    }
    return Array.from(groups.entries());
  }, [filteredMusicTracks]);

  const videoTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tracks.filter(
      (t) =>
        t.mediaType === 'video' &&
        (!q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    );
  }, [searchQuery, tracks]);

  const activePlaylist = useMemo(
    () => playlists.find((p) => p.id === selectedPlaylistId) ?? playlists[0],
    [playlists, selectedPlaylistId]
  );

  const handleShuffleAndPlay = (list: MediaTrack[]) => {
    if (list.length === 0) return;
    setIsShuffle(true);
    setQueueIds(list.map((t) => t.id));
    const randomTrack = list[Math.floor(Math.random() * list.length)];
    handleSelectTrack(randomTrack, true);
  };

  const handleCreatePlaylist = () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    const next: MediaPlaylist = {
      id: `pl-${Date.now()}`,
      name: trimmed,
      kind: 'music',
      trackIds: [currentTrack.id],
    };
    setPlaylists((prev) => [...prev, next]);
    setSelectedPlaylistId(next.id);
    setActiveNav('playlist');
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  const progressPct = currentTrack.durationSec > 0
    ? Math.min(100, Math.max(0, (currentTime / currentTrack.durationSec) * 100))
    : 0;

  return (
    <div className="w-full flex-1 h-full min-h-0 flex flex-col bg-[#f3f3f3] dark:bg-[#202020] text-[#1a1a1a] dark:text-[#f5f5f5] select-none relative overflow-hidden">
      {/* Hidden native media elements for user-imported local files */}
      {currentTrack.objectUrl && currentTrack.mediaType === 'audio' && (
        <audio
          ref={audioRef}
          src={currentTrack.objectUrl}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) {
              setTracks((prev) =>
                prev.map((t) => (t.id === currentTrack.id ? { ...t, durationSec: Math.round(dur) } : t))
              );
            }
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={playNextTrack}
          className="hidden"
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        multiple
        onChange={handleImportMediaFiles}
        className="hidden"
      />

      {/* Main Split Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        {!isCompactPlayer && (
          <aside className="w-[216px] sm:w-[236px] shrink-0 h-full flex flex-col px-2.5 pt-2.5 pb-2 bg-[#f3f3f3] dark:bg-[#202020]">
            {/* Search Box */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search media library"
                className="w-full h-8 pl-3 pr-8 rounded-[5px] bg-white dark:bg-[#2d2d30] border border-black/[0.08] dark:border-white/[0.1] border-b-black/[0.18] dark:border-b-white/[0.2] text-[13px] text-[#1a1a1a] dark:text-white placeholder:text-[#6b7280] dark:placeholder:text-[#9ca3af] focus:outline-none focus:border-b-2 focus:border-b-[#d84e13]"
              />
              <Search className="w-3.5 h-3.5 text-[#6b7280] dark:text-[#9ca3af] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Primary Nav */}
            <nav className="flex-1 overflow-y-auto space-y-0.5 pr-0.5" aria-label="Media Player sections">
              {(
                [
                  { id: 'home' as NavSection, label: 'Home', icon: HomeIcon },
                  { id: 'music' as NavSection, label: 'Music library', icon: Music },
                  { id: 'videos' as NavSection, label: 'Video library', icon: Film },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.id);
                      setIsNowPlayingExpanded(false);
                    }}
                    className={`w-full h-9 px-3 rounded-[5px] flex items-center gap-3 text-[13px] relative transition-colors cursor-pointer ${
                      active
                        ? 'bg-black/[0.05] dark:bg-white/[0.08] font-medium text-[#111827] dark:text-white'
                        : 'text-[#374151] dark:text-[#d1d5db] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#d84e13]" />
                    )}
                    <Icon className="w-4 h-4 shrink-0 text-[#4b5563] dark:text-[#d1d5db]" strokeWidth={1.7} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

              <div className="my-2 border-t border-black/[0.06] dark:border-white/[0.07]" />

              <button
                type="button"
                onClick={() => {
                  setActiveNav('queue');
                  setIsNowPlayingExpanded(false);
                }}
                className={`w-full h-9 px-3 rounded-[5px] flex items-center gap-3 text-[13px] relative transition-colors cursor-pointer ${
                  activeNav === 'queue'
                    ? 'bg-black/[0.05] dark:bg-white/[0.08] font-medium text-[#111827] dark:text-white'
                    : 'text-[#374151] dark:text-[#d1d5db] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {activeNav === 'queue' && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#d84e13]" />
                )}
                <ListMusic className="w-4 h-4 shrink-0 text-[#4b5563] dark:text-[#d1d5db]" strokeWidth={1.7} />
                <span>Play queue</span>
              </button>

              {/* Playlists Accordion */}
              <div>
                <div className="flex items-center group">
                  <button
                    type="button"
                    onClick={() => setIsPlaylistsExpanded((prev) => !prev)}
                    className="flex-1 h-9 px-3 rounded-[5px] flex items-center justify-between text-[13px] text-[#374151] dark:text-[#d1d5db] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <Disc3 className="w-4 h-4 shrink-0 text-[#4b5563] dark:text-[#d1d5db]" strokeWidth={1.7} />
                      <span>Playlists</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isPlaylistsExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaylistsExpanded(true);
                      setIsCreatingPlaylist(true);
                    }}
                    title="Create new playlist"
                    className="w-7 h-7 rounded-[4px] flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isPlaylistsExpanded && (
                  <div className="mt-0.5 space-y-0.5 pl-2">
                    {isCreatingPlaylist && (
                      <div className="px-2 py-1 flex items-center gap-1">
                        <input
                          autoFocus
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreatePlaylist();
                            if (e.key === 'Escape') setIsCreatingPlaylist(false);
                          }}
                          placeholder="Playlist name..."
                          className="w-full h-7 px-2 rounded bg-white dark:bg-[#2c2c2c] border border-[#d84e13] text-[12px] focus:outline-none"
                        />
                      </div>
                    )}
                    {playlists.map((pl) => {
                      const active = activeNav === 'playlist' && selectedPlaylistId === pl.id;
                      return (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlaylistId(pl.id);
                            setActiveNav('playlist');
                            setIsNowPlayingExpanded(false);
                          }}
                          className={`w-full h-8 px-3 rounded-[5px] flex items-center gap-2.5 text-[12.5px] relative transition-colors cursor-pointer ${
                            active
                              ? 'bg-black/[0.05] dark:bg-white/[0.08] font-medium text-[#111827] dark:text-white'
                              : 'text-[#4b5563] dark:text-[#d1d5db] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#d84e13]" />
                          )}
                          {pl.kind === 'video' ? (
                            <Film className="w-3.5 h-3.5 shrink-0 opacity-75" />
                          ) : (
                            <Music className="w-3.5 h-3.5 shrink-0 opacity-75" />
                          )}
                          <span className="truncate">{pl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            {/* Bottom Settings */}
            <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('settings');
                  setIsNowPlayingExpanded(false);
                }}
                className={`w-full h-9 px-3 rounded-[5px] flex items-center gap-3 text-[13px] relative transition-colors cursor-pointer ${
                  activeNav === 'settings'
                    ? 'bg-black/[0.05] dark:bg-white/[0.08] font-medium text-[#111827] dark:text-white'
                    : 'text-[#374151] dark:text-[#d1d5db] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {activeNav === 'settings' && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#d84e13]" />
                )}
                <SettingsIcon className="w-4 h-4 shrink-0 text-[#4b5563] dark:text-[#d1d5db]" strokeWidth={1.7} />
                <span>Settings</span>
              </button>
            </div>
          </aside>
        )}

        {/* Right Content Canvas */}
        <main className="flex-1 min-w-0 h-full bg-white dark:bg-[#272727] rounded-tl-[8px] border-t border-l border-black/[0.05] dark:border-white/[0.06] overflow-y-auto relative">
          {/* EXPANDED NOW PLAYING STAGE */}
          {isNowPlayingExpanded ? (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-black/[0.02] to-black/[0.06] dark:from-[#1b1b1e] dark:to-[#141416] relative">
              <button
                type="button"
                onClick={() => setIsNowPlayingExpanded(false)}
                className="absolute top-4 left-4 h-8 px-3 rounded-[5px] bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.1] dark:hover:bg-white/[0.14] text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to library</span>
              </button>

              {currentTrack.mediaType === 'video' && currentTrack.objectUrl ? (
                <video
                  ref={videoRef}
                  src={currentTrack.objectUrl}
                  controls
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onEnded={playNextTrack}
                  className="max-h-[70vh] max-w-full rounded-lg shadow-2xl bg-black"
                />
              ) : (
                <div className="flex flex-col items-center text-center max-w-md">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg overflow-hidden shadow-2xl mb-6 ring-1 ring-black/10 dark:ring-white/10">
                    <AlbumCoverArt track={currentTrack} />
                  </div>
                  <h2 className="text-[24px] font-semibold tracking-tight">{currentTrack.title}</h2>
                  <p className="text-[14px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
                    {currentTrack.artist} • {currentTrack.album}
                  </p>
                  {currentTrack.mediaType === 'video' && (
                    <p className="mt-3 text-[12px] text-[#d84e13] font-medium">
                      Tip: Click &quot;Add new library location&quot; in Video library to load a local MP4/WebM file.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 sm:px-8 sm:py-6">
              {/* MUSIC LIBRARY VIEW (Default matching Image 2) */}
              {activeNav === 'music' && (
                <div>
                  {/* Header row: Music + Tabs + Add new library location */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-baseline gap-7">
                      <h1 className="text-[28px] font-semibold tracking-tight">Music</h1>
                      <div className="flex items-center gap-5">
                        {(
                          [
                            { id: 'songs' as MusicSubTab, label: 'Songs' },
                            { id: 'albums' as MusicSubTab, label: 'Albums' },
                            { id: 'artists' as MusicSubTab, label: 'Artists' },
                          ] as const
                        ).map((tab) => {
                          const active = musicSubTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setMusicSubTab(tab.id)}
                              className={`pb-1.5 text-[14px] transition-colors relative cursor-pointer ${
                                active
                                  ? 'font-semibold text-[#111827] dark:text-white'
                                  : 'text-[#6b7280] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-white'
                              }`}
                            >
                              {tab.label}
                              {active && (
                                <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 w-4 h-[3px] rounded-full bg-[#d84e13]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-[4px] bg-white dark:bg-[#323236] border border-black/[0.12] dark:border-white/[0.12] hover:bg-[#fafafa] dark:hover:bg-[#3b3b40] text-[12.5px] font-medium flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4 text-[#4b5563] dark:text-[#d1d5db]" />
                      <span>Add new library location</span>
                    </button>
                  </div>

                  {/* Shuffle & Play + Sort/Genre Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => handleShuffleAndPlay(filteredMusicTracks)}
                      className="h-8 px-3.5 rounded-[4px] bg-[#d84e13] hover:bg-[#c2420e] active:bg-[#ab390b] text-white text-[13px] font-medium flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Shuffle &amp; play</span>
                    </button>

                    <div className="flex items-center gap-4 text-[12.5px]">
                      <label className="flex items-center gap-1 text-[#5f5f5f] dark:text-[#a8a8a8]">
                        <span>Sort by:</span>
                        <select
                          aria-label="Sort music"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                          className="bg-transparent font-medium text-[#d84e13] focus:outline-none cursor-pointer"
                        >
                          <option value="az" className="bg-white dark:bg-[#2b2b2e] text-[#111827] dark:text-white">A to Z</option>
                          <option value="za" className="bg-white dark:bg-[#2b2b2e] text-[#111827] dark:text-white">Z to A</option>
                          <option value="artist" className="bg-white dark:bg-[#2b2b2e] text-[#111827] dark:text-white">Artist</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-1 text-[#5f5f5f] dark:text-[#a8a8a8]">
                        <span>Genre:</span>
                        <select
                          aria-label="Filter genre"
                          value={selectedGenre}
                          onChange={(e) => setSelectedGenre(e.target.value)}
                          className="bg-transparent font-medium text-[#d84e13] focus:outline-none cursor-pointer"
                        >
                          {availableGenres.map((genre) => (
                            <option key={genre} value={genre} className="bg-white dark:bg-[#2b2b2e] text-[#111827] dark:text-white">
                              {genre}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* ALBUMS GRID (grouped alphabetically like Image 2) */}
                  {musicSubTab === 'albums' && (
                    <div className="space-y-6">
                      {groupedAlbums.map(([letter, items]) => (
                        <section key={letter}>
                          <h2 className="text-[15px] font-semibold text-[#c24914] dark:text-[#ff7a3d] mb-3">
                            {letter}
                          </h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
                            {items.map((track) => {
                              const isCurrent = track.id === currentTrack.id;
                              return (
                                <button
                                  key={track.id}
                                  type="button"
                                  onClick={() => handleSelectTrack(track, true)}
                                  className="group text-left focus:outline-none cursor-pointer"
                                >
                                  <div className="aspect-square w-full rounded-[4px] overflow-hidden relative shadow-xs ring-1 ring-black/[0.06] dark:ring-white/[0.08] mb-2">
                                    <AlbumCoverArt track={track} />
                                    <div
                                      className={`absolute inset-0 bg-black/25 flex items-center justify-center transition-opacity ${
                                        isCurrent && isPlaying
                                          ? 'opacity-100'
                                          : 'opacity-0 group-hover:opacity-100'
                                      }`}
                                    >
                                      <span className="w-10 h-10 rounded-full bg-white/95 text-[#111827] shadow-lg flex items-center justify-center">
                                        {isCurrent && isPlaying ? (
                                          <Pause className="w-4 h-4 fill-current" />
                                        ) : (
                                          <Play className="w-4 h-4 fill-current ml-0.5" />
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-[13px] font-semibold leading-snug text-[#111827] dark:text-white line-clamp-2">
                                    {track.title}
                                  </div>
                                  <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate mt-0.5">
                                    {track.artist}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  {/* SONGS LIST */}
                  {musicSubTab === 'songs' && (
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {filteredMusicTracks.map((track) => {
                        const isCurrent = track.id === currentTrack.id;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => handleSelectTrack(track, true)}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 text-left rounded-[5px] transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-[#d84e13]/10 text-[#d84e13]'
                                : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-[4px] overflow-hidden shrink-0">
                              <AlbumCoverArt track={track} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold truncate">{track.title}</div>
                              <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                                {track.artist}
                              </div>
                            </div>
                            <div className="hidden sm:block w-36 text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                              {track.album}
                            </div>
                            <div className="hidden md:block w-24 text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                              {track.genre}
                            </div>
                            <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] tabular-nums">
                              {formatTime(track.durationSec)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ARTISTS GRID */}
                  {musicSubTab === 'artists' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {filteredMusicTracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectTrack(track, true)}
                          className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] border border-black/[0.05] dark:border-white/[0.06] flex flex-col items-center text-center transition-colors cursor-pointer"
                        >
                          <div className="w-24 h-24 rounded-full overflow-hidden mb-3 shadow-sm">
                            <AlbumCoverArt track={track} />
                          </div>
                          <div className="text-[13.5px] font-semibold truncate w-full">{track.artist}</div>
                          <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate w-full">
                            {track.genre}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* HOME VIEW */}
              {activeNav === 'home' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-[28px] font-semibold tracking-tight">Home</h1>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-[4px] bg-white dark:bg-[#323236] border border-black/[0.12] dark:border-white/[0.12] hover:bg-[#fafafa] dark:hover:bg-[#3b3b40] text-[12.5px] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>Open local media</span>
                    </button>
                  </div>

                  <section>
                    <h2 className="text-[15px] font-semibold mb-3">Recent media</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                      {tracks.slice(0, 5).map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectTrack(track, true)}
                          className="group text-left cursor-pointer"
                        >
                          <div className="aspect-square rounded-[4px] overflow-hidden mb-2 relative ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
                            <AlbumCoverArt track={track} />
                          </div>
                          <div className="text-[13px] font-semibold truncate">{track.title}</div>
                          <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">{track.artist}</div>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* VIDEO LIBRARY VIEW */}
              {activeNav === 'videos' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h1 className="text-[28px] font-semibold tracking-tight">Video library</h1>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-[4px] bg-white dark:bg-[#323236] border border-black/[0.12] dark:border-white/[0.12] hover:bg-[#fafafa] dark:hover:bg-[#3b3b40] text-[12.5px] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>Add video file</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {videoTracks.map((video) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleSelectTrack(video, true)}
                        className="group text-left cursor-pointer"
                      >
                        <div className="aspect-video rounded-[6px] overflow-hidden relative ring-1 ring-black/[0.08] dark:ring-white/[0.1] mb-2">
                          <AlbumCoverArt track={video} />
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[11px] tabular-nums">
                            {formatTime(video.durationSec)}
                          </span>
                        </div>
                        <div className="text-[13.5px] font-semibold truncate">{video.title}</div>
                        <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">{video.artist}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PLAY QUEUE VIEW */}
              {activeNav === 'queue' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-[28px] font-semibold tracking-tight">Play queue</h1>
                    {queueIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setQueueIds([currentTrack.id])}
                        className="h-8 px-3 rounded-[4px] border border-black/10 dark:border-white/10 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[12.5px] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear queue</span>
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {queueIds.map((id) => {
                      const track = tracks.find((t) => t.id === id);
                      if (!track) return null;
                      const isCurrent = track.id === currentTrack.id;
                      return (
                        <div
                          key={track.id}
                          className={`px-3 py-2 flex items-center gap-3 rounded-[5px] ${
                            isCurrent ? 'bg-[#d84e13]/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectTrack(track, true)}
                            className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-[4px] overflow-hidden shrink-0">
                              <AlbumCoverArt track={track} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-[13px] font-semibold truncate ${isCurrent ? 'text-[#d84e13]' : ''}`}>
                                {track.title}
                              </div>
                              <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                                {track.artist}
                              </div>
                            </div>
                          </button>
                          <span className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] tabular-nums">
                            {formatTime(track.durationSec)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PLAYLIST VIEW */}
              {activeNav === 'playlist' && activePlaylist && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <h1 className="text-[28px] font-semibold tracking-tight flex items-center gap-2">
                        {activePlaylist.id === 'pl-enjoy' && <Sparkles className="w-5 h-5 text-amber-500" />}
                        <span>{activePlaylist.name}</span>
                      </h1>
                      <p className="text-[12.5px] text-[#6b7280] dark:text-[#9ca3af] mt-0.5">
                        {activePlaylist.trackIds.length} items
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const list = activePlaylist.trackIds
                          .map((id) => tracks.find((t) => t.id === id))
                          .filter((t): t is MediaTrack => Boolean(t));
                        handleShuffleAndPlay(list);
                      }}
                      className="h-8 px-3.5 rounded-[4px] bg-[#d84e13] hover:bg-[#c2420e] text-white text-[13px] font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play all</span>
                    </button>
                  </div>

                  <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                    {activePlaylist.trackIds.map((id) => {
                      const track = tracks.find((t) => t.id === id);
                      if (!track) return null;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectTrack(track, true)}
                          className="w-full px-3 py-2.5 flex items-center gap-3 text-left rounded-[5px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-[4px] overflow-hidden shrink-0">
                            <AlbumCoverArt track={track} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold truncate">{track.title}</div>
                            <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">{track.artist}</div>
                          </div>
                          <span className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] tabular-nums">
                            {formatTime(track.durationSec)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SETTINGS VIEW */}
              {activeNav === 'settings' && (
                <div className="max-w-2xl space-y-5">
                  <h1 className="text-[28px] font-semibold tracking-tight">Settings</h1>
                  <div className="p-4 rounded-lg bg-[#f9f9f9] dark:bg-[#2f2f34] border border-black/[0.07] dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[14px] font-semibold">Music &amp; Video library locations</div>
                        <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af]">
                          Folders and local files scanned into Media Player
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 px-3 rounded-[4px] bg-[#d84e13] text-white text-[12.5px] font-medium cursor-pointer"
                      >
                        Add files
                      </button>
                    </div>
                    <ul className="space-y-1.5 text-[12.5px] text-[#374151] dark:text-[#d1d5db]">
                      {libraryLocations.map((loc) => (
                        <li key={loc} className="px-2.5 py-1.5 rounded bg-black/[0.03] dark:bg-white/[0.04]">
                          {loc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom Now-Playing Transport Bar (matches Image 2) */}
      <footer className="shrink-0 bg-[#f3f3f3] dark:bg-[#202020] border-t border-black/[0.06] dark:border-white/[0.08] px-3 pt-1.5 pb-2.5">
        {/* Top Seek Progress Bar with Timestamps */}
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="text-[11px] font-medium text-[#4b5563] dark:text-[#a1a1aa] tabular-nums w-8 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 h-4 flex items-center group">
            <div className="w-full h-[3px] rounded-full bg-[#d4d4d8] dark:bg-[#404046] overflow-hidden">
              <div
                className="h-full bg-[#d84e13] transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div
              className="w-3.5 h-3.5 rounded-full bg-[#d84e13] ring-2 ring-white dark:ring-[#202020] shadow-sm pointer-events-none absolute -translate-x-1/2"
              style={{ left: `${progressPct}%` }}
            />
            <input
              type="range"
              aria-label="Seek timeline"
              min={0}
              max={currentTrack.durationSec}
              value={Math.min(currentTrack.durationSec, Math.floor(currentTime))}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[11px] font-medium text-[#4b5563] dark:text-[#a1a1aa] tabular-nums w-8">
            {formatTime(currentTrack.durationSec)}
          </span>
        </div>

        {/* Transport Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Track Artwork & Info */}
          <button
            type="button"
            onClick={() => setIsNowPlayingExpanded((prev) => !prev)}
            className="flex items-center gap-3 min-w-0 max-w-[240px] sm:max-w-[280px] text-left rounded-[6px] p-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-[4px] overflow-hidden shrink-0 shadow-xs">
              <AlbumCoverArt track={currentTrack} />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold truncate text-[#111827] dark:text-white">
                {currentTrack.title}
              </div>
              <div className="text-[12px] text-[#6b7280] dark:text-[#9ca3af] truncate">
                {currentTrack.artist}
              </div>
            </div>
          </button>

          {/* Center: Shuffle, Prev, Gradient-Ring Play/Pause, Next, Repeat */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setIsShuffle((prev) => !prev)}
              aria-label="Shuffle"
              title="Shuffle"
              className={`w-8 h-8 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer ${
                isShuffle
                  ? 'text-[#d84e13] bg-[#d84e13]/10'
                  : 'text-[#4b5563] dark:text-[#d1d5db] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={playPreviousTrack}
              aria-label="Previous"
              title="Previous"
              className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[#1f2937] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#f97316] via-[#ec4899] to-[#8b5cf6] shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="w-full h-full rounded-full bg-white dark:bg-[#272727] flex items-center justify-center text-[#111827] dark:text-white">
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={playNextTrack}
              aria-label="Next"
              title="Next"
              className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[#1f2937] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={() =>
                setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'))
              }
              aria-label={`Repeat: ${repeatMode}`}
              title={`Repeat: ${repeatMode}`}
              className={`w-8 h-8 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-[#d84e13] bg-[#d84e13]/10'
                  : 'text-[#4b5563] dark:text-[#d1d5db] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Right: Volume, Expand, Mini Player, More */}
          <div className="flex items-center gap-1 relative">
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="w-8 h-8 rounded-[5px] flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolume(next);
                  if (next > 0) setIsMuted(false);
                }}
                className="w-16 accent-[#d84e13] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsNowPlayingExpanded((prev) => !prev)}
              aria-label="Toggle Now Playing View"
              title="Toggle Now Playing View"
              className="w-8 h-8 rounded-[5px] flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              {isNowPlayingExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsCompactPlayer((prev) => !prev)}
              aria-label="Mini player"
              title="Toggle Mini player"
              className="hidden sm:flex w-8 h-8 rounded-[5px] items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              aria-label="More options"
              title="Playback speed & options"
              className="w-8 h-8 rounded-[5px] flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 bottom-10 z-40 w-44 p-1.5 rounded-lg bg-white dark:bg-[#2c2c30] border border-black/10 dark:border-white/10 shadow-xl text-[12.5px]">
                <div className="px-2 py-1 text-[11px] font-semibold text-[#6b7280] dark:text-[#9ca3af] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Playback speed</span>
                </div>
                {[0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(speed);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[4px] flex items-center justify-between cursor-pointer ${
                      playbackRate === speed
                        ? 'bg-[#d84e13]/12 text-[#d84e13] font-semibold'
                        : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{speed}x</span>
                    {playbackRate === speed && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MediaPlayer;
