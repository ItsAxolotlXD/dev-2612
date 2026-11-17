import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FolderMinus,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Info,
  Pencil,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  User,
} from 'lucide-react';
import { getAppPortalTarget, toAppPortalCoordinates } from '../utils/appPortal';
import { flyoutPanelClassName, flyoutPanelStyle } from './FlyoutDropdown';
import {
  FluentArticlesIcon,
  FluentCalculatorIcon,
  FluentCameraIcon,
  FluentCraftmineIcon,
  FluentFileExplorerIcon,
  FluentGalleryIcon,
  FluentHomeIcon,
  FluentHtmlWriterIcon,
  FluentInkCanvasIcon,
  FluentMediaPlayerIcon,
  FluentNotesIcon,
  FluentPersonFeedbackIcon,
  FluentPhotopeaIcon,
  FluentScreenbugIcon,
  FluentSettingsIcon,
  FluentUpdatesIcon,
  FluentWatchIcon,
} from './FluentIcons';
import {
  Fluent3DArticlesIcon,
  Fluent3DCameraIcon,
  Fluent3DCraftmineIcon,
  Fluent3DDiscordIcon,
  Fluent3DGalleryIcon,
  Fluent3DHomeIcon,
  Fluent3DNotesIcon,
  Fluent3DPhotopeaIcon,
  Fluent3DScreenbugIcon,
  Fluent3DSettingsIcon,
  Fluent3DUpdatesIcon,
  Fluent3DWatchPreviewIcon,
} from './Fluent3DIcons';

const WINUI3_ICON_URL =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/WinUI.svg/120px-WinUI.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20241127184612';
const DIRECT_COMMAND_ICON_URL = '/assets/aistudio/direct_command_6240d59d.png';
const START_LAYOUT_STORAGE_KEY = 'sparkle_start_pinned_layout_v1';

interface StartMenuProps {
  isOpen: boolean;
  isTopBarBottom?: boolean;
  showWidgets?: boolean;
  dynamicSidebarIcons?: boolean;
  fluentIcons?: boolean;
  onNavigate: (route: string, state?: any) => void;
  onOpenSearch: () => void;
  onOpenDirectCommand: () => void;
  onOpenCommandPrompt: () => void;
  onOpenWidgets: () => void;
  onOpenViveToolGui: () => void;
  onOpenAbout: () => void;
  onOpenSetupWizard: () => void;
  onClose: () => void;
}

interface StartAppItem {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  smallIcon: React.ReactNode;
  onSelect: () => void;
}

type StartPinnedEntry =
  | { type: 'app'; id: string }
  | { type: 'folder'; id: string; name: string; appIds: string[] };

type StartDragState = {
  sourceType: 'app' | 'folder';
  entryId: string;
  appId?: string;
  fromFolderId?: string;
};

type StartDropTarget = {
  index: number;
  mode: 'before' | 'after' | 'folder';
};

type StartContextMenuState =
  | { x: number; y: number; scope: 'background' }
  | { x: number; y: number; scope: 'app'; appId: string; index: number; folderId?: string }
  | { x: number; y: number; scope: 'folder'; folderId: string; index: number };

const buildDefaultLayout = (appIds: string[]): StartPinnedEntry[] =>
  appIds.map((id) => ({ type: 'app', id }));

const sanitizeLayout = (raw: unknown, validAppIds: string[]): StartPinnedEntry[] => {
  const validSet = new Set(validAppIds);
  if (!Array.isArray(raw)) {
    return buildDefaultLayout(validAppIds);
  }

  const seenAppIds = new Set<string>();
  const seenFolderIds = new Set<string>();
  const result: StartPinnedEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<StartPinnedEntry>;

    if (candidate.type === 'app' && typeof candidate.id === 'string') {
      if (validSet.has(candidate.id) && !seenAppIds.has(candidate.id)) {
        seenAppIds.add(candidate.id);
        result.push({ type: 'app', id: candidate.id });
      }
    } else if (
      candidate.type === 'folder' &&
      typeof candidate.id === 'string' &&
      Array.isArray(candidate.appIds)
    ) {
      if (seenFolderIds.has(candidate.id)) continue;
      const folderApps = candidate.appIds.filter(
        (id): id is string => typeof id === 'string' && validSet.has(id) && !seenAppIds.has(id)
      );
      if (folderApps.length >= 2) {
        seenFolderIds.add(candidate.id);
        folderApps.forEach((id) => seenAppIds.add(id));
        result.push({
          type: 'folder',
          id: candidate.id,
          name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : 'Folder',
          appIds: folderApps,
        });
      } else if (folderApps.length === 1) {
        seenAppIds.add(folderApps[0]);
        result.push({ type: 'app', id: folderApps[0] });
      }
    }
  }

  for (const id of validAppIds) {
    if (!seenAppIds.has(id)) {
      seenAppIds.add(id);
      result.push({ type: 'app', id });
    }
  }

  return result;
};

