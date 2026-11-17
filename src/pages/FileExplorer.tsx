import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Cloud,
  Copy,
  Download,
  FileCode,
  FileImage,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Globe,
  HardDrive,
  Home,
  LayoutGrid,
  LayoutList,
  ListFilter,
  Monitor,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { getAppPortalTarget, toAppPortalCoordinates } from '../utils/appPortal';
import { flyoutPanelClassName, flyoutPanelStyle } from '../components/FlyoutDropdown';
import { FluentFileExplorerIcon } from '../components/FluentIcons';

interface FileExplorerProps {
  navigate: (path: string, state?: any) => void;
}

type FsItemType = 'folder' | 'drive' | 'shortcut' | 'pdf' | 'doc' | 'sheet' | 'text' | 'image' | 'audio' | 'video' | 'code';

interface FsItem {
  id: string;
  parentId: string | null;
  name: string;
  type: FsItemType;
  sizeBytes?: number;
  modifiedAt: string;
  locationLabel: string;
  pinnedQuickAccess?: boolean;
  isFavorite?: boolean;
  isRecent?: boolean;
  shortcutRoute?: string;
  previewUrl?: string;
  content?: string;
  driveUsedGb?: number;
  driveTotalGb?: number;
  trashed?: boolean;
  originalParentId?: string | null;
}

interface ExplorerTab {
  id: string;
  history: string[];
  historyIndex: number;
}

type SortField = 'name' | 'modified' | 'type' | 'size';
type ViewMode = 'details' | 'medium' | 'large' | 'list';
type FilterMode = 'all' | 'folders' | 'documents' | 'images' | 'media';

const FS_STORAGE_KEY = 'sparkle_file_explorer_fs_v1';

const SPECIAL_FOLDERS = new Set([
  'home',
  'gallery',
  'onedrive',
  'desktop',
  'downloads',
  'documents',
  'pictures',
  'music',
  'videos',
  'this-pc',
  'network',
  'recycle-bin',
]);

const INITIAL_FS_ITEMS: FsItem[] = [
  // Root Virtual Nodes
  { id: 'home', parentId: null, name: 'Home', type: 'folder', modifiedAt: '2026-11-17 08:40', locationLabel: 'Home' },
  { id: 'gallery', parentId: null, name: 'Gallery', type: 'folder', modifiedAt: '2026-11-17 08:30', locationLabel: 'Gallery' },
  { id: 'onedrive', parentId: null, name: 'Sparkle - Personal', type: 'folder', modifiedAt: '2026-11-17 08:20', locationLabel: 'Sparkle - Personal' },
  { id: 'this-pc', parentId: null, name: 'This PC', type: 'folder', modifiedAt: '2026-11-17 08:00', locationLabel: 'This PC' },
  { id: 'network', parentId: null, name: 'Network', type: 'folder', modifiedAt: '2026-11-17 07:50', locationLabel: 'Network' },
  { id: 'recycle-bin', parentId: null, name: 'Recycle Bin', type: 'folder', modifiedAt: '2026-11-17 07:30', locationLabel: 'Recycle Bin' },

  // Drives inside This PC
  {
    id: 'drive-c',
    parentId: 'this-pc',
    name: 'Local Disk (C:)',
    type: 'drive',
    modifiedAt: '2026-11-17 08:00',
    locationLabel: 'This PC',
    driveUsedGb: 370,
    driveTotalGb: 512,
  },
  {
    id: 'drive-d',
    parentId: 'this-pc',
    name: 'Sparkle Media (D:)',
    type: 'drive',
    modifiedAt: '2026-11-16 21:10',
    locationLabel: 'This PC',
    driveUsedGb: 184,
    driveTotalGb: 1000,
  },

  // C:\ structure
  { id: 'c-users', parentId: 'drive-c', name: 'Users', type: 'folder', modifiedAt: '2026-10-12 09:00', locationLabel: 'Local Disk (C:)' },
  { id: 'c-program-files', parentId: 'drive-c', name: 'Program Files', type: 'folder', modifiedAt: '2026-11-01 11:15', locationLabel: 'Local Disk (C:)' },
  { id: 'c-windows', parentId: 'drive-c', name: 'Windows', type: 'folder', modifiedAt: '2026-11-14 04:00', locationLabel: 'Local Disk (C:)' },
  { id: 'c-sparkle-user', parentId: 'c-users', name: 'Sparkle', type: 'folder', modifiedAt: '2026-11-17 08:00', locationLabel: 'C:\\Users' },

  // Quick access user folders
  { id: 'desktop', parentId: 'c-sparkle-user', name: 'Desktop', type: 'folder', modifiedAt: '2026-11-17 08:45', locationLabel: 'C:\\Users\\Sparkle', pinnedQuickAccess: true },
  { id: 'downloads', parentId: 'c-sparkle-user', name: 'Downloads', type: 'folder', modifiedAt: '2026-11-17 08:15', locationLabel: 'C:\\Users\\Sparkle', pinnedQuickAccess: true },
  { id: 'documents', parentId: 'c-sparkle-user', name: 'Documents', type: 'folder', modifiedAt: '2026-11-16 19:22', locationLabel: 'C:\\Users\\Sparkle', pinnedQuickAccess: true },
  { id: 'pictures', parentId: 'c-sparkle-user', name: 'Pictures', type: 'folder', modifiedAt: '2026-11-16 17:40', locationLabel: 'C:\\Users\\Sparkle', pinnedQuickAccess: true },
  { id: 'music', parentId: 'c-sparkle-user', name: 'Music', type: 'folder', modifiedAt: '2026-11-15 20:10', locationLabel: 'C:\\Users\\Sparkle', pinnedQuickAccess: true },
  { id: 'videos', parentId: 'c-sparkle-user', name: 'Videos', type: 'folder', modifiedAt: '2026-11-14 14:30', locationLabel: 'C:\\Users\\Sparkle', pinnedQuickAccess: true },

  // D:\ subfolders
  { id: 'd-wallpapers', parentId: 'drive-d', name: 'Wallpapers', type: 'folder', modifiedAt: '2026-11-16 12:00', locationLabel: 'Sparkle Media (D:)' },
  { id: 'd-recordings', parentId: 'drive-d', name: 'Recordings', type: 'folder', modifiedAt: '2026-11-15 18:45', locationLabel: 'Sparkle Media (D:)' },

  // Desktop shortcuts & workspace files
  { id: 'desk-watch', parentId: 'desktop', name: 'Watch Live TV.lnk', type: 'shortcut', sizeBytes: 2048, modifiedAt: '2026-11-17 08:10', locationLabel: 'Desktop', shortcutRoute: '/live-tv' },
  { id: 'desk-notes', parentId: 'desktop', name: 'Sparkle Notes.lnk', type: 'shortcut', sizeBytes: 2048, modifiedAt: '2026-11-16 16:00', locationLabel: 'Desktop', shortcutRoute: '/notes' },
  { id: 'desk-canvas', parentId: 'desktop', name: 'Ink Canvas.lnk', type: 'shortcut', sizeBytes: 2048, modifiedAt: '2026-11-15 10:20', locationLabel: 'Desktop', shortcutRoute: '/draws' },
  { id: 'desk-settings', parentId: 'desktop', name: 'System Settings.lnk', type: 'shortcut', sizeBytes: 2048, modifiedAt: '2026-11-14 09:00', locationLabel: 'Desktop', shortcutRoute: '/settings' },
  {
    id: 'desk-readme',
    parentId: 'desktop',
    name: 'Sparkle_Quick_Start.txt',
    type: 'text',
    sizeBytes: 1420,
    modifiedAt: '2026-11-17 08:30',
    locationLabel: 'Desktop',
    content:
      'Welcome to Sparkle Fluent Desktop!\n\nShortcuts:\n- Alt+1: Home\n- Alt+2: Global Search\n- Alt+4: System Settings\n- Direct Command: Run vivetool commands such as /enable /name:WindowedTabs or /enable /name:IsWallpaperAllowed.\n',
  },

  // Documents
  {
    id: 'doc-spec',
    parentId: 'documents',
    name: 'Fluent_Spatial_Glass_Spec.docx',
    type: 'doc',
    sizeBytes: 428600,
    modifiedAt: '2026-11-16 19:22',
    locationLabel: 'C:\\Users\\Sparkle\\Documents',
    isRecent: true,
    content: 'Sparkle Fluent Design System Specification — Spatial Glass opacity, Acrylic blur tokens, and WinUI 3 elevation metrics.',
  },
  {
    id: 'doc-channels',
    parentId: 'documents',
    name: 'Channel_Lineup_2026.xlsx',
    type: 'sheet',
    sizeBytes: 194560,
    modifiedAt: '2026-11-15 15:40',
    locationLabel: 'C:\\Users\\Sparkle\\Documents',
    isRecent: true,
    content: 'VTV1 HD · VTV3 HD · HTV7 · HTV9 · VOV1 · VOV Giao Thông Hà Nội · VOV Giao Thông TP.HCM',
  },
  {
    id: 'doc-notes',
    parentId: 'documents',
    name: 'Release_Notes_2612.md',
    type: 'text',
    sizeBytes: 3820,
    modifiedAt: '2026-11-17 08:05',
    locationLabel: 'C:\\Users\\Sparkle\\Documents',
    content: '# Build 2612 Highlights\n\n- WindowedTabs velocity mode with 8-direction resize\n- Windows 11 Start Menu & Taskbar trays\n- Control Center Quick Settings flyout\n- Multi-tab Windows 11 File Explorer',
  },

  // Downloads
  {
    id: 'dl-setup',
    parentId: 'downloads',
    name: 'Sparkle_2612_Setup_x64.pdf',
    type: 'pdf',
    sizeBytes: 2450100,
    modifiedAt: '2026-11-17 07:45',
    locationLabel: 'C:\\Users\\Sparkle\\Downloads',
    isRecent: true,
    content: 'Sparkle Setup & Release Documentation PDF preview.',
  },
  {
    id: 'dl-vivetool',
    parentId: 'downloads',
    name: 'vivetool-flags-cheatsheet.txt',
    type: 'text',
    sizeBytes: 980,
    modifiedAt: '2026-11-16 14:12',
    locationLabel: 'C:\\Users\\Sparkle\\Downloads',
    content:
      'ViVeTool Feature IDs:\n- 493820175 : WindowedTabs\n- 519482736 : IsWallpaperAllowed\n- 48433719  : SearchColorfulExperiment\n- 49182034  : WidgetsFeed\n- 50129482  : TabsExperiment',
  },

  // Sparkle - Personal (OneDrive)
  {
    id: 'od-guide',
    parentId: 'onedrive',
    name: 'Getting_Started_OneDrive.pdf',
    type: 'pdf',
    sizeBytes: 1843200,
    modifiedAt: '2026-11-16 11:05',
    locationLabel: 'Sparkle - Personal',
    isRecent: true,
    content: 'Cloud-synced documentation stored in Sparkle - Personal.',
  },
  {
    id: 'od-wallpapers',
    parentId: 'onedrive',
    name: 'Fluent_Bloom_Desktop.png',
    type: 'image',
    sizeBytes: 3120400,
    modifiedAt: '2026-11-15 09:30',
    locationLabel: 'Sparkle - Personal',
    previewUrl: '/assets/aistudio/image_1a8895cc.png',
  },

  // Pictures & Gallery images (local assets so they always render)
  {
    id: 'pic-bloom',
    parentId: 'pictures',
    name: 'Sparkle_Bloom_Wallpaper.png',
    type: 'image',
    sizeBytes: 3120400,
    modifiedAt: '2026-11-17 08:20',
    locationLabel: 'C:\\Users\\Sparkle\\Pictures',
    previewUrl: '/assets/aistudio/image_1a8895cc.png',
  },
  {
    id: 'pic-winui',
    parentId: 'pictures',
    name: 'WinUI3_Hero_Banner.png',
    type: 'image',
    sizeBytes: 1850000,
    modifiedAt: '2026-11-14 16:45',
    locationLabel: 'C:\\Users\\Sparkle\\Pictures',
    previewUrl: '/assets/winui3/hero_banner_clean.png',
  },
  {
    id: 'pic-sunset',
    parentId: 'pictures',
    name: 'River_City_Dusk.png',
    type: 'image',
    sizeBytes: 2180000,
    modifiedAt: '2026-11-12 18:10',
    locationLabel: 'C:\\Users\\Sparkle\\Pictures',
    previewUrl: '/search-experience/river-city-at-dusk.png',
  },
  {
    id: 'pic-forest',
    parentId: 'pictures',
    name: 'Misty_Forest_Morning.png',
    type: 'image',
    sizeBytes: 2410000,
    modifiedAt: '2026-11-10 07:50',
    locationLabel: 'C:\\Users\\Sparkle\\Pictures',
    previewUrl: '/search-experience/forest-wallpaper.png',
  },

  // Gallery root items (links to Sparkle Gallery)
  {
    id: 'gal-1',
    parentId: 'gallery',
    name: 'Sparkle_Bloom_Wallpaper.png',
    type: 'image',
    sizeBytes: 3120400,
    modifiedAt: '2026-11-17 08:20',
    locationLabel: 'Gallery',
    previewUrl: '/assets/aistudio/image_1a8895cc.png',
  },
  {
    id: 'gal-2',
    parentId: 'gallery',
    name: 'Chao_Buoi_Sang_2026.webp',
    type: 'image',
    sizeBytes: 940000,
    modifiedAt: '2026-11-16 06:30',
    locationLabel: 'Gallery',
    previewUrl: '/banners/chao_buoi_sang_vtv1_2026.webp',
  },
  {
    id: 'gal-3',
    parentId: 'gallery',
    name: 'Thoi_Su_19h_Studio.webp',
    type: 'image',
    sizeBytes: 1120000,
    modifiedAt: '2026-11-15 19:00',
    locationLabel: 'Gallery',
    previewUrl: '/banners/thoi_su_19h_hd.webp',
  },

  // Music
  {
    id: 'mus-notify',
    parentId: 'music',
    name: 'windows_notify_system_generic.wav',
    type: 'audio',
    sizeBytes: 145000,
    modifiedAt: '2026-11-11 12:00',
    locationLabel: 'C:\\Users\\Sparkle\\Music',
    previewUrl: '/windows_notify_system_generic.wav',
  },

  // Videos
  {
    id: 'vid-boot',
    parentId: 'videos',
    name: 'animated_splash_screen.mp4',
    type: 'video',
    sizeBytes: 4820000,
    modifiedAt: '2026-11-09 21:00',
    locationLabel: 'C:\\Users\\Sparkle\\Videos',
    previewUrl: '/animated_splash_screen.mp4',
  },

  // Network devices
  { id: 'net-nas', parentId: 'network', name: 'SPARKLE-NAS', type: 'drive', modifiedAt: '2026-11-17 06:00', locationLabel: 'Network', driveUsedGb: 1200, driveTotalGb: 4000 },
  { id: 'net-tv', parentId: 'network', name: 'LIVING-ROOM-TV', type: 'shortcut', modifiedAt: '2026-11-17 08:00', locationLabel: 'Network', shortcutRoute: '/live-tv' },

  // D:\ Wallpapers
  {
    id: 'd-wp-1',
    parentId: 'd-wallpapers',
    name: 'Bloom_Blue_Ribbon.png',
    type: 'image',
    sizeBytes: 3120400,
    modifiedAt: '2026-11-16 12:00',
    locationLabel: 'D:\\Wallpapers',
    previewUrl: '/assets/aistudio/image_1a8895cc.png',
  },
];

