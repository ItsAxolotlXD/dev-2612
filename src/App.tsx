import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AppTabsBar, type AppTab } from './components/AppTabsBar';
import { BottomDock } from './components/BottomDock';
import { SpotlightModal } from './components/SpotlightModal';
import { CustomStreamModal } from './components/CustomStreamModal';
import { WelcomeModal } from './components/WelcomeModal';
import { UnderConstructionModal } from './components/UnderConstructionModal';
import { UnsavedSettingsModal } from './components/UnsavedSettingsModal';
import { UnsavedNoteModal } from './components/UnsavedNoteModal';
import { HelpModal } from './components/HelpModal';
import { NewsSummaryModal } from './components/NewsSummaryModal';
import { FindWordsBar } from './components/FindWordsBar';
import { AddStreamModal } from './components/AddStreamModal';
import { TextToSpeechPlayer } from './components/TextToSpeechPlayer';
import { SplashScreen } from './components/SplashScreen';
import { SPINNING_RING_GIF_LOOP_DURATION_MS } from './components/SpinningRing';
import { AnimatedBootScreen } from './components/AnimatedBootScreen';
import { SparkleSetupWizard } from './components/SparkleSetupWizard';
import { SparkleDriverModal } from './components/SparkleDriverModal';
import { useDrivers } from './hooks/useDrivers';
import { DriverManagementPanel } from './components/DriverManagementPanel';
import { NativeKeyboard } from './components/NativeKeyboard';
import { NativeKeyboardProvider } from './context/NativeKeyboardContext';
import { NotesProvider } from './context/NotesContext';
import { StickyNoteWidget } from './components/StickyNoteWidget';
import { TabLoadingScreen } from './components/TabLoadingScreen';
import { AppScrollbar } from './components/AppScrollbar';
import { AppNativeCursor } from './components/AppNativeCursor';
import { SparkverAboutWindow } from './components/SparkverAboutWindow';
import { CommandPromptWindow } from './components/CommandPromptWindow';
import { GlobalToast } from './components/GlobalToast';
import { EvaluationWatermark } from './components/EvaluationWatermark';
import { showAppToast } from './utils/toast';
import { HomePreview } from './pages/HomePreview';
import { About } from './pages/About';
import { LiveTV } from './pages/LiveTV';
import { WatchPreview } from './pages/WatchPreview';
import { TestChannels } from './pages/TestChannels';
import { News } from './pages/News';
import { Article } from './pages/Article';
import { Channels } from './pages/Channels';
import { Favorites } from './pages/Favorites';
import { Settings } from './pages/Settings';
import { ImmersiveSearch } from './pages/ImmersiveSearch';
import { NotesApp, UnsavedNoteHandler } from './pages/NotesApp';
import { Craftmine } from './pages/Craftmine';
import { Photopea } from './pages/Photopea';
import { Updates } from './pages/Updates';
import { Gallery } from './pages/Gallery';
import { Draws } from './pages/Draws';
import { VLC } from './pages/VLC';
import { Camera } from './pages/Camera';
import { Auth } from './pages/Auth';
import { Feedback } from './pages/Feedback';
import { WinUI3 } from './pages/WinUI3';
import { CommandPrompt } from './pages/CommandPrompt';
import { CHANNELS_DATA } from './data/channels';
import { NEWS_DATA } from './data/news';
import { Channel, NewsArticle } from './types';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const { settings, draftSettings, hasChanges, applyDraftSettings, discardDraftSettings } = useSettings();
  const { isResolutionInstalled, isVisualInstalled } = useDrivers();
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // Tooltip & navigation block for unsaved settings
  const [showUnsavedTooltip, setShowUnsavedTooltip] = useState(false);
  const unsavedTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUnsavedTooltip = useCallback(() => {
    setShowUnsavedTooltip(true);
    if (unsavedTooltipTimerRef.current) clearTimeout(unsavedTooltipTimerRef.current);
    unsavedTooltipTimerRef.current = setTimeout(() => {
      setShowUnsavedTooltip(false);
    }, 4500);
  }, []);

  // When changes are saved or cleared, hide tooltip
  useEffect(() => {
    if (!hasChanges) {
      setShowUnsavedTooltip(false);
    }
  }, [hasChanges]);

  useEffect(() => {
    return () => {
      if (unsavedTooltipTimerRef.current) clearTimeout(unsavedTooltipTimerRef.current);
    };
  }, []);

  // Navigation Route State (supports browser pathname or internal state)
  const getInitialAppRoute = () => {
    const pathname = window.location.pathname;
    const route = pathname === '/' || pathname === '/drivers' || pathname === '/command-prompt' ? '/' : pathname;
    return `${route}${pathname === '/drivers' || pathname === '/command-prompt' ? '' : window.location.search}`;
  };
  const [currentRoute, setCurrentRouteState] = useState<string>(() => getInitialAppRoute().split(/[?#]/)[0] || '/');
  const [appTabs, setAppTabs] = useState<AppTab[]>(() => [{ id: 1, route: getInitialAppRoute() }]);
  const [activeAppTabId, setActiveAppTabId] = useState(1);
  const nextAppTabIdRef = useRef(2);
  const [isDriverManagementPanelOpen, setIsDriverManagementPanelOpen] = useState(
    () => window.location.pathname === '/drivers'
  );
  const closeDriverManagementPanel = useCallback(() => {
    setIsDriverManagementPanelOpen(false);
  }, []);
  const [routeState, setRouteState] = useState<any>(null);

  useEffect(() => {
    if (window.location.pathname === '/drivers' || window.location.pathname === '/command-prompt') {
      window.history.replaceState(null, '', '/');
    }
  }, []);
  const previousRouteRef = useRef<string>('/');
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabLoadCount, setTabLoadCount] = useState(0);
  const tabLoadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (tabLoadingTimerRef.current) clearTimeout(tabLoadingTimerRef.current);
    };
  }, []);



  // Keep search state independent for each browser-like app tab.
  const [tabSearchQueries, setTabSearchQueries] = useState<Record<string, string>>({});
  const currentTabSearchQuery = tabSearchQueries[String(activeAppTabId)] || '';
  const handleTabSearchChange = useCallback((query: string) => {
    setTabSearchQueries((prev) => ({
      ...prev,
      [String(activeAppTabId)]: query
    }));
  }, [activeAppTabId]);

  // Channels State (base channels + imported channels from localStorage)
  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = localStorage.getItem('waves_custom_channels');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...CHANNELS_DATA, ...parsed];
      } catch {
        return CHANNELS_DATA;
      }
    }
    return CHANNELS_DATA;
  });

  // Current Active Channel for Live TV Player
  const [currentChannel, setCurrentChannel] = useState<Channel>(() => {
    // Check if URL has ?channel=slug
    const urlParams = new URLSearchParams(window.location.search);
    const channelSlug = urlParams.get('channel');
    if (channelSlug) {
      const matched = CHANNELS_DATA.find((c) => c.slug === channelSlug);
      if (matched) return matched;
    }
    try {
      const savedRecentId = localStorage.getItem('vplay_recent_channel_id');
      if (savedRecentId) {
        const found = CHANNELS_DATA.find((c) => c.id === savedRecentId);
        if (found) return found;
      }
    } catch {}
    return CHANNELS_DATA[0];
  });

  // Track recent channel in localStorage
  useEffect(() => {
    if (currentChannel?.id) {
      try {
        localStorage.setItem('vplay_recent_channel_id', currentChannel.id);
      } catch {}
    }
  }, [currentChannel]);

  // Sparkle Setup Wizard (Windows 11 Setup OOBE - first launch or triggered via Settings)
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('setup') === 'true' || urlParams.get('oobe') === 'true') {
        return true;
      }
      const completed = localStorage.getItem('sparkle_setup_wizard_completed');
      return completed !== 'true';
    } catch {
      return false;
    }
  });

  // Global listener to launch Setup Wizard from Settings or developer console
  useEffect(() => {
    const handleLaunchSetup = () => {
      setIsSetupWizardOpen(true);
    };
    window.addEventListener('launch-sparkle-setup', handleLaunchSetup);
    (window as any).launchSparkleSetup = handleLaunchSetup;
    (window as any).launchSparkleSetupWizard = handleLaunchSetup;

    return () => {
      window.removeEventListener('launch-sparkle-setup', handleLaunchSetup);
      delete (window as any).launchSparkleSetup;
      delete (window as any).launchSparkleSetupWizard;
    };
  }, []);

  const handleFinishSetupWizard = useCallback(() => {
    setIsSetupWizardOpen(false);
    setIsBootVideoFinished(true);
    setIsSplashFinished(true);
    setIsDriverModalOpen(true);
  }, []);

  // Modals state
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isBootVideoFinished, setIsBootVideoFinished] = useState(() => !settings.animatedBootScreen);
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  // Sync missing resolution driver state to document element for 4:3 stretched modal dialogs
  useEffect(() => {
    document.documentElement.classList.toggle('missing-resolution-driver', !isResolutionInstalled);
  }, [isResolutionInstalled]);

  // Check drivers on startup (if missing drivers, show SparkleDriverModal)
  const hasCheckedDriverStartupRef = useRef(false);
  useEffect(() => {
    if (isSplashFinished && !isSetupWizardOpen && !hasCheckedDriverStartupRef.current) {
      hasCheckedDriverStartupRef.current = true;
      if (!isResolutionInstalled || !isVisualInstalled) {
        setIsDriverModalOpen(true);
      }
    }
  }, [isSplashFinished, isSetupWizardOpen, isResolutionInstalled, isVisualInstalled]);
  const [isUnderConstructionOpen, setIsUnderConstructionOpen] = useState(false);
  const [isSparkverAboutOpen, setIsSparkverAboutOpen] = useState(false);
  const handleOpenSparkverAbout = useCallback(() => setIsSparkverAboutOpen(true), []);
  const handleCloseSparkverAbout = useCallback(() => setIsSparkverAboutOpen(false), []);
  const [isCommandPromptOpen, setIsCommandPromptOpen] = useState(() => window.location.pathname === '/command-prompt');
  const handleOpenCommandPrompt = useCallback(() => setIsCommandPromptOpen(true), []);
  const handleCloseCommandPrompt = useCallback(() => setIsCommandPromptOpen(false), []);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isCustomStreamModalOpen, setIsCustomStreamModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isNewsSummaryOpen, setIsNewsSummaryOpen] = useState(false);
  const [summarizeArticle, setSummarizeArticle] = useState<NewsArticle>(NEWS_DATA[0]);
  const [isTtsOpen, setIsTtsOpen] = useState(false);
  const [ttsArticle, setTtsArticle] = useState<NewsArticle>(NEWS_DATA[0]);
  const [isFindWordsOpen, setIsFindWordsOpen] = useState(false);
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const handleOpenOfficeTool = (tool: string) => {
    if (tool === 'notes' || tool === 'write' || tool === 'present' || tool === 'table') {
      navigate('/notes');
    } else {
      navigate(`/${tool}`);
    }
  };
  const [articleFontSize, setArticleFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vplay_font_size');
      return saved ? parseInt(saved, 10) : 16;
    } catch {
      return 16;
    }
  });

  const handleFontSizeChange = (size: number) => {
    setArticleFontSize(size);
    try {
      localStorage.setItem('vplay_font_size', String(size));
    } catch {}
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInkCanvasChromeVisible, setIsInkCanvasChromeVisible] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('waves_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('waves_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [mobileDragOffset, setMobileDragOffset] = useState<number | null>(null);

  // Edge swipe gesture: vuốt từ cạnh trái sang đ�� mở sidebar - follow finger trong thời gian thực
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isTrackingEdgeSwipe = false;
    let isSwipingHorizontally = false;
    let lastX = 0;
    let lastTime = 0;
    let velocityX = 0;

    const getDrawerWidth = () => {
      return typeof window !== 'undefined' ? Math.min(285, window.innerWidth * 0.85) : 285;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Swipe originates from within 45px of the left screen edge on mobile/tablet
      if (touch.clientX <= 45 && window.innerWidth < 768) {
        startX = touch.clientX;
        startY = touch.clientY;
        lastX = touch.clientX;
        lastTime = Date.now();
        velocityX = 0;
        isTrackingEdgeSwipe = true;
        isSwipingHorizontally = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingEdgeSwipe) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      const now = Date.now();
      const dt = Math.max(1, now - lastTime);
      velocityX = (touch.clientX - lastX) / dt;
      lastX = touch.clientX;
      lastTime = now;

      // Determine intent: if moving horizontally to the right
      if (!isSwipingHorizontally) {
        if (deltaX > 8) {
          if (Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
            isSwipingHorizontally = true;
          } else {
            isTrackingEdgeSwipe = false;
            return;
          }
        } else if (deltaX < -5 || Math.abs(deltaY) > 20) {
          isTrackingEdgeSwipe = false;
          return;
        }
      }

      if (isSwipingHorizontally) {
        if (e.cancelable) e.preventDefault();
        const drawerWidth = getDrawerWidth();
        const currentX = Math.min(drawerWidth, Math.max(0, touch.clientX));
        setMobileDragOffset(currentX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTrackingEdgeSwipe) return;
      isTrackingEdgeSwipe = false;

      if (isSwipingHorizontally) {
        isSwipingHorizontally = false;
        const drawerWidth = getDrawerWidth();
        const touch = e.changedTouches[0];
        const finalX = touch.clientX;

        // Open if dragged past 28% of width or flicked to right with positive velocity
        if (finalX > drawerWidth * 0.28 || velocityX > 0.3) {
          setIsMobileSidebarOpen(true);
          if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
            try {
              localStorage.setItem('waves_sidebar_collapsed', 'false');
            } catch {}
          }
        } else {
          setIsMobileSidebarOpen(false);
        }
        setMobileDragOffset(null);
      }
    };

    const handleTouchCancel = () => {
      if (isTrackingEdgeSwipe) {
        isTrackingEdgeSwipe = false;
        isSwipingHorizontally = false;
        setMobileDragOffset(null);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isSidebarCollapsed]);

  // Determine effective sidebar width for page adaptation
  const isEffectiveCollapsed = settings.autoHideSidebar || isSidebarCollapsed;
  const isInkCanvasEditor = currentRoute.startsWith('/draws/');

  useEffect(() => {
    if (!isInkCanvasEditor) return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const handlePointerMove = (event: MouseEvent) => {
      const nearEdge = event.clientY <= 48 || event.clientY >= window.innerHeight - 48 || event.clientX <= 48;
      if (nearEdge) {
        setIsInkCanvasChromeVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setIsInkCanvasChromeVisible(false), 900);
      }
    };
    window.addEventListener('mousemove', handlePointerMove);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isInkCanvasEditor]);

  useEffect(() => {
    setIsInkCanvasChromeVisible(false);
  }, [isInkCanvasEditor, currentRoute]);

  // Gallery Fullscreen Viewer: auto-hide Sidebar & TopBar when viewing photos/videos/files
  const [isGalleryViewerOpen, setIsGalleryViewerOpen] = useState(false);

  useEffect(() => {
    const handleGalleryLightbox = (e: any) => {
      setIsGalleryViewerOpen(Boolean(e.detail?.isOpen));
    };
    window.addEventListener('vplay:gallery:lightbox_toggle', handleGalleryLightbox);
    return () => {
      window.removeEventListener('vplay:gallery:lightbox_toggle', handleGalleryLightbox);
    };
  }, []);

  useEffect(() => {
    if (currentRoute !== '/gallery') {
      setIsGalleryViewerOpen(false);
    }
  }, [currentRoute]);

  const [isUnsavedSettingsModalOpen, setIsUnsavedSettingsModalOpen] = useState(false);
  const [unsavedNoteState, setUnsavedNoteState] = useState<UnsavedNoteHandler | null>(null);
  const [isUnsavedNoteModalOpen, setIsUnsavedNoteModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    path: string;
    state?: any;
    targetTabId?: number;
    closeTabId?: number;
  } | null>(null);

  // Auto-collapse sidebar when entering note editor
  useEffect(() => {
    if (currentRoute.startsWith('/notes/')) {
      setIsSidebarCollapsed(true);
    }
  }, [currentRoute]);

  // Perform actual navigation
  const executeNavigation = useCallback((path: string, state?: any, targetTabId?: number, closeTabId?: number) => {
    const targetRoute = path.split(/[?#]/)[0] || '/';
    const isDifferentRoute = targetRoute !== currentRoute;
    const isAppTabSwitch = targetTabId !== undefined && targetTabId !== activeAppTabId;
    const destinationTabId = targetTabId ?? activeAppTabId;

    if (currentRoute !== '/search') {
      previousRouteRef.current = currentRoute;
    }

    setRouteState(state);

    if (path.includes('?')) {
      const [, query] = path.split('?');
      const params = new URLSearchParams(query);
      const chSlug = params.get('channel');
      if (chSlug) {
        const matched = channels.find((c) => c.slug === chSlug);
        if (matched) setCurrentChannel(matched);
      }
    }

    window.history.pushState(null, '', path);
    setCurrentRouteState(targetRoute);
    if (targetTabId !== undefined) setActiveAppTabId(targetTabId);
    setAppTabs((currentTabs) => {
      const remainingTabs = closeTabId === undefined
        ? currentTabs
        : currentTabs.filter((tab) => tab.id !== closeTabId);
      return remainingTabs.map((tab) => tab.id === destinationTabId ? { ...tab, route: path } : tab);
    });

    // Scroll to top on route navigation
    const scrollContainer = document.querySelector<HTMLElement>('#main-content-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (isDifferentRoute && !isAppTabSwitch) {
      if (tabLoadingTimerRef.current) clearTimeout(tabLoadingTimerRef.current);
      setIsTabLoading(true);
      tabLoadingTimerRef.current = setTimeout(() => {
        setIsTabLoading(false);
        setTabLoadCount((c) => c + 1);
      }, 1000);
    }
  }, [activeAppTabId, channels, currentRoute]);

  // Navigation handler
  const navigate = useCallback((path: string, state?: any, targetTabId?: number, closeTabId?: number) => {
    const targetRoute = path.split(/[?#]/)[0];
    const isAppTabSwitch = targetTabId !== undefined && targetTabId !== activeAppTabId;
    if (targetRoute === '/drivers') {
      setIsDriverManagementPanelOpen(true);
      return;
    }

    setIsDriverManagementPanelOpen(false);

    if (currentRoute === '/settings' && hasChanges) {
      const isStillSettings = path === '/settings' || path.startsWith('/settings?') || path.startsWith('/settings#');
      if (!isStillSettings || isAppTabSwitch) {
        setPendingNavigation({ path, state, targetTabId, closeTabId });
        setIsUnsavedSettingsModalOpen(true);
        return;
      }
    }

    if (unsavedNoteState?.isDirty && (path !== currentRoute || isAppTabSwitch)) {
      setPendingNavigation({ path, state, targetTabId, closeTabId });
      setIsUnsavedNoteModalOpen(true);
      return;
    }

    executeNavigation(path, state, targetTabId, closeTabId);
  }, [activeAppTabId, currentRoute, executeNavigation, hasChanges, unsavedNoteState]);

  const handleCommandLegacySearch = useCallback(() => {
    setIsCommandPromptOpen(false);
    navigate('/search');
  }, [navigate]);

  const handleSelectAppTab = useCallback((tabId: number) => {
    const selectedTab = appTabs.find((tab) => tab.id === tabId);
    if (!selectedTab || tabId === activeAppTabId) return;
    navigate(selectedTab.route, undefined, selectedTab.id);
  }, [activeAppTabId, appTabs, navigate]);

  const handleCreateAppTab = useCallback(() => {
    const id = nextAppTabIdRef.current++;
    setAppTabs((currentTabs) => [...currentTabs, { id, route: '/' }]);
    navigate('/', undefined, id);
  }, [navigate]);

  const handleCloseAppTab = useCallback((tabId: number) => {
    if (appTabs.length <= 1) return;
    if (tabId !== activeAppTabId) {
      setAppTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));
      return;
    }

    const closingIndex = appTabs.findIndex((tab) => tab.id === tabId);
    const nextTab = appTabs[closingIndex + 1] || appTabs[closingIndex - 1];
    if (nextTab) navigate(nextTab.route, undefined, nextTab.id, tabId);
  }, [activeAppTabId, appTabs, navigate]);

  const handleSaveAndNavigate = () => {
    applyDraftSettings();
    setIsUnsavedSettingsModalOpen(false);
    if (pendingNavigation) {
      executeNavigation(pendingNavigation.path, pendingNavigation.state, pendingNavigation.targetTabId, pendingNavigation.closeTabId);
      setPendingNavigation(null);
    }
  };

  const handleDiscardAndNavigate = () => {
    discardDraftSettings();
    setIsUnsavedSettingsModalOpen(false);
    if (pendingNavigation) {
      executeNavigation(pendingNavigation.path, pendingNavigation.state, pendingNavigation.targetTabId, pendingNavigation.closeTabId);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigate = () => {
    setIsUnsavedSettingsModalOpen(false);
    setPendingNavigation(null);
  };

  const handleSaveNoteAndNavigate = () => {
    if (unsavedNoteState) {
      unsavedNoteState.save();
    }
    setIsUnsavedNoteModalOpen(false);
    if (pendingNavigation) {
      executeNavigation(pendingNavigation.path, pendingNavigation.state, pendingNavigation.targetTabId, pendingNavigation.closeTabId);
      setPendingNavigation(null);
    }
  };

  const handleDiscardNoteAndNavigate = () => {
    if (unsavedNoteState) {
      unsavedNoteState.discard();
    }
    setIsUnsavedNoteModalOpen(false);
    if (pendingNavigation) {
      executeNavigation(pendingNavigation.path, pendingNavigation.state, pendingNavigation.targetTabId, pendingNavigation.closeTabId);
      setPendingNavigation(null);
    }
  };

  const handleCancelNoteNavigate = () => {
    setIsUnsavedNoteModalOpen(false);
    setPendingNavigation(null);
  };

  // Open search handler - opens new search box on TopBar
  const handleOpenSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('vplay:focus-topbar-search'));
  }, []);

  const handleCommandSearch = useCallback((query: string) => {
    window.dispatchEvent(new CustomEvent('vplay:search-command', { detail: { query } }));
  }, []);
  const handleCommandSearchFromWindow = useCallback((query: string) => {
    setIsCommandPromptOpen(false);
    handleCommandSearch(query);
  }, [handleCommandSearch]);
  const handleCommandAboutFromWindow = useCallback(() => {
    setIsCommandPromptOpen(false);
    handleOpenSparkverAbout();
  }, [handleOpenSparkverAbout]);

  // Global search shortcut: Ctrl+K / Cmd+K vẫn mở page spotlight search (/search)
  useEffect(() => {
    const handleGlobalSearchKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleGlobalSearchKey);
    return () => window.removeEventListener('keydown', handleGlobalSearchKey);
  }, [navigate]);

  // Global Customizable Keybinds (Alt+1: Home, Alt+2: Search box mới, Alt+3: Tools menu, Alt+4: Settings, Alt+5: Recent Channel)
  useKeyboardShortcuts({
    onHome: useCallback(() => {
      navigate('/');
    }, [navigate]),
    onSearch: useCallback(() => {
      window.dispatchEvent(new CustomEvent('vplay:focus-topbar-search'));
    }, []),
    onTools: useCallback(() => {
      window.dispatchEvent(new CustomEvent('vone:toggle-tools'));
      window.dispatchEvent(new CustomEvent('vplay:toggle-tools'));
    }, []),
    onSettings: useCallback(() => {
      navigate('/settings');
    }, [navigate]),
    onRecentChannel: useCallback(() => {
      let targetChannel = currentChannel;
      try {
        const savedId = localStorage.getItem('vplay_recent_channel_id');
        if (savedId) {
          const found = channels.find((c) => c.id === savedId);
          if (found) targetChannel = found;
        }
      } catch {}
      if (targetChannel) {
        setCurrentChannel(targetChannel);
        navigate(`/live-tv?channel=${targetChannel.slug}`);
      }
    }, [currentChannel, channels, navigate])
  });

  // Handle browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/drivers') {
        window.history.replaceState(null, '', currentRoute);
        setIsDriverManagementPanelOpen(true);
        return;
      }

      if (currentRoute === '/settings' && hasChanges) {
        window.history.pushState(null, '', '/settings');
        setPendingNavigation({ path: window.location.pathname });
        setIsUnsavedSettingsModalOpen(true);
        return;
      }
      if (unsavedNoteState?.isDirty) {
        window.history.pushState(null, '', currentRoute);
        setPendingNavigation({ path: window.location.pathname });
        setIsUnsavedNoteModalOpen(true);
        return;
      }
      const isTabSwitch = path !== currentRoute;
      const params = new URLSearchParams(window.location.search);
      const chSlug = params.get('channel');
      if (chSlug) {
        const matched = channels.find((c) => c.slug === chSlug);
        if (matched) setCurrentChannel(matched);
      }
      setIsDriverManagementPanelOpen(false);
      setCurrentRouteState(path);
      const fullPath = `${path}${window.location.search}${window.location.hash}`;
      setAppTabs((currentTabs) => currentTabs.map((tab) =>
        tab.id === activeAppTabId ? { ...tab, route: fullPath } : tab
      ));

      if (isTabSwitch) {
        if (tabLoadingTimerRef.current) clearTimeout(tabLoadingTimerRef.current);
        setIsTabLoading(true);
        tabLoadingTimerRef.current = setTimeout(() => {
          setIsTabLoading(false);
          setTabLoadCount((c) => c + 1);
        }, 1000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeAppTabId, channels, currentRoute, hasChanges, unsavedNoteState, triggerUnsavedTooltip]);

  // Handle page reload / unload when settings or note edits are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((currentRoute === '/settings' && hasChanges) || unsavedNoteState?.isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentRoute, hasChanges, unsavedNoteState]);

  // Handle playing a custom single channel
  const handlePlayCustomChannel = (newChannel: Channel) => {
    setChannels((prev) => {
      const exists = prev.some((c) => c.id === newChannel.id);
      if (exists) return prev;
      const updated = [newChannel, ...prev];
      return updated;
    });
    setCurrentChannel(newChannel);
    navigate(`/live-tv?channel=${newChannel.slug}`);
  };

  // Handle importing a list of M3U channels
  const handleImportPlaylist = (importedList: Channel[]) => {
    setChannels((prev) => {
      const updated = [...importedList, ...prev];
      try {
        localStorage.setItem('waves_custom_channels', JSON.stringify(importedList));
      } catch {}
      return updated;
    });
    if (importedList.length > 0) {
      setCurrentChannel(importedList[0]);
      navigate(`/live-tv?channel=${importedList[0].slug}`);
    }
  };

  // Render Page Content based on currentRoute
  const renderContent = () => {
    if (currentRoute.startsWith('/draws/')) return <Draws navigate={navigate} />;
    if (currentRoute.startsWith('/notes/')) {
      return (
        <NotesApp
          navigate={navigate}
          onEnterEditor={() => setIsSidebarCollapsed(true)}
          onRegisterUnsavedNote={setUnsavedNoteState}
        />
      );
    }

    // Route matching for news detail: /news/:slug
    if (currentRoute.startsWith('/news/')) {
      const slug = currentRoute.replace('/news/', '');
      return <Article slug={slug} navigate={navigate} fontSize={articleFontSize} />;
    }

    switch (currentRoute) {
      case '/':
      case '/home':
      case '/home-preview':
        return <HomePreview channels={channels} onSelectChannel={setCurrentChannel} navigate={navigate} />;

      case '/live-tv':
      case '/watch-preview':
        return (
          <LiveTV
            currentChannel={currentChannel}
            onSelectChannel={(ch) => {
              setCurrentChannel(ch);
            }}
            channels={channels}
            onOpenCustomStreamModal={() => setIsCustomStreamModalOpen(true)}
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
            navigate={navigate}
          />
        );

      case '/test':
        return (
          <TestChannels
            currentChannel={currentChannel}
            onSelectChannel={setCurrentChannel}
            channels={channels}
            onOpenCustomStreamModal={() => setIsCustomStreamModalOpen(true)}
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
          />
        );

      case '/news':
      case '/updates':
        return (
          <News
            navigate={navigate}
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
            onOpenUpdate={() => setIsUpdating(true)}
          />
        );

      case '/channels':
        return (
          <Channels
            channels={channels}
            onSelectChannel={setCurrentChannel}
            navigate={navigate}
            onOpenCustomStreamModal={() => setIsCustomStreamModalOpen(true)}
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
          />
        );

      case '/favorites':
        return (
          <Favorites
            channels={channels}
            onSelectChannel={setCurrentChannel}
            navigate={navigate}
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
          />
        );

      case '/about':
        return <About />;

      case '/auth':
        return <Auth navigate={navigate} />;

      case '/feedback':
        return <Feedback navigate={navigate} />;

      case '/winui-3':
        return <WinUI3 />;

      case '/command-prompt':
        return (
          <CommandPrompt
            onSearch={handleCommandSearch}
            onOpenAbout={handleOpenSparkverAbout}
            onOpenLegacySearch={handleCommandLegacySearch}
          />
        );

      case '/settings':
        return (
          <Settings
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
            onOpenUpdate={() => setIsUpdating(true)}
            onOpenOfficeTool={handleOpenOfficeTool}
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            navigate={navigate}
          />
        );

      case '/search':
        return (
          <ImmersiveSearch
            navigate={navigate}
            onSelectChannel={setCurrentChannel}
            onClose={() => {
              const target = previousRouteRef.current && previousRouteRef.current !== '/search' ? previousRouteRef.current : '/';
              navigate(target);
            }}
          />
        );

      case '/notes':
      case '/write':
      case '/present':
      case '/table':
        return (
          <NotesApp
            navigate={navigate}
            onEnterEditor={() => setIsSidebarCollapsed(true)}
            onRegisterUnsavedNote={setUnsavedNoteState}
          />
        );

      case '/gallery':
        return <Gallery navigate={navigate} searchQuery={currentTabSearchQuery} routeState={routeState} />;

      case '/draws':
        return <Draws navigate={navigate} />;

      case '/screenbug':
      case '/screenbox':
      case '/vlc':
        return <VLC navigate={navigate} />;

      case '/camera':
        return <Camera navigate={navigate} />;

      case '/craftmine':
        return <Craftmine />;

      case '/photopea':
        return <Photopea />;

      default:
        return <HomePreview channels={channels} onSelectChannel={setCurrentChannel} navigate={navigate} />;
    }
  };

  const isOfficeRoute = currentRoute.startsWith('/notes') || currentRoute === '/write';

  return (
    <NativeKeyboardProvider>
      <NotesProvider>
        <div
          id="sparkle-app-container-wrapper"
          className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center"
        >
          <div
            id="sparkle-app-root"
            data-immersive-sidebar={settings.immersiveSidebar}
            data-sidebar-position={settings.sidebarPosition}
            className={`h-screen w-full ${!isVisualInstalled ? 'no-visual-drivers' : ''} ${settings.superDarkMode ? 'bg-black' : 'bg-[#f9f9f9] dark:bg-[#1b1f24]'} text-[#111827] dark:text-[#E0E0E6] flex font-sans selection:bg-[#d946ef] selection:text-white dark:selection:bg-[#ff2d92] dark:selection:text-white relative overflow-hidden`}
            style={!isResolutionInstalled ? {
              width: '75%',
              transform: 'scaleX(1.333333)',
              transformOrigin: 'center center',
              margin: '0 auto',
            } : undefined}
          >
      {/* Fixed atmospheric cosmic background matching custom nebula gradient */}
      <div 
        id="fixed-app-background-solid" 
        className={`fixed inset-0 pointer-events-none -z-50 ${settings.superDarkMode ? '!bg-black' : ''}`} 
        aria-hidden="true" 
      />

      {isInkCanvasEditor && !isInkCanvasChromeVisible && <><div onMouseEnter={() => setIsInkCanvasChromeVisible(true)} className="fixed left-0 top-0 bottom-0 w-3 z-[200]" /><div onMouseEnter={() => setIsInkCanvasChromeVisible(true)} className="fixed left-0 top-0 right-0 h-3 z-[200]" /><div onMouseEnter={() => setIsInkCanvasChromeVisible(true)} className="fixed left-0 bottom-0 right-0 h-3 z-[200]" /></>}

      {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
      {(settings.navigationMode !== 'floaty' || isMobileSidebarOpen || mobileDragOffset !== null) && (!isInkCanvasEditor || isInkCanvasChromeVisible) && !isGalleryViewerOpen && (
        <Sidebar
          currentRoute={isDriverManagementPanelOpen ? '/drivers' : currentRoute}
          navigate={navigate}
          onOpenCommandPrompt={handleOpenCommandPrompt}
          onSelectChannel={setCurrentChannel}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          isMobileOpen={isMobileSidebarOpen}
          mobileDragOffset={mobileDragOffset}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          channels={channels}
          currentChannel={currentChannel}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenDiscord={() => setIsWelcomeModalOpen(true)}
          onOpenSummarize={(art) => {
            setSummarizeArticle(art);
            setIsNewsSummaryOpen(true);
          }}
          onOpenTextToSpeech={(art) => {
            setTtsArticle(art);
            setIsTtsOpen(true);
          }}
          onOpenFindWords={() => setIsFindWordsOpen(true)}
          onOpenAddStream={() => setIsAddStreamOpen(true)}
          onImportChannels={handleImportPlaylist}
          onOpenNotifications={() => setIsUnderConstructionOpen(true)}
          fontSize={articleFontSize}
          onChangeFontSize={handleFontSizeChange}
          onOpenUpdate={() => setIsUpdating(true)}
          onOpenOfficeTool={handleOpenOfficeTool}
          isSplashFinished={isSplashFinished}
        />
      )}

      {/* Main App Container */}
      <div 
        id="main-content-scroll-container"
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden no-scrollbar transition-[padding] duration-[160ms] ease-[cubic-bezier(0.34,1.45,0.64,1)] bg-[#f3f3f3] dark:bg-[#1b1f24] ${
        isInkCanvasEditor || isGalleryViewerOpen
          ? 'md:pl-0 md:pr-0 pb-0'
          : !settings.dockToSidebar || settings.navigationMode === 'floaty'
          ? 'md:pl-0 md:pr-0 pb-20'
            : settings.sidebarPosition === 'right'
              ? isEffectiveCollapsed
                ? 'md:pr-[48px]'
                : 'md:pr-[260px]'
              : isEffectiveCollapsed
                ? 'md:pl-[48px]'
                : 'md:pl-[260px]'
      }`}>
        {/* Keep search behavior mounted for the sidebar field and shortcuts without showing the old header. */}
        {(!isInkCanvasEditor || isInkCanvasChromeVisible) && !isGalleryViewerOpen && (
          <div className="hidden" aria-hidden="true">
            <TopBar
              currentRoute={currentRoute}
              navigate={navigate}
              tabSearchQuery={currentTabSearchQuery}
              onTabSearchChange={handleTabSearchChange}
              onOpenSearch={handleOpenSearch}
              onOpenSparkver={handleOpenSparkverAbout}
              onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
              currentChannel={currentChannel}
              channels={channels}
              onSelectChannel={setCurrentChannel}
              onOpenHelp={() => setIsHelpModalOpen(true)}
              onOpenDiscord={() => setIsWelcomeModalOpen(true)}
              onOpenSummarize={(art) => {
                setSummarizeArticle(art);
                setIsNewsSummaryOpen(true);
              }}
              onOpenTextToSpeech={(art) => {
                setTtsArticle(art);
                setIsTtsOpen(true);
              }}
              onOpenFindWords={() => {
                setIsFindWordsOpen(true);
              }}
              onOpenAddStream={() => setIsAddStreamOpen(true)}
              onImportChannels={handleImportPlaylist}
              onOpenNotifications={() => setIsUnderConstructionOpen(true)}
              fontSize={articleFontSize}
              onChangeFontSize={handleFontSizeChange}
              showUnsavedTooltip={showUnsavedTooltip}
              onDismissUnsavedTooltip={() => setShowUnsavedTooltip(false)}
            />
          </div>
        )}

        {(!isInkCanvasEditor || isInkCanvasChromeVisible) && !isGalleryViewerOpen && (
          <AppTabsBar
            showTabs={settings.tabsExperiment}
            tabs={settings.tabsExperiment ? appTabs : []}
            activeTabId={activeAppTabId}
            searchQuery={currentTabSearchQuery}
            onSearchChange={handleTabSearchChange}
            onOpenSearch={handleOpenSearch}
            onOpenAbout={handleOpenSparkverAbout}
            onSelectTab={handleSelectAppTab}
            onCreateTab={handleCreateAppTab}
            onCloseTab={handleCloseAppTab}
          />
        )}

        {/* Dynamic Page Content with smooth slide-up transition - Bo cong 10px góc trên trái ở desktop, không bo ở mobile */}
        <main
          id={settings.tabsExperiment ? `app-tab-panel-${activeAppTabId}` : undefined}
          role={settings.tabsExperiment ? 'tabpanel' : undefined}
          aria-labelledby={settings.tabsExperiment ? `app-tab-${activeAppTabId}` : undefined}
          className={`main-tab-page flex-1 w-full mx-auto rounded-tl-none md:rounded-tl-[10px] rounded-tr-none rounded-br-none rounded-bl-none bg-[#f9f9f9] dark:bg-[#282c31] ${
          currentRoute === '/' || currentRoute === '/home' || currentRoute === '/news' || currentRoute === '/updates' || isOfficeRoute || currentRoute === '/craftmine' || currentRoute === '/photopea' || currentRoute === '/vlc' || currentRoute === '/screenbox' || currentRoute === '/screenbug' || currentRoute === '/gallery' || currentRoute === '/draws' || currentRoute.startsWith('/draws/') || currentRoute === '/camera'
            ? 'p-0 max-w-none pt-0' 
            : 'px-4 sm:px-6 md:px-8 py-5 max-w-7xl'
        } ${
          settings.navigationMode === 'floaty' && !isOfficeRoute
            ? 'pb-28 sm:pb-32'
            : ''
        }`}>
          {/* Dynamic Page Content with 1-second splash screen transition on tab switch */}
          {isTabLoading ? (
            <div
              key={`tab-loading-${currentRoute}`}
              className="w-full flex-1 flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh]"
            >
              <TabLoadingScreen route={currentRoute} />
            </div>
          ) : (
            <motion.div
              key={`tab-loaded-${currentRoute}-${tabLoadCount}-${isSplashFinished ? 'booted' : 'booting'}`}
              initial={{ opacity: 0, y: 22 }}
              animate={isSplashFinished ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
              transition={{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }}
              className={`tab-element-slide-up-container w-full min-h-full rounded-tl-none md:rounded-tl-[10px] rounded-tr-none rounded-br-none rounded-bl-none ${
                settings.pageAnimation === 'zoomIn' ? 'page-anim-zoom origin-center' : ''
              }`}
            >
              {renderContent()}
            </motion.div>
          )}
        </main>

      </div>

      {/* Floaty bar navigation (Tab View) */}
      {settings.navigationMode === 'floaty' && !isGalleryViewerOpen && (
        <BottomDock
          currentRoute={currentRoute}
          navigate={navigate}
          currentChannel={currentChannel}
          channels={channels}
          onOpenSearch={handleOpenSearch}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenDiscord={() => setIsWelcomeModalOpen(true)}
          onOpenSummarize={(art) => {
            setSummarizeArticle(art);
            setIsNewsSummaryOpen(true);
          }}
          onOpenTextToSpeech={(art) => {
            setTtsArticle(art);
            setIsTtsOpen(true);
          }}
          onOpenFindWords={() => {
            setIsFindWordsOpen(true);
          }}
          onOpenAddStream={() => setIsAddStreamOpen(true)}
          onImportChannels={handleImportPlaylist}
          fontSize={articleFontSize}
          onChangeFontSize={handleFontSizeChange}
          searchQuery={currentTabSearchQuery}
          onSearchChange={handleTabSearchChange}
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
          onOpenOfficeTool={handleOpenOfficeTool}
        />
      )}

      {/* Global Modals */}
      <SparkverAboutWindow
        isOpen={isSparkverAboutOpen}
        onClose={handleCloseSparkverAbout}
      />
      <CommandPromptWindow
        isOpen={isCommandPromptOpen}
        onClose={handleCloseCommandPrompt}
        onSearch={handleCommandSearchFromWindow}
        onOpenAbout={handleCommandAboutFromWindow}
        onOpenLegacySearch={handleCommandLegacySearch}
      />
      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        navigate={navigate}
        onSelectChannel={setCurrentChannel}
      />

      {/* Unsaved Settings Confirmation Modal */}
      <UnsavedSettingsModal
        isOpen={isUnsavedSettingsModalOpen}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigate}
      />

      {/* Unsaved Note Confirmation Modal */}
      <UnsavedNoteModal
        isOpen={isUnsavedNoteModalOpen}
        noteTitle={unsavedNoteState?.noteTitle || 'Untitled Note'}
        onSave={handleSaveNoteAndNavigate}
        onDiscard={handleDiscardNoteAndNavigate}
        onCancel={handleCancelNoteNavigate}
      />

      <CustomStreamModal
        isOpen={isCustomStreamModalOpen}
        onClose={() => setIsCustomStreamModalOpen(false)}
        onPlayCustomChannel={handlePlayCustomChannel}
        onImportPlaylist={handleImportPlaylist}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* News Summary Modal */}
      <NewsSummaryModal
        isOpen={isNewsSummaryOpen}
        onClose={() => setIsNewsSummaryOpen(false)}
        article={summarizeArticle}
      />

      {/* Text to Speech Floating Player */}
      <TextToSpeechPlayer
        isOpen={isTtsOpen}
        onClose={() => setIsTtsOpen(false)}
        article={ttsArticle}
      />

      {/* In-Article / News Word Finder */}
      <FindWordsBar
        isOpen={isFindWordsOpen}
        onClose={() => setIsFindWordsOpen(false)}
      />

      {/* Quick Add Stream Modal Dialog (Tên luồng, Địa chỉ luồng) */}
      <AddStreamModal
        isOpen={isAddStreamOpen}
        onClose={() => setIsAddStreamOpen(false)}
        onAddStream={handlePlayCustomChannel}
      />

      {/* Startup / Refresh Welcome Modal */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
      />

      {/* Notifications / Under Construction Modal */}
      <UnderConstructionModal
        isOpen={isUnderConstructionOpen}
        onClose={() => setIsUnderConstructionOpen(false)}
      />

      {/* Floating Movable Sticky Note Widget */}
      {!isGalleryViewerOpen && <StickyNoteWidget onNavigateNotes={() => navigate('/notes')} />}

      {/* Windows 11 Fluent In-App Custom Scroller Bar */}
      <AppScrollbar
        currentRoute={currentRoute}
        isGalleryViewerOpen={isGalleryViewerOpen}
        isTopBarVisible={(!isInkCanvasEditor || isInkCanvasChromeVisible) && !isGalleryViewerOpen}
      />

      {/* App Native Virtual Keyboard for Touch Devices */}
      <NativeKeyboard />

      {/* Global Application Toast Notifications */}
      <GlobalToast />

      {/* In-App Insider Evaluation Watermark (30s on / 30s off cycle) */}
      {isSplashFinished && <EvaluationWatermark />}

      {/* Animated Boot Screen (if enabled via Insider experiments and not running setup wizard) */}
      {!isSetupWizardOpen && !isBootVideoFinished && settings.animatedBootScreen && (
        <AnimatedBootScreen onFinish={() => setIsBootVideoFinished(true)} />
      )}

      {/* Startup splash waits for two full progress GIF loops after the boot video (if not running setup wizard) */}
      {!isSetupWizardOpen && isBootVideoFinished && !isSplashFinished && (
        <SplashScreen
          duration={SPINNING_RING_GIF_LOOP_DURATION_MS * 2}
          ringSize={60}
          isClosable={false}
          onFinish={() => setIsSplashFinished(true)}
        />
      )}

      {/* Update Sparkle Splash Screen (1 minute: 60s) */}
      {isUpdating && (
        <SplashScreen
          duration={60000}
          subtitle="Sparkle needs an update - Working on it"
          onFinish={() => setIsUpdating(false)}
        />
      )}

      {/* Sparkle Setup Wizard (Windows 11 OOBE - first launch or triggered via Settings / URL ?setup=true) */}
      <SparkleSetupWizard
        isOpen={isSetupWizardOpen}
        onFinish={handleFinishSetupWizard}
      />

      {/* Sparkle Driver Setup Modal Dialogs */}
      <SparkleDriverModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
      />

      <DriverManagementPanel
        isOpen={isDriverManagementPanelOpen && isSplashFinished && !isSetupWizardOpen && !isDriverModalOpen}
        onClose={closeDriverManagementPanel}
        onOpenDriverModal={() => setIsDriverModalOpen(true)}
      />
      </div>
      <AppNativeCursor enabled={!isResolutionInstalled} />
    </div>
      </NotesProvider>
    </NativeKeyboardProvider>
  );
}