export const StartMenu: React.FC<StartMenuProps> = ({
  isOpen,
  isTopBarBottom = true,
  showWidgets = false,
  dynamicSidebarIcons = true,
  fluentIcons = false,
  onNavigate,
  onOpenSearch,
  onOpenDirectCommand,
  onOpenCommandPrompt,
  onOpenWidgets,
  onOpenViveToolGui,
  onOpenAbout,
  onOpenSetupWizard,
  onClose,
}) => {
  const [showAllApps, setShowAllApps] = useState(false);
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [focusFolderTitleOnOpen, setFocusFolderTitleOnOpen] = useState(false);
  const [dragState, setDragState] = useState<StartDragState | null>(null);
  const [dropTarget, setDropTarget] = useState<StartDropTarget | null>(null);
  const [folderAppDropIndex, setFolderAppDropIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<StartContextMenuState | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const dialogRef = useRef<HTMLElement | null>(null);
  const searchBtnRef = useRef<HTMLButtonElement | null>(null);
  const folderTitleInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const useFluent3DForContent = dynamicSidebarIcons || fluentIcons;
  const useFluent3DForSystem = !dynamicSidebarIcons && fluentIcons;

  const pinnedApps: StartAppItem[] = useMemo(() => {
    const items: StartAppItem[] = [
      {
        id: 'start-home',
        label: 'Home',
        subtitle: 'Start screen',
        icon: useFluent3DForContent ? (
          <Fluent3DHomeIcon className="size-7 shrink-0" />
        ) : (
          <FluentHomeIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DHomeIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentHomeIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/');
        },
      },
      {
        id: 'start-feed',
        label: 'Feed',
        subtitle: 'News & Articles',
        icon: useFluent3DForContent ? (
          <Fluent3DArticlesIcon className="size-7 shrink-0" />
        ) : (
          <FluentArticlesIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DArticlesIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentArticlesIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/news');
        },
      },
      {
        id: 'start-watch',
        label: 'Watch',
        subtitle: 'Live TV & Streams',
        icon: useFluent3DForContent ? (
          <Fluent3DWatchPreviewIcon className="size-7 shrink-0" />
        ) : (
          <FluentWatchIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DWatchPreviewIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentWatchIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/live-tv');
        },
      },
      {
        id: 'start-explorer',
        label: 'File Explorer',
        subtitle: 'Files & folders',
        icon: <FluentFileExplorerIcon className="size-7 shrink-0" />,
        smallIcon: <FluentFileExplorerIcon className="size-3.5 shrink-0" />,
        onSelect: () => {
          onClose();
          onNavigate('/explorer');
        },
      },
      {
        id: 'start-calculator',
        label: 'Calculator',
        subtitle: 'Standard & scientific',
        icon: <FluentCalculatorIcon className="size-7 shrink-0" />,
        smallIcon: <FluentCalculatorIcon className="size-3.5 shrink-0" />,
        onSelect: () => {
          onClose();
          onNavigate('/calculator');
        },
      },
      {
        id: 'start-html-writer',
        label: 'HTML Writer',
        subtitle: 'Write & run HTML',
        icon: <FluentHtmlWriterIcon className="size-7 shrink-0" />,
        smallIcon: <FluentHtmlWriterIcon className="size-3.5 shrink-0" />,
        onSelect: () => {
          onClose();
          onNavigate('/html-writer');
        },
      },
      {
        id: 'start-media-player',
        label: 'Media Player',
        subtitle: 'Music & videos',
        icon: <FluentMediaPlayerIcon className="size-7 shrink-0" />,
        smallIcon: <FluentMediaPlayerIcon className="size-3.5 shrink-0" />,
        onSelect: () => {
          onClose();
          onNavigate('/media-player');
        },
      },
      {
        id: 'start-gallery',
        label: 'Gallery',
        subtitle: 'Media library',
        icon: useFluent3DForContent ? (
          <Fluent3DGalleryIcon className="size-7 shrink-0" />
        ) : (
          <FluentGalleryIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DGalleryIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentGalleryIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/gallery', { folderId: null });
        },
      },
      {
        id: 'start-draws',
        label: 'Ink Canvas',
        subtitle: 'Sketch & Draw',
        icon: (
          <FluentInkCanvasIcon
            className={`${useFluent3DForContent ? 'fluent-3d-icon ' : ''}size-7 shrink-0 text-[#111827] dark:text-white`}
          />
        ),
        smallIcon: (
          <FluentInkCanvasIcon
            className={`${useFluent3DForContent ? 'fluent-3d-icon ' : ''}size-3.5 shrink-0 text-[#111827] dark:text-white`}
          />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/draws');
        },
      },
      {
        id: 'start-notes',
        label: 'Notes',
        subtitle: 'Sparkle Notes',
        icon: useFluent3DForContent ? (
          <Fluent3DNotesIcon className="size-7 shrink-0" />
        ) : (
          <FluentNotesIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DNotesIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentNotesIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/notes');
        },
      },
      {
        id: 'start-screenbox',
        label: 'Screenbox',
        subtitle: 'Media player',
        icon: useFluent3DForContent ? (
          <Fluent3DScreenbugIcon className="size-7 shrink-0" />
        ) : (
          <FluentScreenbugIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DScreenbugIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentScreenbugIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/screenbox');
        },
      },
      {
        id: 'start-camera',
        label: 'Camera',
        subtitle: 'Capture photos',
        icon: useFluent3DForContent ? (
          <Fluent3DCameraIcon className="size-7 shrink-0" />
        ) : (
          <FluentCameraIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DCameraIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentCameraIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/camera');
        },
      },
      {
        id: 'start-craftmine',
        label: 'Craftmine',
        subtitle: 'Sandbox game',
        icon: useFluent3DForContent ? (
          <Fluent3DCraftmineIcon className="size-7 shrink-0" />
        ) : (
          <FluentCraftmineIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DCraftmineIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentCraftmineIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/craftmine');
        },
      },
      {
        id: 'start-photopea',
        label: 'Photopea',
        subtitle: 'Photo editor',
        icon: useFluent3DForContent ? (
          <Fluent3DPhotopeaIcon className="size-7 shrink-0" />
        ) : (
          <FluentPhotopeaIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DPhotopeaIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentPhotopeaIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/photopea');
        },
      },
      {
        id: 'start-winui3',
        label: 'WinUI 3',
        subtitle: 'Gallery & UI showcase',
        icon: (
          <img
            src={WINUI3_ICON_URL}
            alt=""
            aria-hidden="true"
            className="size-7 shrink-0 object-contain winui-sidebar-icon"
          />
        ),
        smallIcon: (
          <img
            src={WINUI3_ICON_URL}
            alt=""
            aria-hidden="true"
            className="size-3.5 shrink-0 object-contain winui-sidebar-icon"
          />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/winui-3');
        },
      },
      {
        id: 'start-settings',
        label: 'Settings',
        subtitle: 'System & preferences',
        icon: useFluent3DForSystem ? (
          <Fluent3DSettingsIcon className="size-7 shrink-0" />
        ) : (
          <FluentSettingsIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForSystem ? (
          <Fluent3DSettingsIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentSettingsIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/settings');
        },
      },
      {
        id: 'start-direct-command',
        label: 'Direct Cmd',
        subtitle: 'Quick command runner',
        icon: (
          <img
            src={DIRECT_COMMAND_ICON_URL}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-7 shrink-0 object-contain"
          />
        ),
        smallIcon: (
          <img
            src={DIRECT_COMMAND_ICON_URL}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-3.5 shrink-0 object-contain"
          />
        ),
        onSelect: () => {
          onClose();
          onOpenDirectCommand();
        },
      },
      {
        id: 'start-cmd',
        label: 'Terminal',
        subtitle: 'Command Prompt',
        icon: <Terminal className="size-6 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />,
        smallIcon: <Terminal className="size-3.5 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" />,
        onSelect: () => {
          onClose();
          onOpenCommandPrompt();
        },
      },
      {
        id: 'start-drivers',
        label: 'Drivers',
        subtitle: 'Manage Drivers',
        icon: <HardDrive className="size-6 shrink-0 text-[#111827] dark:text-white" />,
        smallIcon: <HardDrive className="size-3.5 shrink-0 text-[#111827] dark:text-white" />,
        onSelect: () => {
          onClose();
          onNavigate('/drivers');
        },
      },
      {
        id: 'start-updates',
        label: 'Updates',
        subtitle: 'Release notes',
        icon: useFluent3DForContent ? (
          <Fluent3DUpdatesIcon className="size-7 shrink-0" />
        ) : (
          <FluentUpdatesIcon className="size-7 shrink-0 text-[#111827] dark:text-white" />
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DUpdatesIcon className="size-3.5 shrink-0" />
        ) : (
          <FluentUpdatesIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />
        ),
        onSelect: () => {
          onClose();
          onNavigate('/updates');
        },
      },
      {
        id: 'start-feedback',
        label: 'Feedback',
        subtitle: 'Send feedback',
        icon: <FluentPersonFeedbackIcon className="size-6 shrink-0 text-[#111827] dark:text-white" />,
        smallIcon: <FluentPersonFeedbackIcon className="size-3.5 shrink-0 text-[#111827] dark:text-white" />,
        onSelect: () => {
          onClose();
          onNavigate('/feedback');
        },
      },
      {
        id: 'start-discord',
        label: 'Discord',
        subtitle: 'Sparkle Community',
        icon: useFluent3DForContent ? (
          <Fluent3DDiscordIcon className="size-7 shrink-0" />
        ) : (
          <svg
            className="size-6 shrink-0 fill-current text-[#5865F2]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        ),
        smallIcon: useFluent3DForContent ? (
          <Fluent3DDiscordIcon className="size-3.5 shrink-0" />
        ) : (
          <svg
            className="size-3.5 shrink-0 fill-current text-[#5865F2]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.078.078 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        ),
        onSelect: () => {
          onClose();
          window.open('https://discord.gg/wcdjaDDayK', '_blank', 'noopener,noreferrer');
        },
      },
    ];

    if (showWidgets) {
      items.splice(13, 0, {
        id: 'start-widgets',
        label: 'Widgets',
        subtitle: 'Live widgets board',
        icon: (
          <img
            src="/icons/widgets.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-6 shrink-0 object-contain"
          />
        ),
        smallIcon: (
          <img
            src="/icons/widgets.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-3.5 shrink-0 object-contain"
          />
        ),
        onSelect: () => {
          onClose();
          onOpenWidgets();
        },
      });
    }

    return items;
  }, [
    useFluent3DForContent,
    useFluent3DForSystem,
    showWidgets,
    onClose,
    onNavigate,
    onOpenDirectCommand,
    onOpenCommandPrompt,
    onOpenWidgets,
  ]);

  const appById = useMemo(() => {
    const map = new Map<string, StartAppItem>();
    pinnedApps.forEach((app) => map.set(app.id, app));
    return map;
  }, [pinnedApps]);

  const validAppIds = useMemo(() => pinnedApps.map((app) => app.id), [pinnedApps]);

  const [pinnedLayout, setPinnedLayout] = useState<StartPinnedEntry[]>(() => {
    try {
      const saved = localStorage.getItem(START_LAYOUT_STORAGE_KEY);
      if (saved) {
        return sanitizeLayout(JSON.parse(saved), validAppIds);
      }
    } catch {}
    return buildDefaultLayout(validAppIds);
  });

  // Sync pinned layout when available apps (e.g. showWidgets) change
  useEffect(() => {
    setPinnedLayout((prev) => sanitizeLayout(prev, validAppIds));
  }, [validAppIds]);

  const persistLayout = useCallback((nextLayout: StartPinnedEntry[]) => {
    setPinnedLayout(nextLayout);
    try {
      localStorage.setItem(START_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout));
    } catch {}
  }, []);

  const resetLayout = useCallback(() => {
    setOpenFolderId(null);
    persistLayout(buildDefaultLayout(validAppIds));
  }, [persistLayout, validAppIds]);

  const activeFolder = useMemo(
    () =>
      openFolderId
        ? pinnedLayout.find((entry): entry is Extract<StartPinnedEntry, { type: 'folder' }> =>
            entry.type === 'folder' && entry.id === openFolderId
          ) ?? null
        : null,
    [openFolderId, pinnedLayout]
  );

  useEffect(() => {
    if (openFolderId && !activeFolder) {
      setOpenFolderId(null);
    }
  }, [openFolderId, activeFolder]);

  useEffect(() => {
    if (activeFolder && focusFolderTitleOnOpen) {
      const timer = window.setTimeout(() => {
        folderTitleInputRef.current?.focus();
        folderTitleInputRef.current?.select();
        setFocusFolderTitleOnOpen(false);
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [activeFolder, focusFolderTitleOnOpen]);

  const allAppsSorted = useMemo(
    () => [...pinnedApps].sort((a, b) => a.label.localeCompare(b.label)),
    [pinnedApps]
  );

  const recommendedItems = useMemo(
    () => [
      {
        id: 'rec-vivetool',
        title: 'ViveTool GUI',
        subtitle: 'Windows Mode, Wallpaper & Flags',
        icon: <SlidersHorizontal className="size-4 text-[#0078d4] dark:text-[#4cc2ff]" />,
        onSelect: () => {
          onClose();
          onOpenViveToolGui();
        },
      },
      {
        id: 'rec-direct-command',
        title: 'Direct Command',
        subtitle: 'Run /vivetool & system commands',
        icon: (
          <img
            src={DIRECT_COMMAND_ICON_URL}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="size-4 object-contain"
          />
        ),
        onSelect: () => {
          onClose();
          onOpenDirectCommand();
        },
      },
      {
        id: 'rec-channels',
        title: 'TV Channels',
        subtitle: 'Browse VTV, HTV, VOV & streams',
        icon: <FluentWatchIcon className="size-4 text-[#111827] dark:text-white" />,
        onSelect: () => {
          onClose();
          onNavigate('/channels');
        },
      },
      {
        id: 'rec-sparkver',
        title: 'About Sparkle',
        subtitle: 'Version & evaluation info',
        icon: <Info className="size-4 text-[#0078d4] dark:text-[#4cc2ff]" />,
        onSelect: () => {
          onClose();
          onOpenAbout();
        },
      },
    ],
    [onClose, onOpenViveToolGui, onOpenDirectCommand, onNavigate, onOpenAbout]
  );

  // Move / folder manipulation helpers
  const moveEntryByStep = useCallback(
    (index: number, delta: number) => {
      const targetIndex = index + delta;
      if (index < 0 || targetIndex < 0 || targetIndex >= pinnedLayout.length) return;
      const next = [...pinnedLayout];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      persistLayout(next);
    },
    [pinnedLayout, persistLayout]
  );

  const removeAppFromFolder = useCallback(
    (folderId: string, appId: string) => {
      const folderIndex = pinnedLayout.findIndex(
        (item) => item.type === 'folder' && item.id === folderId
      );
      if (folderIndex === -1) return;
      const folder = pinnedLayout[folderIndex];
      if (folder.type !== 'folder') return;

      const remaining = folder.appIds.filter((id) => id !== appId);
      const next = [...pinnedLayout];

      if (remaining.length === 0) {
        next.splice(folderIndex, 1, { type: 'app', id: appId });
        setOpenFolderId(null);
      } else if (remaining.length === 1) {
        next.splice(folderIndex, 1, { type: 'app', id: remaining[0] }, { type: 'app', id: appId });
        setOpenFolderId(null);
      } else {
        next[folderIndex] = { ...folder, appIds: remaining };
        next.splice(folderIndex + 1, 0, { type: 'app', id: appId });
      }

      persistLayout(next);
    },
    [pinnedLayout, persistLayout]
  );

  const ungroupFolder = useCallback(
    (folderId: string) => {
      const folderIndex = pinnedLayout.findIndex(
        (item) => item.type === 'folder' && item.id === folderId
      );
      if (folderIndex === -1) return;
      const folder = pinnedLayout[folderIndex];
      if (folder.type !== 'folder') return;

      const next = [...pinnedLayout];
      next.splice(
        folderIndex,
        1,
        ...folder.appIds.map((id): StartPinnedEntry => ({ type: 'app', id }))
      );
      if (openFolderId === folderId) setOpenFolderId(null);
      persistLayout(next);
    },
    [pinnedLayout, openFolderId, persistLayout]
  );

  const renameFolder = useCallback(
    (folderId: string, newName: string) => {
      const next = pinnedLayout.map((item) =>
        item.type === 'folder' && item.id === folderId
          ? { ...item, name: newName }
          : item
      );
      persistLayout(next);
    },
    [pinnedLayout, persistLayout]
  );

  const handleTileDragStart = (
    e: React.DragEvent,
    entry: StartPinnedEntry
  ) => {
    setContextMenu(null);
    setDragState({
      sourceType: entry.type,
      entryId: entry.id,
      appId: entry.type === 'app' ? entry.id : undefined,
    });
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', entry.id);
    } catch {}
  };

  const handleTileDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    targetEntry: StartPinnedEntry,
    targetIndex: number
  ) => {
    if (!dragState || dragState.fromFolderId) return;
    if (dragState.entryId === targetEntry.id) {
      setDropTarget(null);
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);

    if (dragState.sourceType === 'app') {
      if (relX < 0.25) {
        setDropTarget({ index: targetIndex, mode: 'before' });
      } else if (relX > 0.75) {
        setDropTarget({ index: targetIndex, mode: 'after' });
      } else {
        setDropTarget({ index: targetIndex, mode: 'folder' });
      }
    } else {
      setDropTarget({ index: targetIndex, mode: relX < 0.5 ? 'before' : 'after' });
    }
  };

  const handleTileDrop = (
    e: React.DragEvent,
    targetEntry: StartPinnedEntry,
    targetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragState) {
      setDropTarget(null);
      return;
    }

    if (dragState.fromFolderId) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    const sourceIndex = pinnedLayout.findIndex((item) => item.id === dragState.entryId);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    const activeMode = dropTarget?.index === targetIndex ? dropTarget.mode : 'folder';
    const sourceEntry = pinnedLayout[sourceIndex];

    // Creating a folder or adding into an existing folder
    if (activeMode === 'folder' && sourceEntry.type === 'app') {
      if (targetEntry.type === 'app') {
        const newFolder: StartPinnedEntry = {
          type: 'folder',
          id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: 'Folder',
          appIds: [targetEntry.id, sourceEntry.id],
        };
        const next = pinnedLayout
          .map((item, idx) => (idx === targetIndex ? newFolder : item))
          .filter((_, idx) => idx !== sourceIndex);
        persistLayout(next);
      } else if (targetEntry.type === 'folder') {
        const updatedFolder: StartPinnedEntry = {
          ...targetEntry,
          appIds: targetEntry.appIds.includes(sourceEntry.id)
            ? targetEntry.appIds
            : [...targetEntry.appIds, sourceEntry.id],
        };
        const next = pinnedLayout
          .map((item, idx) => (idx === targetIndex ? updatedFolder : item))
          .filter((_, idx) => idx !== sourceIndex);
        persistLayout(next);
      }
      setDragState(null);
      setDropTarget(null);
      return;
    }

    // Rearranging item position
    const next = [...pinnedLayout];
    const [moved] = next.splice(sourceIndex, 1);
    let insertAt = activeMode === 'after' ? targetIndex + 1 : targetIndex;
    if (sourceIndex < insertAt) insertAt -= 1;
    insertAt = Math.max(0, Math.min(next.length, insertAt));
    next.splice(insertAt, 0, moved);
    persistLayout(next);

    setDragState(null);
    setDropTarget(null);
  };

  const handleFolderAppDragStart = (
    e: React.DragEvent,
    folderId: string,
    appId: string
  ) => {
    setContextMenu(null);
    setDragState({
      sourceType: 'app',
      entryId: appId,
      appId,
      fromFolderId: folderId,
    });
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', appId);
    } catch {}
  };

  const handleFolderAppDrop = (
    e: React.DragEvent,
    folderId: string,
    targetAppIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragState?.appId || dragState.fromFolderId !== folderId) {
      setFolderAppDropIndex(null);
      return;
    }

    const folder = pinnedLayout.find(
      (item): item is Extract<StartPinnedEntry, { type: 'folder' }> =>
        item.type === 'folder' && item.id === folderId
    );
    if (!folder) return;

    const fromIdx = folder.appIds.indexOf(dragState.appId);
    if (fromIdx === -1 || fromIdx === targetAppIndex) {
      setDragState(null);
      setFolderAppDropIndex(null);
      return;
    }

    const updatedAppIds = [...folder.appIds];
    const [moved] = updatedAppIds.splice(fromIdx, 1);
    updatedAppIds.splice(targetAppIndex, 0, moved);

    const next = pinnedLayout.map((item) =>
      item.type === 'folder' && item.id === folderId
        ? { ...item, appIds: updatedAppIds }
        : item
    );
    persistLayout(next);
    setDragState(null);
    setFolderAppDropIndex(null);
  };

  // Context menu helpers
  const openContextMenuAt = (
    e: React.MouseEvent,
    stateWithoutCoords:
      | { scope: 'background' }
      | { scope: 'app'; appId: string; index: number; folderId?: string }
      | { scope: 'folder'; folderId: string; index: number }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const point = toAppPortalCoordinates(e.clientX, e.clientY);
    setContextMenu({ ...stateWithoutCoords, x: point.x, y: point.y });
  };

  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const { width, height } = contextMenuRef.current.getBoundingClientRect();
    setContextMenuPos({
      left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - width - 8)),
      top: Math.max(8, contextMenu.y > window.innerHeight - height - 8 ? contextMenu.y - height : contextMenu.y),
    });
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', closeOnOutside);
      document.addEventListener('contextmenu', closeOnOutside);
    }, 30);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('contextmenu', closeOnOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!isOpen) {
      setShowAllApps(false);
      setIsPowerMenuOpen(false);
      setOpenFolderId(null);
      setDragState(null);
      setDropTarget(null);
      setContextMenu(null);
      return;
    }

    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = window.requestAnimationFrame(() => {
      searchBtnRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (contextMenu) {
          setContextMenu(null);
        } else if (openFolderId) {
          setOpenFolderId(null);
        } else if (isPowerMenuOpen) {
          setIsPowerMenuOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement.current?.isConnected) {
        previouslyFocusedElement.current.focus({ preventScroll: true });
      }
    };
  }, [isOpen, isPowerMenuOpen, openFolderId, contextMenu, onClose]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements?.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const entries: Array<{
      id: string;
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
    }> = [];

    if (contextMenu.scope === 'app') {
      const app = appById.get(contextMenu.appId);
      if (app) {
        entries.push({
          id: 'ctx-open',
          label: `Open ${app.label}`,
          icon: app.smallIcon,
          onClick: () => {
            setContextMenu(null);
            app.onSelect();
          },
        });
      }
      if (contextMenu.folderId) {
        entries.push({
          id: 'ctx-remove-folder',
          label: 'Remove from folder',
          icon: <FolderMinus className="size-4 shrink-0" />,
          onClick: () => {
            removeAppFromFolder(contextMenu.folderId!, contextMenu.appId);
            setContextMenu(null);
          },
        });
      } else {
        if (contextMenu.index > 0) {
          entries.push({
            id: 'ctx-move-left',
            label: 'Move left',
            icon: <ArrowLeft className="size-4 shrink-0" />,
            onClick: () => {
              moveEntryByStep(contextMenu.index, -1);
              setContextMenu(null);
            },
          });
        }
        if (contextMenu.index < pinnedLayout.length - 1) {
          entries.push({
            id: 'ctx-move-right',
            label: 'Move right',
            icon: <ArrowRight className="size-4 shrink-0" />,
            onClick: () => {
              moveEntryByStep(contextMenu.index, 1);
              setContextMenu(null);
            },
          });
        }
      }
    } else if (contextMenu.scope === 'folder') {
      entries.push({
        id: 'ctx-open-folder',
        label: 'Open folder',
        icon: <FolderOpen className="size-4 shrink-0" />,
        onClick: () => {
          setOpenFolderId(contextMenu.folderId);
          setContextMenu(null);
        },
      });
      entries.push({
        id: 'ctx-rename-folder',
        label: 'Rename folder',
        icon: <Pencil className="size-4 shrink-0" />,
        onClick: () => {
          setFocusFolderTitleOnOpen(true);
          setOpenFolderId(contextMenu.folderId);
          setContextMenu(null);
        },
      });
      entries.push({
        id: 'ctx-ungroup-folder',
        label: 'Ungroup folder',
        icon: <FolderMinus className="size-4 shrink-0" />,
        onClick: () => {
          ungroupFolder(contextMenu.folderId);
          setContextMenu(null);
        },
      });
      if (contextMenu.index > 0) {
        entries.push({
          id: 'ctx-folder-left',
          label: 'Move left',
          icon: <ArrowLeft className="size-4 shrink-0" />,
          onClick: () => {
            moveEntryByStep(contextMenu.index, -1);
            setContextMenu(null);
          },
        });
      }
      if (contextMenu.index < pinnedLayout.length - 1) {
        entries.push({
          id: 'ctx-folder-right',
          label: 'Move right',
          icon: <ArrowRight className="size-4 shrink-0" />,
          onClick: () => {
            moveEntryByStep(contextMenu.index, 1);
            setContextMenu(null);
          },
        });
      }
    }

    entries.push({
      id: 'ctx-toggle-all-apps',
      label: showAllApps ? 'Show Pinned apps' : 'Show All apps',
      icon: <FolderPlus className="size-4 shrink-0" />,
      onClick: () => {
        setShowAllApps((prev) => !prev);
        setOpenFolderId(null);
        setContextMenu(null);
      },
    });
    entries.push({
      id: 'ctx-reset-layout',
      label: 'Reset Start layout',
      icon: <RotateCcw className="size-4 shrink-0" />,
      onClick: () => {
        resetLayout();
        setContextMenu(null);
      },
    });
    entries.push({
      id: 'ctx-start-settings',
      label: 'Start settings',
      icon: <FluentSettingsIcon className="size-4 shrink-0" />,
      onClick: () => {
        setContextMenu(null);
        onClose();
        onNavigate('/settings');
      },
    });

    return (
      <div
        ref={contextMenuRef}
        role="menu"
        aria-label="Start menu actions"
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          ...flyoutPanelStyle,
          left: contextMenuPos.left,
          top: contextMenuPos.top,
        }}
        className={`fixed z-[2147483647] w-[224px] ${flyoutPanelClassName} fluent-context-menu`}
      >
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              entry.onClick();
            }}
            className="w-full h-[34px] px-3 rounded-[6px] flex items-center gap-2.5 text-[12.5px] font-medium text-left text-[#111827] dark:text-white outline-none transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
          >
            {entry.icon}
            <span className="truncate">{entry.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="start-menu-backdrop"
          data-search-experience="true"
          data-start-menu="true"
          className="fixed inset-0 z-[2147483647] bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div
            className={`pointer-events-none fixed inset-x-0 flex justify-center overflow-hidden px-3 ${
              isTopBarBottom
                ? 'top-0 bottom-[44px] items-end pb-[10px]'
                : 'top-[44px] bottom-0 items-start pt-[10px]'
            }`}
          >
            <motion.section
              ref={dialogRef}
              id="sparkle-start-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="start-menu-title"
              onKeyDown={handleDialogKeyDown}
              onContextMenu={(e) => openContextMenuAt(e, { scope: 'background' })}
              initial={
                shouldReduceMotion
                  ? { y: 0 }
                  : { y: isTopBarBottom ? 'calc(100% + 24px)' : 'calc(-100% - 24px)' }
              }
              animate={{ y: 0 }}
              exit={
                shouldReduceMotion
                  ? { y: 0 }
                  : { y: isTopBarBottom ? 'calc(100% + 24px)' : 'calc(-100% - 24px)' }
              }
              transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative flex w-[min(600px,calc(100vw-24px))] max-h-[min(640px,calc(100dvh-72px))] flex-col overflow-hidden rounded-[14px] border border-black/[0.08] bg-[#eef3f9]/88 text-[#111827] shadow-[0_24px_64px_rgba(0,0,0,0.24)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#23272d]/90 dark:text-white dark:shadow-[0_24px_64px_rgba(0,0,0,0.68)]"
            >
              <h2 id="start-menu-title" className="sr-only">
                Start menu
              </h2>

              {/* Top Search Pill inside Start Menu */}
              <div className="px-5 pt-5 pb-3 shrink-0">
                <button
                  ref={searchBtnRef}
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSearch();
                  }}
                  className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-full border border-black/[0.08] bg-white/90 px-4 text-left text-[13px] text-[#5f6368] shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:border-white/[0.1] dark:bg-[#191c21]/90 dark:text-white/65 dark:hover:bg-[#191c21] dark:focus-visible:ring-[#4cc2ff]"
                >
                  <Search className="size-4 shrink-0 text-[#0078d4] dark:text-[#4cc2ff]" aria-hidden="true" />
                  <span className="truncate">Search for apps, channels, news, and settings</span>
                </button>
              </div>

              {/* Scrollable Pinned / All Apps + Recommended Content */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sidebar-scroller">
                {showAllApps ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#111827] dark:text-white/95">
                        All apps
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllApps(false)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-black/[0.08] bg-white/75 px-2.5 py-1 text-[11.5px] font-medium text-[#111827] transition-colors hover:bg-white dark:border-white/[0.1] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
                      >
                        <ChevronLeft className="size-3.5" aria-hidden="true" />
                        <span>Back</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {allAppsSorted.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={app.onSelect}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:hover:bg-white/[0.08] dark:focus-visible:ring-[#4cc2ff]"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center">
                            {app.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium text-[#111827] dark:text-white/95">
                              {app.label}
                            </span>
                            <span className="block truncate text-[11px] text-[#5f6368] dark:text-white/55">
                              {app.subtitle}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Pinned Grid (Supports Drag & Drop Reorder + Folder Creation) */}
                    <div>
                      <div className="mb-2.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#111827] dark:text-white/95">
                            Pinned
                          </span>
                          <span className="hidden sm:inline text-[10.5px] text-[#5f6368] dark:text-white/45">
                            Drag to reorder or drop onto another icon to create a folder
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAllApps(true)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-black/[0.08] bg-white/75 px-2.5 py-1 text-[11.5px] font-medium text-[#111827] transition-colors hover:bg-white dark:border-white/[0.1] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]"
                        >
                          <span>All apps</span>
                          <ChevronRight className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                        {pinnedLayout.map((entry, index) => {
                          const isBeingDragged = dragState?.entryId === entry.id;
                          const isDropBefore = dropTarget?.index === index && dropTarget.mode === 'before';
                          const isDropAfter = dropTarget?.index === index && dropTarget.mode === 'after';
                          const isDropFolder = dropTarget?.index === index && dropTarget.mode === 'folder';

                          if (entry.type === 'folder') {
                            const folderPreviewApps = entry.appIds
                              .slice(0, 4)
                              .map((id) => appById.get(id))
                              .filter((item): item is StartAppItem => Boolean(item));

                            return (
                              <div
                                key={entry.id}
                                draggable
                                onDragStart={(e) => handleTileDragStart(e, entry)}
                                onDragOver={(e) => handleTileDragOver(e, entry, index)}
                                onDragLeave={() => {
                                  if (dropTarget?.index === index) setDropTarget(null);
                                }}
                                onDrop={(e) => handleTileDrop(e, entry, index)}
                                onDragEnd={() => {
                                  setDragState(null);
                                  setDropTarget(null);
                                }}
                                onContextMenu={(e) =>
                                  openContextMenuAt(e, {
                                    scope: 'folder',
                                    folderId: entry.id,
                                    index,
                                  })
                                }
                                className="relative"
                              >
                                {isDropBefore && (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-2 bottom-2 left-0 z-20 w-[3px] rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                                  />
                                )}
                                {isDropAfter && (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-2 bottom-2 right-0 z-20 w-[3px] rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => setOpenFolderId(entry.id)}
                                  className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[8px] px-1.5 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                                    isBeingDragged ? 'opacity-45 scale-95' : ''
                                  } ${
                                    isDropFolder
                                      ? 'scale-[1.04] bg-[#0078d4]/15 ring-2 ring-[#0078d4] dark:bg-[#4cc2ff]/15 dark:ring-[#4cc2ff]'
                                      : 'hover:bg-black/[0.05] active:scale-[0.97] dark:hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <span className="grid size-9 grid-cols-2 grid-rows-2 place-items-center gap-0.5 rounded-[8px] border border-black/[0.08] bg-black/[0.05] p-1 dark:border-white/[0.12] dark:bg-white/[0.08]">
                                    {folderPreviewApps.map((subApp) => (
                                      <span key={subApp.id} className="flex items-center justify-center">
                                        {subApp.smallIcon}
                                      </span>
                                    ))}
                                  </span>
                                  <span className="w-full truncate text-[11px] font-medium leading-tight text-[#111827] dark:text-white/90">
                                    {entry.name}
                                  </span>
                                </button>
                              </div>
                            );
                          }

                          const app = appById.get(entry.id);
                          if (!app) return null;

                          return (
                            <div
                              key={app.id}
                              draggable
                              onDragStart={(e) => handleTileDragStart(e, entry)}
                              onDragOver={(e) => handleTileDragOver(e, entry, index)}
                              onDragLeave={() => {
                                if (dropTarget?.index === index) setDropTarget(null);
                              }}
                              onDrop={(e) => handleTileDrop(e, entry, index)}
                              onDragEnd={() => {
                                setDragState(null);
                                setDropTarget(null);
                              }}
                              onContextMenu={(e) =>
                                openContextMenuAt(e, {
                                  scope: 'app',
                                  appId: app.id,
                                  index,
                                })
                              }
                              className="relative"
                            >
                              {isDropBefore && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-2 bottom-2 left-0 z-20 w-[3px] rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                                />
                              )}
                              {isDropAfter && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-2 bottom-2 right-0 z-20 w-[3px] rounded-full bg-[#0078d4] dark:bg-[#4cc2ff]"
                                />
                              )}
                              <button
                                type="button"
                                onClick={app.onSelect}
                                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[8px] px-1.5 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:focus-visible:ring-[#4cc2ff] ${
                                  isBeingDragged ? 'opacity-45 scale-95' : ''
                                } ${
                                  isDropFolder
                                    ? 'scale-[1.04] bg-[#0078d4]/15 ring-2 ring-[#0078d4] dark:bg-[#4cc2ff]/15 dark:ring-[#4cc2ff]'
                                    : 'hover:bg-black/[0.05] active:scale-[0.97] dark:hover:bg-white/[0.08]'
                                }`}
                              >
                                <span className="flex size-8 items-center justify-center">
                                  {app.icon}
                                </span>
                                <span className="w-full truncate text-[11px] font-medium leading-tight text-[#111827] dark:text-white/90">
                                  {app.label}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recommended Section */}
                    <div>
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[13px] font-semibold text-[#111827] dark:text-white/95">
                          Recommended
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {recommendedItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={item.onSelect}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] dark:hover:bg-white/[0.08] dark:focus-visible:ring-[#4cc2ff]"
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-black/[0.05] dark:bg-white/[0.08]">
                              {item.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-medium text-[#111827] dark:text-white/95">
                                {item.title}
                              </span>
                              <span className="block truncate text-[11px] text-[#5f6368] dark:text-white/55">
                                {item.subtitle}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Start Folder Popover Overlay */}
              <AnimatePresence>
                {activeFolder && (
                  <motion.div
                    key={`folder-overlay-${activeFolder.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) setOpenFolderId(null);
                    }}
                    onDragOver={(e) => {
                      if (dragState?.fromFolderId === activeFolder.id) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={(e) => {
                      if (dragState?.fromFolderId === activeFolder.id && dragState.appId && e.target === e.currentTarget) {
                        e.preventDefault();
                        removeAppFromFolder(activeFolder.id, dragState.appId);
                        setDragState(null);
                      }
                    }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 p-5 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-[390px] rounded-[14px] border border-black/[0.1] bg-[#eef3f9]/95 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/[0.14] dark:bg-[#23272d]/95"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <input
                          ref={folderTitleInputRef}
                          type="text"
                          value={activeFolder.name}
                          onChange={(e) => renameFolder(activeFolder.id, e.target.value)}
                          onBlur={(e) => {
                            if (!e.target.value.trim()) renameFolder(activeFolder.id, 'Folder');
                          }}
                          aria-label="Folder name"
                          className="min-w-0 flex-1 rounded-[8px] border border-transparent bg-black/[0.04] px-3 py-1.5 text-[14px] font-semibold text-[#111827] outline-none transition-colors focus:border-[#0078d4] focus:bg-white dark:bg-white/[0.07] dark:text-white dark:focus:border-[#4cc2ff] dark:focus:bg-[#191c21]"
                        />
                        <button
                          type="button"
                          onClick={() => ungroupFolder(activeFolder.id)}
                          aria-label="Ungroup folder"
                          className="rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-medium text-[#5f6368] transition-colors hover:bg-black/[0.06] hover:text-[#111827] dark:text-white/70 dark:hover:bg-white/[0.1] dark:hover:text-white"
                        >
                          Ungroup
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {activeFolder.appIds.map((appId, idx) => {
                          const app = appById.get(appId);
                          if (!app) return null;
                          return (
                            <div
                              key={app.id}
                              draggable
                              onDragStart={(e) => handleFolderAppDragStart(e, activeFolder.id, app.id)}
                              onDragOver={(e) => {
                                if (dragState?.fromFolderId !== activeFolder.id) return;
                                e.preventDefault();
                                setFolderAppDropIndex(idx);
                              }}
                              onDragLeave={() => {
                                if (folderAppDropIndex === idx) setFolderAppDropIndex(null);
                              }}
                              onDrop={(e) => handleFolderAppDrop(e, activeFolder.id, idx)}
                              onDragEnd={() => {
                                setDragState(null);
                                setFolderAppDropIndex(null);
                              }}
                              onContextMenu={(e) =>
                                openContextMenuAt(e, {
                                  scope: 'app',
                                  appId: app.id,
                                  index: idx,
                                  folderId: activeFolder.id,
                                })
                              }
                              className={`relative rounded-[8px] ${
                                folderAppDropIndex === idx
                                  ? 'ring-2 ring-[#0078d4] dark:ring-[#4cc2ff]'
                                  : ''
                              }`}
                            >
                              <button
                                type="button"
                                onClick={app.onSelect}
                                className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[8px] px-1.5 py-2.5 text-center transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.09]"
                              >
                                <span className="flex size-8 items-center justify-center">
                                  {app.icon}
                                </span>
                                <span className="w-full truncate text-[11px] font-medium leading-tight text-[#111827] dark:text-white/90">
                                  {app.label}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <p className="mt-3 text-center text-[10.5px] text-[#5f6368] dark:text-white/50">
                        Drag an icon outside or right-click to remove from folder
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Start Menu Footer */}
              <div className="relative flex h-[54px] shrink-0 items-center justify-between border-t border-black/[0.08] bg-black/[0.03] px-5 dark:border-white/[0.08] dark:bg-black/20">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('/auth');
                  }}
                  className="inline-flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-[12.5px] font-medium text-[#111827] transition-colors hover:bg-black/[0.06] dark:text-white/90 dark:hover:bg-white/[0.08]"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#0078d4]/15 text-[#0078d4] dark:bg-[#4cc2ff]/20 dark:text-[#4cc2ff]">
                    <User className="size-4" aria-hidden="true" />
                  </span>
                  <span>Sparkle Account</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Open Settings"
                    onClick={() => {
                      onClose();
                      onNavigate('/settings');
                    }}
                    className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[8px] text-[#374151] transition-colors hover:bg-black/[0.06] hover:text-[#111827] dark:text-white/80 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  >
                    <FluentSettingsIcon className="size-[18px]" />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Power options"
                      aria-expanded={isPowerMenuOpen}
                      onClick={() => setIsPowerMenuOpen((prev) => !prev)}
                      className={`inline-flex size-9 cursor-pointer items-center justify-center rounded-[8px] transition-colors ${
                        isPowerMenuOpen
                          ? 'bg-black/[0.08] text-[#111827] dark:bg-white/[0.12] dark:text-white'
                          : 'text-[#374151] hover:bg-black/[0.06] hover:text-[#111827] dark:text-white/80 dark:hover:bg-white/[0.08] dark:hover:text-white'
                      }`}
                    >
                      <Power className="size-4" aria-hidden="true" />
                    </button>

                    {isPowerMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 bottom-11 z-20 min-w-[180px] rounded-[10px] border border-black/[0.08] bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/[0.12] dark:bg-[#23272d]/95"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onClose();
                            window.location.reload();
                          }}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12px] text-[#111827] hover:bg-black/[0.06] dark:text-white dark:hover:bg-white/[0.08]"
                        >
                          <RefreshCw className="size-3.5 text-[#0078d4] dark:text-[#4cc2ff]" aria-hidden="true" />
                          <span>Restart Sparkle</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onClose();
                            onOpenSetupWizard();
                          }}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12px] text-[#111827] hover:bg-black/[0.06] dark:text-white dark:hover:bg-white/[0.08]"
                        >
                          <Sparkles className="size-3.5 text-[#0078d4] dark:text-[#4cc2ff]" aria-hidden="true" />
                          <span>Setup Wizard</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          </div>
          {renderContextMenu()}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  const portalTarget = getAppPortalTarget();
  return portalTarget ? createPortal(panel, portalTarget) : null;
};