const formatBytes = (bytes?: number) => {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getTypeLabel = (type: FsItemType) => {
  switch (type) {
    case 'folder':
      return 'File folder';
    case 'drive':
      return 'Local Disk';
    case 'shortcut':
      return 'Shortcut';
    case 'pdf':
      return 'PDF Document';
    case 'doc':
      return 'Word Document';
    case 'sheet':
      return 'Excel Worksheet';
    case 'text':
      return 'Text Document';
    case 'image':
      return 'PNG Image';
    case 'audio':
      return 'Audio File';
    case 'video':
      return 'MP4 Video';
    case 'code':
      return 'Source File';
    default:
      return 'File';
  }
};

const WindowsFolderGlyph: React.FC<{ folderId?: string; className?: string }> = ({
  folderId,
  className = 'size-5',
}) => {
  if (folderId === 'desktop') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2.5" y="4" width="19" height="13" rx="2" fill="#2196f3" />
        <rect x="4" y="5.5" width="16" height="10" rx="1" fill="#4fc3f7" />
        <rect x="9" y="17" width="6" height="2" fill="#90a4ae" />
        <rect x="6.5" y="19" width="11" height="1.5" rx="0.75" fill="#607d8b" />
      </svg>
    );
  }
  if (folderId === 'downloads') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2.5" fill="#10b981" />
        <path d="M12 7.5V15M12 15L8.5 11.5M12 15L15.5 11.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17.5H16" stroke="#d1fae5" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (folderId === 'documents') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 3.5C5 2.67 5.67 2 6.5 2H14.5L19 6.5V20.5C19 21.33 18.33 22 17.5 22H6.5C5.67 22 5 21.33 5 20.5V3.5Z" fill="#cbd5e1" />
        <path d="M14.5 2L19 6.5H15.5C14.95 6.5 14.5 6.05 14.5 5.5V2Z" fill="#94a3b8" />
        <rect x="8" y="10" width="8" height="1.6" rx="0.8" fill="#475569" />
        <rect x="8" y="13.5" width="8" height="1.6" rx="0.8" fill="#475569" />
        <rect x="8" y="17" width="5" height="1.6" rx="0.8" fill="#475569" />
      </svg>
    );
  }
  if (folderId === 'pictures' || folderId === 'gallery') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="#0284c7" />
        <path d="M4.5 17L9.5 11.5L13.5 15.5L16 13L19.5 17H4.5Z" fill="#e0f2fe" />
        <circle cx="16.2" cy="8.5" r="1.7" fill="#fde047" />
      </svg>
    );
  }
  if (folderId === 'music') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2.5" fill="#f97316" />
        <path d="M10.5 15.5V8.5L16.5 7.2V14.2" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.8" cy="15.8" r="2" fill="#ffffff" />
        <circle cx="14.8" cy="14.5" r="2" fill="#ffffff" />
      </svg>
    );
  }
  if (folderId === 'videos') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="#8b5cf6" />
        <path d="M10 9L15.5 12L10 15V9Z" fill="#ffffff" />
      </svg>
    );
  }
  if (folderId === 'home') {
    return <Home className={`${className} text-[#f59e0b]`} aria-hidden="true" />;
  }
  if (folderId === 'onedrive') {
    return <Cloud className={`${className} fill-[#0ea5e9] text-[#0ea5e9]`} aria-hidden="true" />;
  }
  if (folderId === 'this-pc') {
    return <Monitor className={`${className} text-[#38bdf8]`} aria-hidden="true" />;
  }
  if (folderId === 'network') {
    return <Globe className={`${className} text-[#38bdf8]`} aria-hidden="true" />;
  }
  if (folderId === 'recycle-bin') {
    return <Trash2 className={`${className} text-[#94a3b8]`} aria-hidden="true" />;
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 5.5C2.5 4.4 3.4 3.5 4.5 3.5H9.2L11.4 5.8H19.5C20.6 5.8 21.5 6.7 21.5 7.8V18.2C21.5 19.3 20.6 20.2 19.5 20.2H4.5C3.4 20.2 2.5 19.3 2.5 18.2V5.5Z" fill="#f5b938" />
      <rect x="2.5" y="7.2" width="19" height="13" rx="2" fill="#ffd666" />
    </svg>
  );
};

const FsItemIcon: React.FC<{ item: FsItem; className?: string }> = ({ item, className = 'size-5' }) => {
  if (item.type === 'folder') {
    return <WindowsFolderGlyph folderId={item.id} className={className} />;
  }
  if (item.type === 'drive') {
    return <HardDrive className={`${className} text-[#64748b] dark:text-[#94a3b8]`} aria-hidden="true" />;
  }
  if (item.type === 'shortcut') {
    return <Monitor className={`${className} text-[#0078d4] dark:text-[#4cc2ff]`} aria-hidden="true" />;
  }
  if (item.type === 'pdf') {
    return <FileText className={`${className} text-[#ef4444]`} aria-hidden="true" />;
  }
  if (item.type === 'doc') {
    return <FileText className={`${className} text-[#2563eb]`} aria-hidden="true" />;
  }
  if (item.type === 'sheet') {
    return <FileSpreadsheet className={`${className} text-[#10b981]`} aria-hidden="true" />;
  }
  if (item.type === 'image') {
    return <FileImage className={`${className} text-[#0ea5e9]`} aria-hidden="true" />;
  }
  if (item.type === 'audio') {
    return <FileMusic className={`${className} text-[#f97316]`} aria-hidden="true" />;
  }
  if (item.type === 'video') {
    return <FileVideo className={`${className} text-[#8b5cf6]`} aria-hidden="true" />;
  }
  if (item.type === 'code') {
    return <FileCode className={`${className} text-[#eab308]`} aria-hidden="true" />;
  }
  return <FileText className={`${className} text-[#64748b] dark:text-[#cbd5e1]`} aria-hidden="true" />;
};

const loadStoredFs = (): FsItem[] => {
  try {
    const raw = localStorage.getItem(FS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_FS_ITEMS;
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ navigate }) => {
  const [items, setItems] = useState<FsItem[]>(() => loadStoredFs());
  const [tabs, setTabs] = useState<ExplorerTab[]>([
    { id: 'tab-1', history: ['home'], historyIndex: 0 },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showDetailsPane, setShowDetailsPane] = useState(false);

  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(true);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isRecentOpen, setIsRecentOpen] = useState(true);
  const [isThisPcExpanded, setIsThisPcExpanded] = useState(false);
  const [isOneDriveExpanded, setIsOneDriveExpanded] = useState(false);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [clipboard, setClipboard] = useState<{ mode: 'cut' | 'copy'; ids: string[] } | null>(null);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [previewTextDraft, setPreviewTextDraft] = useState('');

  const [openDropdown, setOpenDropdown] = useState<'new' | 'sort' | 'view' | 'filter' | 'more' | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId: string | null;
  } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const persistItems = useCallback((next: FsItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(FS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const currentFolderId = activeTab.history[activeTab.historyIndex] || 'home';

  const itemsById = useMemo(() => {
    const map = new Map<string, FsItem>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const currentFolder = itemsById.get(currentFolderId) ?? itemsById.get('home')!;

  const navigateFolder = useCallback(
    (folderId: string) => {
      if (!itemsById.has(folderId)) return;
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTab.id) return tab;
          if (tab.history[tab.historyIndex] === folderId) return tab;
          const sliced = tab.history.slice(0, tab.historyIndex + 1);
          return {
            ...tab,
            history: [...sliced, folderId],
            historyIndex: sliced.length,
          };
        })
      );
      setSelectedIds([]);
      setSearchQuery('');
      setRenamingId(null);
      setOpenDropdown(null);
    },
    [activeTab.id, itemsById]
  );

  const canGoBack = activeTab.historyIndex > 0;
  const canGoForward = activeTab.historyIndex < activeTab.history.length - 1;
  const canGoUp = Boolean(currentFolder.parentId);

  const goBack = () => {
    if (!canGoBack) return;
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab.id ? { ...tab, historyIndex: tab.historyIndex - 1 } : tab
      )
    );
    setSelectedIds([]);
  };

  const goForward = () => {
    if (!canGoForward) return;
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab.id ? { ...tab, historyIndex: tab.historyIndex + 1 } : tab
      )
    );
    setSelectedIds([]);
  };

  const goUp = () => {
    if (currentFolder.parentId) {
      navigateFolder(currentFolder.parentId);
    } else if (currentFolderId !== 'home') {
      navigateFolder('home');
    }
  };

  const createNewTab = (initialFolder = 'home') => {
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setTabs((prev) => [...prev, { id, history: [initialFolder], historyIndex: 0 }]);
    setActiveTabId(id);
    setSelectedIds([]);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === tabId);
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const fallback = nextTabs[Math.min(idx, nextTabs.length - 1)] ?? nextTabs[0];
      setActiveTabId(fallback.id);
    }
  };

  const breadcrumbs = useMemo(() => {
    const trail: FsItem[] = [];
    let cursor: FsItem | undefined = currentFolder;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      trail.unshift(cursor);
      cursor = cursor.parentId ? itemsById.get(cursor.parentId) : undefined;
    }
    return trail;
  }, [currentFolder, itemsById]);

  const addressDisplayPath = useMemo(() => {
    if (currentFolderId === 'home') return 'Home';
    if (currentFolderId === 'gallery') return 'Gallery';
    if (currentFolderId === 'onedrive') return 'Sparkle - Personal';
    if (currentFolderId === 'this-pc') return 'This PC';
    if (currentFolderId === 'network') return 'Network';
    if (currentFolderId === 'recycle-bin') return 'Recycle Bin';
    return breadcrumbs
      .filter((b) => b.id !== 'this-pc')
      .map((b) => (b.id === 'drive-c' ? 'C:' : b.id === 'drive-d' ? 'D:' : b.name))
      .join('\\');
  }, [breadcrumbs, currentFolderId]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = addressDraft.trim().toLowerCase();
    setIsEditingAddress(false);
    if (!q) return;

    const directMatch = items.find(
      (it) =>
        (it.type === 'folder' || it.type === 'drive') &&
        !it.trashed &&
        (it.id.toLowerCase() === q ||
          it.name.toLowerCase() === q ||
          q.endsWith(`\\${it.name.toLowerCase()}`) ||
          (q === 'c:' && it.id === 'drive-c') ||
          (q === 'd:' && it.id === 'drive-d'))
    );
    if (directMatch) {
      navigateFolder(directMatch.id);
    }
  };

  const quickAccessFolders = useMemo(
    () => items.filter((it) => it.pinnedQuickAccess && !it.trashed),
    [items]
  );

  const favoriteFiles = useMemo(
    () => items.filter((it) => it.isFavorite && !it.trashed),
    [items]
  );

  const recentFiles = useMemo(
    () => items.filter((it) => it.isRecent && !it.trashed),
    [items]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleFolderItems = useMemo(() => {
    let list: FsItem[];
    if (normalizedSearch) {
      list = items.filter(
        (it) =>
          !it.trashed &&
          it.parentId !== null &&
          (currentFolderId === 'home' || it.parentId === currentFolderId || currentFolderId === 'this-pc') &&
          (it.name.toLowerCase().includes(normalizedSearch) ||
            it.locationLabel.toLowerCase().includes(normalizedSearch))
      );
    } else if (currentFolderId === 'recycle-bin') {
      list = items.filter((it) => it.trashed);
    } else {
      list = items.filter((it) => !it.trashed && it.parentId === currentFolderId);
    }

    if (filterMode === 'folders') {
      list = list.filter((it) => it.type === 'folder' || it.type === 'drive');
    } else if (filterMode === 'documents') {
      list = list.filter((it) => it.type === 'pdf' || it.type === 'doc' || it.type === 'sheet' || it.type === 'text' || it.type === 'code');
    } else if (filterMode === 'images') {
      list = list.filter((it) => it.type === 'image');
    } else if (filterMode === 'media') {
      list = list.filter((it) => it.type === 'audio' || it.type === 'video');
    }

    const sorted = [...list].sort((a, b) => {
      const aFolderRank = a.type === 'folder' || a.type === 'drive' ? 0 : 1;
      const bFolderRank = b.type === 'folder' || b.type === 'drive' ? 0 : 1;
      if (aFolderRank !== bFolderRank) return aFolderRank - bFolderRank;

      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'modified') cmp = a.modifiedAt.localeCompare(b.modifiedAt);
      else if (sortField === 'type') cmp = getTypeLabel(a.type).localeCompare(getTypeLabel(b.type));
      else if (sortField === 'size') cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);

      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [currentFolderId, filterMode, items, normalizedSearch, sortAsc, sortField]);

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.includes(it.id)),
    [items, selectedIds]
  );
  const primarySelected = selectedItems[0] ?? null;

  const openItem = (item: FsItem) => {
    if (item.trashed) return;
    if (item.type === 'folder' || item.type === 'drive') {
      navigateFolder(item.id);
      return;
    }
    if (item.type === 'shortcut' && item.shortcutRoute) {
      navigate(item.shortcutRoute);
      return;
    }
    setPreviewItemId(item.id);
    setPreviewTextDraft(item.content ?? '');
  };

  const createNewItem = (kind: 'folder' | 'text' | 'md') => {
    const targetParent =
      currentFolderId === 'home' || currentFolderId === 'this-pc' || currentFolderId === 'network' || currentFolderId === 'recycle-bin'
        ? 'desktop'
        : currentFolderId;

    if (targetParent !== currentFolderId) {
      navigateFolder(targetParent);
    }

    const existingNames = new Set(
      items.filter((i) => i.parentId === targetParent && !i.trashed).map((i) => i.name.toLowerCase())
    );
    const baseName =
      kind === 'folder'
        ? 'New folder'
        : kind === 'md'
          ? 'New Note.md'
          : 'New Text Document.txt';
    let candidate = baseName;
    let counter = 2;
    while (existingNames.has(candidate.toLowerCase())) {
      candidate =
        kind === 'folder'
          ? `New folder (${counter})`
          : kind === 'md'
            ? `New Note (${counter}).md`
            : `New Text Document (${counter}).txt`;
      counter++;
    }

    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newItem: FsItem = {
      id: newId,
      parentId: targetParent,
      name: candidate,
      type: kind === 'folder' ? 'folder' : 'text',
      sizeBytes: kind === 'folder' ? undefined : 0,
      modifiedAt: nowStamp,
      locationLabel: itemsById.get(targetParent)?.name ?? 'Desktop',
      content: kind === 'folder' ? undefined : '',
    };

    persistItems([...items, newItem]);
    setSelectedIds([newId]);
    setRenamingId(newId);
    setRenameDraft(candidate);
    setOpenDropdown(null);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) {
      persistItems(
        items.map((it) => (it.id === renamingId ? { ...it, name: trimmed } : it))
      );
    }
    setRenamingId(null);
  };

  const deleteItems = (ids: string[]) => {
    const deletable = ids.filter((id) => !SPECIAL_FOLDERS.has(id) && id !== 'drive-c' && id !== 'drive-d');
    if (deletable.length === 0) return;

    if (currentFolderId === 'recycle-bin') {
      const setDel = new Set(deletable);
      persistItems(items.filter((it) => !setDel.has(it.id)));
    } else {
      const setDel = new Set(deletable);
      persistItems(
        items.map((it) =>
          setDel.has(it.id)
            ? { ...it, trashed: true, originalParentId: it.parentId, isFavorite: false }
            : it
        )
      );
    }
    setSelectedIds([]);
  };

  const restoreItems = (ids: string[]) => {
    const setRes = new Set(ids);
    persistItems(
      items.map((it) =>
        setRes.has(it.id)
          ? {
              ...it,
              trashed: false,
              parentId: it.originalParentId ?? 'desktop',
              originalParentId: undefined,
            }
          : it
      )
    );
    setSelectedIds([]);
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.ids.length === 0) return;
    const targetParent =
      currentFolderId === 'home' || currentFolderId === 'this-pc' || currentFolderId === 'network' || currentFolderId === 'recycle-bin'
        ? null
        : currentFolderId;
    if (!targetParent) return;

    if (clipboard.mode === 'cut') {
      const cutSet = new Set(clipboard.ids);
      const targetName = itemsById.get(targetParent)?.name ?? targetParent;
      persistItems(
        items.map((it) =>
          cutSet.has(it.id) && !SPECIAL_FOLDERS.has(it.id)
            ? { ...it, parentId: targetParent, locationLabel: targetName, trashed: false }
            : it
        )
      );
      setClipboard(null);
    } else {
      const copies: FsItem[] = [];
      const targetName = itemsById.get(targetParent)?.name ?? targetParent;
      const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      for (const id of clipboard.ids) {
        const src = itemsById.get(id);
        if (!src || SPECIAL_FOLDERS.has(src.id)) continue;
        copies.push({
          ...src,
          id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          parentId: targetParent,
          name: `${src.name.replace(/(\.[^.]+)?$/, '')} - Copy${src.name.match(/(\.[^.]+)$/)?.[1] || ''}`,
          modifiedAt: nowStamp,
          locationLabel: targetName,
          pinnedQuickAccess: false,
          isFavorite: false,
          trashed: false,
        });
      }
      if (copies.length > 0) {
        persistItems([...items, ...copies]);
      }
    }
  };

  const toggleFavorite = (id: string) => {
    persistItems(
      items.map((it) => (it.id === id ? { ...it, isFavorite: !it.isFavorite } : it))
    );
  };

  const emptyRecycleBin = () => {
    persistItems(items.filter((it) => !it.trashed));
    setSelectedIds([]);
  };

  const resetFileSystem = () => {
    persistItems(INITIAL_FS_ITEMS);
    setSelectedIds([]);
    navigateFolder('home');
  };

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const { width, height } = contextMenuRef.current.getBoundingClientRect();
    setContextMenuPos({
      left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - width - 8)),
      top: Math.max(8, contextMenu.y > window.innerHeight - height - 8 ? contextMenu.y - height : contextMenu.y),
    });
  }, [contextMenu]);

  const openContextMenu = (e: React.MouseEvent, itemId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (itemId && !selectedIds.includes(itemId)) {
      setSelectedIds([itemId]);
    }
    const pt = toAppPortalCoordinates(e.clientX, e.clientY);
    setContextMenu({ x: pt.x, y: pt.y, itemId });
  };

  const isHomeEmptyView = currentFolderId === 'home' && !normalizedSearch;
  const totalStatusCount = isHomeEmptyView ? 0 : visibleFolderItems.length;
  const canModifySelected =
    selectedIds.length > 0 &&
    selectedIds.some((id) => !SPECIAL_FOLDERS.has(id) && id !== 'drive-c' && id !== 'drive-d');

  const sidebarNavItems = [
    { id: 'home', label: 'Home', pinned: false },
    { id: 'gallery', label: 'Gallery', pinned: false },
    { id: 'onedrive', label: 'Sparkle - Personal', pinned: false, expandable: true, expanded: isOneDriveExpanded, onToggleExpand: () => setIsOneDriveExpanded((p) => !p) },
  ];

  const previewItem = previewItemId ? itemsById.get(previewItemId) ?? null : null;

  return (
    <div
      id="windows11-file-explorer"
      className="flex h-full min-h-[540px] w-full flex-col overflow-hidden bg-[#f3f3f3] text-[#111827] select-none dark:bg-[#191919] dark:text-[#f3f4f6]"
    >
      {/* Top Windows 11 Explorer Tab Strip */}
      <div className="flex h-10 shrink-0 items-end gap-1 border-b border-black/[0.06] bg-[#e8ebf0] px-2 pt-1.5 dark:border-white/[0.06] dark:bg-[#202020]">
        <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const tabFolderId = tab.history[tab.historyIndex] || 'home';
            const tabFolder = itemsById.get(tabFolderId);
            const tabTitle = tabFolder?.name || 'Home';
            const isActive = tab.id === activeTab.id;

            return (
              <div
                key={tab.id}
                className={`group flex h-8 min-w-[140px] max-w-[220px] shrink-0 items-center gap-2 rounded-t-[8px] px-2.5 text-[12px] transition-colors ${
                  isActive
                    ? 'bg-[#f9fafb] font-medium text-[#111827] shadow-sm dark:bg-[#2c2c2c] dark:text-white'
                    : 'text-[#4b5563] hover:bg-black/[0.05] dark:text-white/70 dark:hover:bg-white/[0.06]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setSelectedIds([]);
                  }}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left outline-none"
                >
                  <WindowsFolderGlyph folderId={tabFolderId} className="size-4 shrink-0" />
                  <span className="truncate">{tabTitle}</span>
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeTab(tab.id)}
                    aria-label={`Close ${tabTitle} tab`}
                    className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[4px] opacity-70 hover:bg-black/[0.08] hover:opacity-100 dark:hover:bg-white/[0.12]"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => createNewTab('home')}
            aria-label="Open new File Explorer tab"
            title="New tab"
            className="mb-0.5 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/80 dark:hover:bg-white/[0.08]"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden items-center gap-1 pb-1 text-[11px] text-[#6b7280] sm:flex dark:text-white/45">
          <FluentFileExplorerIcon className="size-4" />
          <span>File Explorer</span>
        </div>
      </div>

      {/* Navigation & Address & Search Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] bg-[#f9fafb] px-2.5 py-2 dark:border-white/[0.06] dark:bg-[#2c2c2c]">
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="Back"
            title="Back"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!canGoForward}
            aria-label="Forward"
            title="Forward"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goUp}
            disabled={!canGoUp && currentFolderId === 'home'}
            aria-label="Up one level"
            title="Up"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setItems(loadStoredFs())}
            aria-label="Refresh"
            title="Refresh"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Breadcrumb / Editable Address Bar */}
        <div
          onClick={() => {
            if (!isEditingAddress) {
              setAddressDraft(addressDisplayPath);
              setIsEditingAddress(true);
            }
          }}
          className="flex h-8 min-w-[200px] flex-1 items-center gap-1 overflow-x-auto no-scrollbar rounded-[6px] border border-black/[0.08] bg-white px-2.5 text-[12.5px] dark:border-white/[0.08] dark:bg-[#232323]"
        >
          {isEditingAddress ? (
            <form onSubmit={handleAddressSubmit} className="flex w-full items-center">
              <input
                type="text"
                autoFocus
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                onBlur={() => setIsEditingAddress(false)}
                aria-label="Address bar path"
                className="w-full bg-transparent text-[12.5px] text-[#111827] outline-none dark:text-white"
              />
            </form>
          ) : (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <WindowsFolderGlyph folderId={currentFolderId} className="mr-1 size-4 shrink-0" />
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <ChevronRight className="size-3.5 shrink-0 text-[#9ca3af] dark:text-white/40" aria-hidden="true" />}
                  <button
                    type="button"
                    onClick={() => navigateFolder(crumb.id)}
                    className="shrink-0 cursor-pointer rounded-[4px] px-1.5 py-0.5 text-[12.5px] text-[#111827] transition-colors hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Search Current Folder Box */}
        <div className="flex h-8 w-full shrink-0 items-center gap-2 rounded-[6px] border border-black/[0.08] bg-white px-2.5 sm:w-[220px] dark:border-white/[0.08] dark:bg-[#232323]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={`Search ${currentFolder.name}`}
            placeholder={`Search ${currentFolder.name}`}
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#111827] outline-none placeholder:text-[#6b7280] dark:text-white dark:placeholder:text-white/45"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear folder search"
              className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-[#6b7280] hover:bg-black/[0.06] dark:text-white/60 dark:hover:bg-white/[0.08]"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          ) : (
            <Search className="size-3.5 shrink-0 text-[#6b7280] dark:text-white/55" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Command Toolbar */}
      <div
        ref={toolbarRef}
        className="relative flex flex-wrap items-center justify-between gap-1 border-b border-black/[0.07] bg-[#f3f3f3] px-2.5 py-1.5 dark:border-white/[0.07] dark:bg-[#1f1f1f]"
      >
        <div className="flex flex-wrap items-center gap-0.5">
          {/* + New dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === 'new' ? null : 'new'))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] font-medium text-[#111827] transition-colors hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]"
            >
              <span className="inline-flex size-4 items-center justify-center rounded-full border border-[#0078d4] text-[#0078d4] dark:border-[#4cc2ff] dark:text-[#4cc2ff]">
                <Plus className="size-3" aria-hidden="true" />
              </span>
              <span>New</span>
              <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
            </button>

            {openDropdown === 'new' && (
              <div
                style={flyoutPanelStyle}
                className={`absolute left-0 top-9 z-40 w-[196px] ${flyoutPanelClassName}`}
              >
                <button
                  type="button"
                  onClick={() => createNewItem('folder')}
                  className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <FolderPlus className="size-4 text-[#f5b938]" aria-hidden="true" />
                  <span>Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => createNewItem('text')}
                  className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <FileText className="size-4 text-[#64748b] dark:text-white/80" aria-hidden="true" />
                  <span>Text Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => createNewItem('md')}
                  className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <FileCode className="size-4 text-[#0078d4] dark:text-[#4cc2ff]" aria-hidden="true" />
                  <span>Markdown Note</span>
                </button>
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" aria-hidden="true" />

          {/* Cut, Copy, Paste, Rename, Star/Pin, Delete */}
          <button
            type="button"
            disabled={!canModifySelected}
            onClick={() => setClipboard({ mode: 'cut', ids: selectedIds })}
            title="Cut"
            aria-label="Cut"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <Scissors className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!canModifySelected}
            onClick={() => setClipboard({ mode: 'copy', ids: selectedIds })}
            title="Copy"
            aria-label="Copy"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <Copy className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!clipboard || currentFolderId === 'home' || currentFolderId === 'this-pc' || currentFolderId === 'recycle-bin'}
            onClick={handlePaste}
            title="Paste"
            aria-label="Paste"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <ClipboardPaste className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!primarySelected || SPECIAL_FOLDERS.has(primarySelected.id)}
            onClick={() => {
              if (!primarySelected) return;
              setRenamingId(primarySelected.id);
              setRenameDraft(primarySelected.name);
            }}
            title="Rename"
            aria-label="Rename"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!primarySelected || primarySelected.type === 'drive'}
            onClick={() => primarySelected && toggleFavorite(primarySelected.id)}
            title={primarySelected?.isFavorite ? 'Remove from Favorites' : 'Pin to Favorites'}
            aria-label="Pin to Favorites"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <Star
              className={`size-4 ${primarySelected?.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            disabled={!canModifySelected}
            onClick={() => deleteItems(selectedIds)}
            title={currentFolderId === 'recycle-bin' ? 'Delete permanently' : 'Delete'}
            aria-label="Delete"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] disabled:pointer-events-none disabled:opacity-35 dark:text-white/85 dark:hover:bg-white/[0.08]"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>

          <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" aria-hidden="true" />

          {/* Sort dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === 'sort' ? null : 'sort'))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] text-[#111827] transition-colors hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]"
            >
              <span>Sort</span>
              <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
            </button>
            {openDropdown === 'sort' && (
              <div style={flyoutPanelStyle} className={`left-0 top-9 z-40 w-[176px] ${flyoutPanelClassName}`}>
                {(
                  [
                    ['name', 'Name'],
                    ['modified', 'Date modified'],
                    ['type', 'Type'],
                    ['size', 'Size'],
                  ] as const
                ).map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => {
                      if (sortField === field) setSortAsc((p) => !p);
                      else {
                        setSortField(field);
                        setSortAsc(true);
                      }
                      setOpenDropdown(null);
                    }}
                    className={`flex h-8 w-full cursor-pointer items-center justify-between rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] ${
                      sortField === field ? 'font-semibold text-[#0078d4] dark:text-[#4cc2ff]' : ''
                    }`}
                  >
                    <span>{label}</span>
                    {sortField === field && <span>{sortAsc ? '↑' : '↓'}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === 'view' ? null : 'view'))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] text-[#111827] transition-colors hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]"
            >
              <LayoutList className="size-3.5" aria-hidden="true" />
              <span>View</span>
              <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
            </button>
            {openDropdown === 'view' && (
              <div style={flyoutPanelStyle} className={`left-0 top-9 z-40 w-[176px] ${flyoutPanelClassName}`}>
                {(
                  [
                    ['details', 'Details'],
                    ['large', 'Large icons'],
                    ['medium', 'Medium icons'],
                    ['list', 'List'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setViewMode(mode);
                      setOpenDropdown(null);
                    }}
                    className={`flex h-8 w-full cursor-pointer items-center justify-between rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] ${
                      viewMode === mode ? 'font-semibold text-[#0078d4] dark:text-[#4cc2ff]' : ''
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === 'filter' ? null : 'filter'))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] text-[#111827] transition-colors hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]"
            >
              <ListFilter className="size-3.5" aria-hidden="true" />
              <span>Filter</span>
              <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
            </button>
            {openDropdown === 'filter' && (
              <div style={flyoutPanelStyle} className={`left-0 top-9 z-40 w-[166px] ${flyoutPanelClassName}`}>
                {(
                  [
                    ['all', 'All items'],
                    ['folders', 'Folders only'],
                    ['documents', 'Documents'],
                    ['images', 'Images'],
                    ['media', 'Audio & Video'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setFilterMode(mode);
                      setOpenDropdown(null);
                    }}
                    className={`flex h-8 w-full cursor-pointer items-center justify-between rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] ${
                      filterMode === mode ? 'font-semibold text-[#0078d4] dark:text-[#4cc2ff]' : ''
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === 'more' ? null : 'more'))}
              aria-label="More options"
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
            {openDropdown === 'more' && (
              <div style={flyoutPanelStyle} className={`left-0 top-9 z-40 w-[200px] ${flyoutPanelClassName}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(visibleFolderItems.map((i) => i.id));
                    setOpenDropdown(null);
                  }}
                  className="flex h-8 w-full cursor-pointer items-center rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  Select all
                </button>
                {currentFolderId === 'recycle-bin' && (
                  <button
                    type="button"
                    onClick={() => {
                      emptyRecycleBin();
                      setOpenDropdown(null);
                    }}
                    className="flex h-8 w-full cursor-pointer items-center rounded-[5px] px-2.5 text-[12.5px] text-rose-600 hover:bg-black/[0.06] dark:text-rose-400 dark:hover:bg-white/[0.09]"
                  >
                    Empty Recycle Bin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetFileSystem();
                    setOpenDropdown(null);
                  }}
                  className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2.5 text-[12.5px] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Reset default files</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Details Pane Toggle */}
        <button
          type="button"
          onClick={() => setShowDetailsPane((p) => !p)}
          aria-pressed={showDetailsPane}
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] transition-colors ${
            showDetailsPane
              ? 'bg-black/[0.08] font-medium text-[#111827] dark:bg-white/[0.12] dark:text-white'
              : 'text-[#374151] hover:bg-black/[0.06] dark:text-white/85 dark:hover:bg-white/[0.08]'
          }`}
        >
          <PanelRight className="size-4" aria-hidden="true" />
          <span>Details</span>
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Navigation Tree */}
        <aside
          aria-label="File Explorer navigation"
          className="hidden w-[204px] shrink-0 overflow-y-auto border-r border-black/[0.07] bg-[#f3f3f3] p-2 md:block dark:border-white/[0.06] dark:bg-[#191919]"
        >
          <div className="space-y-0.5">
            {sidebarNavItems.map((nav) => {
              const isSelected = currentFolderId === nav.id;
              return (
                <div key={nav.id}>
                  <button
                    type="button"
                    onClick={() => navigateFolder(nav.id)}
                    className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-left text-[12.5px] transition-colors ${
                      isSelected
                        ? 'bg-black/[0.08] font-medium text-[#111827] dark:bg-white/[0.1] dark:text-white'
                        : 'text-[#374151] hover:bg-black/[0.05] dark:text-white/85 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {nav.expandable ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          nav.onToggleExpand?.();
                        }}
                        className="inline-flex size-4 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        {nav.expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                      </span>
                    ) : (
                      <span className="w-2 shrink-0" />
                    )}
                    <WindowsFolderGlyph folderId={nav.id} className="size-4 shrink-0" />
                    <span className="truncate">{nav.label}</span>
                  </button>
                  {nav.id === 'onedrive' && isOneDriveExpanded && (
                    <div className="mt-0.5 space-y-0.5 pl-6">
                      <button
                        type="button"
                        onClick={() => navigateFolder('documents')}
                        className="flex h-7 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[12px] text-[#4b5563] hover:bg-black/[0.05] dark:text-white/75 dark:hover:bg-white/[0.06]"
                      >
                        <WindowsFolderGlyph folderId="documents" className="size-3.5 shrink-0" />
                        <span className="truncate">Documents</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateFolder('pictures')}
                        className="flex h-7 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[12px] text-[#4b5563] hover:bg-black/[0.05] dark:text-white/75 dark:hover:bg-white/[0.06]"
                      >
                        <WindowsFolderGlyph folderId="pictures" className="size-3.5 shrink-0" />
                        <span className="truncate">Pictures</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="my-2.5 h-px bg-black/[0.07] dark:bg-white/[0.07]" />

          {/* Pinned Quick Access Folders */}
          <div className="space-y-0.5">
            {quickAccessFolders.map((folder) => {
              const isSelected = currentFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => navigateFolder(folder.id)}
                  className={`flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-[5px] pl-4 pr-2 text-left text-[12.5px] transition-colors ${
                    isSelected
                      ? 'bg-black/[0.08] font-medium text-[#111827] dark:bg-white/[0.1] dark:text-white'
                      : 'text-[#374151] hover:bg-black/[0.05] dark:text-white/85 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <WindowsFolderGlyph folderId={folder.id} className="size-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <Pin className="size-3 shrink-0 rotate-45 text-[#9ca3af] dark:text-white/35" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="my-2.5 h-px bg-black/[0.07] dark:bg-white/[0.07]" />

          {/* This PC, Network, Recycle Bin */}
          <div className="space-y-0.5">
            <div>
              <button
                type="button"
                onClick={() => navigateFolder('this-pc')}
                className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-left text-[12.5px] transition-colors ${
                  currentFolderId === 'this-pc'
                    ? 'bg-black/[0.08] font-medium text-[#111827] dark:bg-white/[0.1] dark:text-white'
                    : 'text-[#374151] hover:bg-black/[0.05] dark:text-white/85 dark:hover:bg-white/[0.06]'
                }`}
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsThisPcExpanded((p) => !p);
                  }}
                  className="inline-flex size-4 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
                >
                  {isThisPcExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                </span>
                <WindowsFolderGlyph folderId="this-pc" className="size-4 shrink-0" />
                <span className="truncate">This PC</span>
              </button>
              {isThisPcExpanded && (
                <div className="mt-0.5 space-y-0.5 pl-6">
                  <button
                    type="button"
                    onClick={() => navigateFolder('drive-c')}
                    className={`flex h-7 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[12px] ${
                      currentFolderId === 'drive-c'
                        ? 'bg-black/[0.08] font-medium dark:bg-white/[0.1]'
                        : 'text-[#4b5563] hover:bg-black/[0.05] dark:text-white/75 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <HardDrive className="size-3.5 shrink-0 text-[#64748b] dark:text-[#94a3b8]" />
                    <span className="truncate">Local Disk (C:)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateFolder('drive-d')}
                    className={`flex h-7 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[12px] ${
                      currentFolderId === 'drive-d'
                        ? 'bg-black/[0.08] font-medium dark:bg-white/[0.1]'
                        : 'text-[#4b5563] hover:bg-black/[0.05] dark:text-white/75 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <HardDrive className="size-3.5 shrink-0 text-[#64748b] dark:text-[#94a3b8]" />
                    <span className="truncate">Sparkle Media (D:)</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateFolder('network')}
              className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] pl-4 pr-2 text-left text-[12.5px] transition-colors ${
                currentFolderId === 'network'
                  ? 'bg-black/[0.08] font-medium text-[#111827] dark:bg-white/[0.1] dark:text-white'
                  : 'text-[#374151] hover:bg-black/[0.05] dark:text-white/85 dark:hover:bg-white/[0.06]'
              }`}
            >
              <WindowsFolderGlyph folderId="network" className="size-4 shrink-0" />
              <span className="truncate">Network</span>
            </button>

            <button
              type="button"
              onClick={() => navigateFolder('recycle-bin')}
              className={`flex h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] pl-4 pr-2 text-left text-[12.5px] transition-colors ${
                currentFolderId === 'recycle-bin'
                  ? 'bg-black/[0.08] font-medium text-[#111827] dark:bg-white/[0.1] dark:text-white'
                  : 'text-[#374151] hover:bg-black/[0.05] dark:text-white/85 dark:hover:bg-white/[0.06]'
              }`}
            >
              <WindowsFolderGlyph folderId="recycle-bin" className="size-4 shrink-0" />
              <span className="truncate">Recycle Bin</span>
            </button>
          </div>
        </aside>

        {/* Center Main File Canvas */}
        <main
          onClick={() => setSelectedIds([])}
          onContextMenu={(e) => openContextMenu(e, null)}
          className="min-w-0 flex-1 overflow-y-auto bg-[#ffffff] p-4 sm:p-5 dark:bg-[#191919]"
        >
          {isHomeEmptyView ? (
            <div className="space-y-6">
              {/* Quick access section matching Windows 11 Explorer Home */}
              <section>
                <button
                  type="button"
                  onClick={() => setIsQuickAccessOpen((p) => !p)}
                  className="mb-3 flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-[#111827] dark:text-white"
                >
                  {isQuickAccessOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <span>Quick access</span>
                </button>

                {isQuickAccessOpen && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {quickAccessFolders.map((folder) => {
                      const isSel = selectedIds.includes(folder.id);
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds([folder.id]);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            navigateFolder(folder.id);
                          }}
                          onContextMenu={(e) => openContextMenu(e, folder.id)}
                          className={`flex cursor-pointer items-center gap-3 rounded-[6px] p-2.5 text-left transition-colors ${
                            isSel
                              ? 'bg-[#0078d4]/15 ring-1 ring-[#0078d4]/60 dark:bg-white/[0.12] dark:ring-white/25'
                              : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <WindowsFolderGlyph folderId={folder.id} className="size-10 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-[#111827] dark:text-white">
                              {folder.name}
                            </div>
                            <div className="truncate text-[11.5px] text-[#6b7280] dark:text-white/55">
                              {folder.locationLabel}
                            </div>
                            <Pin className="mt-1 size-3 rotate-45 text-[#9ca3af] dark:text-white/40" aria-hidden="true" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Favorites section */}
              <section>
                <button
                  type="button"
                  onClick={() => setIsFavoritesOpen((p) => !p)}
                  className="mb-3 flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-[#111827] dark:text-white"
                >
                  {isFavoritesOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <span>Favorites</span>
                </button>

                {isFavoritesOpen && (
                  favoriteFiles.length === 0 ? (
                    <p className="pl-5 text-[12.5px] text-[#6b7280] dark:text-white/55">
                      After you&apos;ve pinned some files, we&apos;ll show them here.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {favoriteFiles.map((file) => {
                        const isSel = selectedIds.includes(file.id);
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIds([file.id]);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              openItem(file);
                            }}
                            onContextMenu={(e) => openContextMenu(e, file.id)}
                            className={`flex cursor-pointer items-center gap-3 rounded-[6px] p-2.5 text-left transition-colors ${
                              isSel
                                ? 'bg-[#0078d4]/15 ring-1 ring-[#0078d4]/60 dark:bg-white/[0.12] dark:ring-white/25'
                                : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <FsItemIcon item={file} className="size-8 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12.5px] font-medium text-[#111827] dark:text-white">
                                {file.name}
                              </div>
                              <div className="truncate text-[11px] text-[#6b7280] dark:text-white/55">
                                {file.locationLabel}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </section>

              {/* Recent section */}
              <section>
                <button
                  type="button"
                  onClick={() => setIsRecentOpen((p) => !p)}
                  className="mb-2 flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-[#111827] dark:text-white"
                >
                  {isRecentOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <span>Recent</span>
                </button>

                {isRecentOpen && (
                  <div className="space-y-0.5 pl-1">
                    {recentFiles.map((file) => {
                      const isSel = selectedIds.includes(file.id);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds([file.id]);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            openItem(file);
                          }}
                          onContextMenu={(e) => openContextMenu(e, file.id)}
                          className={`grid w-full cursor-pointer grid-cols-[minmax(0,1.5fr)_140px_minmax(0,1fr)] items-center gap-4 rounded-[5px] px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                            isSel
                              ? 'bg-[#0078d4]/15 dark:bg-white/[0.12]'
                              : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <FsItemIcon item={file} className="size-4 shrink-0" />
                            <span className="truncate font-medium text-[#111827] dark:text-white/95">
                              {file.name}
                            </span>
                          </span>
                          <span className="truncate text-[12px] tabular-nums text-[#6b7280] dark:text-white/60">
                            {file.modifiedAt}
                          </span>
                          <span className="hidden truncate text-[12px] text-[#6b7280] sm:block dark:text-white/60">
                            {file.locationLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : currentFolderId === 'this-pc' && !normalizedSearch ? (
            <div className="space-y-6">
              <section>
                <h2 className="mb-3 text-[13.5px] font-semibold text-[#111827] dark:text-white">
                  Folders ({quickAccessFolders.length})
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {quickAccessFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        navigateFolder(folder.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIds([folder.id]);
                      }}
                      className={`flex cursor-pointer items-center gap-3 rounded-[6px] p-2.5 text-left transition-colors ${
                        selectedIds.includes(folder.id)
                          ? 'bg-[#0078d4]/15 ring-1 ring-[#0078d4]/60 dark:bg-white/[0.12] dark:ring-white/25'
                          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <WindowsFolderGlyph folderId={folder.id} className="size-9 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{folder.name}</div>
                        <div className="truncate text-[11px] text-[#6b7280] dark:text-white/55">Local folder</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-[13.5px] font-semibold text-[#111827] dark:text-white">
                  Devices and drives ({visibleFolderItems.length})
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleFolderItems.map((drive) => {
                    const used = drive.driveUsedGb ?? 120;
                    const total = drive.driveTotalGb ?? 512;
                    const pct = Math.min(100, Math.round((used / total) * 100));
                    const free = total - used;
                    return (
                      <button
                        key={drive.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds([drive.id]);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          navigateFolder(drive.id);
                        }}
                        className={`flex cursor-pointer items-center gap-3 rounded-[6px] border p-3 text-left transition-colors ${
                          selectedIds.includes(drive.id)
                            ? 'border-[#0078d4]/60 bg-[#0078d4]/10 dark:border-white/25 dark:bg-white/[0.1]'
                            : 'border-black/[0.07] hover:bg-black/[0.04] dark:border-white/[0.08] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <HardDrive className="size-10 shrink-0 text-[#64748b] dark:text-[#94a3b8]" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{drive.name}</div>
                          <div className="mt-1.5 h-3 w-full overflow-hidden rounded-[2px] bg-black/[0.08] dark:bg-white/[0.1]">
                            <div
                              className="h-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[11.5px] tabular-nums text-[#6b7280] dark:text-white/60">
                            {free} GB free of {total >= 1000 ? `${(total / 1000).toFixed(2)} TB` : `${total} GB`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : visibleFolderItems.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-[#6b7280] dark:text-white/50">
              <p className="text-[13px]">
                {normalizedSearch
                  ? `No items match "${searchQuery}".`
                  : currentFolderId === 'recycle-bin'
                    ? 'Recycle Bin is empty.'
                    : 'This folder is empty.'}
              </p>
              {currentFolderId !== 'recycle-bin' && !normalizedSearch && (
                <button
                  type="button"
                  onClick={() => createNewItem('folder')}
                  className="mt-3 cursor-pointer rounded-[6px] border border-black/[0.1] px-3 py-1.5 text-[12px] font-medium text-[#111827] hover:bg-black/[0.05] dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.08]"
                >
                  Create New folder
                </button>
              )}
            </div>
          ) : viewMode === 'details' ? (
            <div>
              <div className="grid grid-cols-[minmax(0,1.8fr)_130px_130px_90px] items-center gap-3 border-b border-black/[0.07] px-3 py-1.5 text-[11.5px] font-medium text-[#5f6368] dark:border-white/[0.07] dark:text-white/60">
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === 'name') setSortAsc((p) => !p);
                    else { setSortField('name'); setSortAsc(true); }
                  }}
                  className="cursor-pointer text-left hover:text-[#111827] dark:hover:text-white"
                >
                  Name {sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === 'modified') setSortAsc((p) => !p);
                    else { setSortField('modified'); setSortAsc(true); }
                  }}
                  className="hidden cursor-pointer text-left sm:block hover:text-[#111827] dark:hover:text-white"
                >
                  Date modified {sortField === 'modified' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === 'type') setSortAsc((p) => !p);
                    else { setSortField('type'); setSortAsc(true); }
                  }}
                  className="hidden cursor-pointer text-left md:block hover:text-[#111827] dark:hover:text-white"
                >
                  Type {sortField === 'type' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === 'size') setSortAsc((p) => !p);
                    else { setSortField('size'); setSortAsc(true); }
                  }}
                  className="cursor-pointer text-right hover:text-[#111827] dark:hover:text-white"
                >
                  Size {sortField === 'size' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
              </div>

              <div className="mt-1 space-y-0.5">
                {visibleFolderItems.map((item) => {
                  const isSel = selectedIds.includes(item.id);
                  const isCut = clipboard?.mode === 'cut' && clipboard.ids.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (e.ctrlKey || e.metaKey) {
                          setSelectedIds((prev) =>
                            prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                          );
                        } else {
                          setSelectedIds([item.id]);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        openItem(item);
                      }}
                      onContextMenu={(e) => openContextMenu(e, item.id)}
                      className={`grid cursor-pointer grid-cols-[minmax(0,1.8fr)_130px_130px_90px] items-center gap-3 rounded-[5px] px-3 py-1.5 text-[12.5px] transition-colors ${
                        isCut ? 'opacity-50' : ''
                      } ${
                        isSel
                          ? 'bg-[#0078d4]/15 dark:bg-white/[0.12]'
                          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <FsItemIcon item={item} className="size-4 shrink-0" />
                        {renamingId === item.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded border border-[#0078d4] bg-white px-1.5 py-0.5 text-[12.5px] text-[#111827] outline-none dark:bg-[#232323] dark:text-white"
                          />
                        ) : (
                          <span className="truncate font-medium">{item.name}</span>
                        )}
                      </span>
                      <span className="hidden truncate text-[12px] tabular-nums text-[#6b7280] sm:block dark:text-white/60">
                        {item.modifiedAt}
                      </span>
                      <span className="hidden truncate text-[12px] text-[#6b7280] md:block dark:text-white/60">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="truncate text-right text-[12px] tabular-nums text-[#6b7280] dark:text-white/60">
                        {formatBytes(item.sizeBytes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFolderItems.map((item) => {
                const isSel = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIds([item.id]);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openItem(item);
                    }}
                    onContextMenu={(e) => openContextMenu(e, item.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-left text-[12.5px] ${
                      isSel
                        ? 'bg-[#0078d4]/15 dark:bg-white/[0.12]'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <FsItemIcon item={item} className="size-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className={`grid gap-2.5 ${
                viewMode === 'large'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                  : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7'
              }`}
            >
              {visibleFolderItems.map((item) => {
                const isSel = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIds([item.id]);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openItem(item);
                    }}
                    onContextMenu={(e) => openContextMenu(e, item.id)}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-[6px] p-2.5 text-center transition-colors ${
                      isSel
                        ? 'bg-[#0078d4]/15 ring-1 ring-[#0078d4]/60 dark:bg-white/[0.12] dark:ring-white/25'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {item.type === 'image' && item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        draggable={false}
                        className={`${
                          viewMode === 'large' ? 'h-20 w-28' : 'h-14 w-18'
                        } rounded-[4px] object-cover shadow-sm`}
                      />
                    ) : (
                      <FsItemIcon
                        item={item}
                        className={viewMode === 'large' ? 'size-12 shrink-0' : 'size-9 shrink-0'}
                      />
                    )}
                    <span className="w-full line-clamp-2 break-all text-[12px] leading-snug">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* Optional Details / Preview Pane */}
        {showDetailsPane && (
          <aside className="hidden w-[250px] shrink-0 overflow-y-auto border-l border-black/[0.07] bg-[#f9fafb] p-4 lg:block dark:border-white/[0.07] dark:bg-[#202020]">
            {primarySelected ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center rounded-[8px] border border-black/[0.06] bg-white p-4 text-center dark:border-white/[0.06] dark:bg-[#262626]">
                  {primarySelected.type === 'image' && primarySelected.previewUrl ? (
                    <img
                      src={primarySelected.previewUrl}
                      alt={primarySelected.name}
                      className="max-h-32 w-full rounded-[4px] object-cover"
                    />
                  ) : (
                    <FsItemIcon item={primarySelected} className="size-14" />
                  )}
                  <h3 className="mt-3 w-full break-words text-[13px] font-semibold">
                    {primarySelected.name}
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-[#6b7280] dark:text-white/55">
                    {getTypeLabel(primarySelected.type)}
                  </p>
                </div>

                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#6b7280] dark:text-white/55">Date modified</span>
                    <span className="tabular-nums font-medium">{primarySelected.modifiedAt}</span>
                  </div>
                  {primarySelected.sizeBytes !== undefined && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[#6b7280] dark:text-white/55">Size</span>
                      <span className="tabular-nums font-medium">{formatBytes(primarySelected.sizeBytes)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-[#6b7280] dark:text-white/55">Location</span>
                    <span className="truncate font-medium">{primarySelected.locationLabel}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => openItem(primarySelected)}
                    className="w-full cursor-pointer rounded-[6px] bg-[#0078d4] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#106ebe]"
                  >
                    Open
                  </button>
                  {primarySelected.type !== 'drive' && (
                    <button
                      type="button"
                      onClick={() => toggleFavorite(primarySelected.id)}
                      className="w-full cursor-pointer rounded-[6px] border border-black/[0.08] px-3 py-1.5 text-[12px] font-medium hover:bg-black/[0.05] dark:border-white/[0.1] dark:hover:bg-white/[0.08]"
                    >
                      {primarySelected.isFavorite ? 'Remove from Favorites' : 'Pin to Favorites'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-[#6b7280] dark:text-white/50">
                <WindowsFolderGlyph folderId={currentFolderId} className="mb-2 size-10" />
                <p className="text-[12.5px] font-medium text-[#111827] dark:text-white/85">
                  {currentFolder.name}
                </p>
                <p className="mt-1 text-[11.5px]">Select a file to view its details.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-black/[0.07] bg-[#f3f3f3] px-3 text-[11.5px] tabular-nums text-[#4b5563] dark:border-white/[0.07] dark:bg-[#1c1c1c] dark:text-white/70">
        <div className="flex items-center gap-2 truncate">
          <span>
            {totalStatusCount} {totalStatusCount === 1 ? 'item' : 'items'}
          </span>
          {selectedIds.length > 0 && (
            <>
              <span aria-hidden="true">|</span>
              <span>
                {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('details')}
            aria-label="Details view"
            title="Details view"
            className={`inline-flex size-5 cursor-pointer items-center justify-center rounded-[4px] ${
              viewMode === 'details'
                ? 'bg-black/[0.1] text-[#111827] dark:bg-white/[0.16] dark:text-white'
                : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
          >
            <LayoutList className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('large')}
            aria-label="Large icons view"
            title="Large icons view"
            className={`inline-flex size-5 cursor-pointer items-center justify-center rounded-[4px] ${
              viewMode === 'large'
                ? 'bg-black/[0.1] text-[#111827] dark:bg-white/[0.16] dark:text-white'
                : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
          >
            <LayoutGrid className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </footer>

      {/* Built-in File Preview / Text Editor Modal */}
      {previewItem &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPreviewItemId(null);
            }}
          >
            <div className="flex max-h-[85vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[12px] border border-black/[0.12] bg-white text-[#111827] shadow-2xl dark:border-white/[0.14] dark:bg-[#22262c] dark:text-white">
              <div className="flex h-11 items-center justify-between border-b border-black/[0.08] px-4 dark:border-white/[0.08]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FsItemIcon item={previewItem} className="size-4 shrink-0" />
                  <span className="truncate text-[13px] font-semibold">{previewItem.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItemId(null)}
                  aria-label="Close preview"
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[6px] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {previewItem.type === 'image' && previewItem.previewUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={previewItem.previewUrl}
                      alt={previewItem.name}
                      className="max-h-[58vh] rounded-[8px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewItemId(null);
                        navigate('/gallery');
                      }}
                      className="cursor-pointer rounded-[6px] bg-[#0078d4] px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#106ebe]"
                    >
                      Open in Gallery app
                    </button>
                  </div>
                ) : previewItem.type === 'audio' && previewItem.previewUrl ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <FileMusic className="size-12 text-[#f97316]" />
                    <audio controls src={previewItem.previewUrl} className="w-full max-w-md" />
                  </div>
                ) : previewItem.type === 'video' && previewItem.previewUrl ? (
                  <video controls src={previewItem.previewUrl} className="max-h-[58vh] w-full rounded-[8px] bg-black" />
                ) : previewItem.type === 'text' || previewItem.type === 'code' ? (
                  <div className="space-y-3">
                    <textarea
                      value={previewTextDraft}
                      onChange={(e) => setPreviewTextDraft(e.target.value)}
                      rows={12}
                      className="w-full rounded-[8px] border border-black/[0.1] bg-[#f9fafb] p-3 font-mono text-[12.5px] leading-relaxed outline-none focus:border-[#0078d4] dark:border-white/[0.1] dark:bg-[#181b20] dark:focus:border-[#4cc2ff]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
                          persistItems(
                            items.map((it) =>
                              it.id === previewItem.id
                                ? {
                                    ...it,
                                    content: previewTextDraft,
                                    sizeBytes: new Blob([previewTextDraft]).size,
                                    modifiedAt: nowStamp,
                                  }
                                : it
                            )
                          );
                          setPreviewItemId(null);
                        }}
                        className="cursor-pointer rounded-[6px] bg-[#0078d4] px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#106ebe]"
                      >
                        Save file
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[8px] border border-black/[0.07] bg-[#f9fafb] p-4 text-[13px] leading-relaxed dark:border-white/[0.08] dark:bg-[#1a1d22]">
                    <p className="whitespace-pre-wrap">
                      {previewItem.content || `${previewItem.name} (${getTypeLabel(previewItem.type)})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          getAppPortalTarget() ?? document.body
        )}

      {/* Right-Click Context Menu */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            role="menu"
            aria-label="File Explorer context menu"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              ...flyoutPanelStyle,
              left: contextMenuPos.left,
              top: contextMenuPos.top,
            }}
            className={`fixed z-[2147483647] w-[216px] ${flyoutPanelClassName} fluent-context-menu`}
          >
            {contextMenu.itemId ? (
              (() => {
                const target = itemsById.get(contextMenu.itemId);
                if (!target) return null;
                const isProtected = SPECIAL_FOLDERS.has(target.id) || target.type === 'drive';
                return (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setContextMenu(null);
                        openItem(target);
                      }}
                      className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                    >
                      <Folder className="size-4 shrink-0" />
                      <span>Open</span>
                    </button>
                    {target.trashed ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          restoreItems([target.id]);
                          setContextMenu(null);
                        }}
                        className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                      >
                        <RotateCcw className="size-4 shrink-0" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      <>
                        {!isProtected && (
                          <>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setClipboard({ mode: 'cut', ids: [target.id] });
                                setContextMenu(null);
                              }}
                              className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                            >
                              <Scissors className="size-4 shrink-0" />
                              <span>Cut</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setClipboard({ mode: 'copy', ids: [target.id] });
                                setContextMenu(null);
                              }}
                              className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                            >
                              <Copy className="size-4 shrink-0" />
                              <span>Copy</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setRenamingId(target.id);
                                setRenameDraft(target.name);
                                setContextMenu(null);
                              }}
                              className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                            >
                              <Pencil className="size-4 shrink-0" />
                              <span>Rename</span>
                            </button>
                          </>
                        )}
                        {target.type !== 'drive' && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              toggleFavorite(target.id);
                              setContextMenu(null);
                            }}
                            className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                          >
                            {target.isFavorite ? <PinOff className="size-4 shrink-0" /> : <Star className="size-4 shrink-0" />}
                            <span>{target.isFavorite ? 'Remove from Favorites' : 'Pin to Favorites'}</span>
                          </button>
                        )}
                        {!isProtected && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              deleteItems([target.id]);
                              setContextMenu(null);
                            }}
                            className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium text-rose-600 hover:bg-black/[0.06] dark:text-rose-400 dark:hover:bg-white/[0.09]"
                          >
                            <Trash2 className="size-4 shrink-0" />
                            <span>Delete</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                );
              })()
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setContextMenu(null);
                    createNewItem('folder');
                  }}
                  className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <FolderPlus className="size-4 shrink-0" />
                  <span>New folder</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setContextMenu(null);
                    createNewItem('text');
                  }}
                  className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <FileText className="size-4 shrink-0" />
                  <span>New text document</span>
                </button>
                {clipboard && currentFolderId !== 'home' && currentFolderId !== 'this-pc' && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handlePaste();
                      setContextMenu(null);
                    }}
                    className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                  >
                    <ClipboardPaste className="size-4 shrink-0" />
                    <span>Paste</span>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setItems(loadStoredFs());
                    setContextMenu(null);
                  }}
                  className="flex h-[32px] w-full cursor-pointer items-center gap-2.5 rounded-[5px] px-3 text-left text-[12.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                >
                  <RotateCw className="size-4 shrink-0" />
                  <span>Refresh</span>
                </button>
              </>
            )}
          </div>,
          getAppPortalTarget() ?? document.body
        )}
    </div>
  );
};
