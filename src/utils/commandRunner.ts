import type { SystemSettings } from '../hooks/useSettings';
import type { DriverStatus } from '../hooks/useDrivers';

export type ExperimentSettingKey =
  | 'nativeKeyboard'
  | 'immersiveSearch'
  | 'fluentIcons'
  | 'newWatchTab'
  | 'dynamicSidebarIcons'
  | 'animatedBootScreen'
  | 'triangleExperiment'
  | 'tabsExperiment'
  | 'searchColorfulExperiment'
  | 'widgetsFeed'
  | 'isTopBarBottom'
  | 'isSidebarMerged'
  | 'isWallpaperAllowed';

export type Experiment = {
  id: string;
  name: string;
  settingKey: ExperimentSettingKey;
};

export type ExperimentRow = {
  id: string;
  name: string;
  enabled: boolean;
};

export type CommandResult =
  | { kind: 'message'; message: string; tone: 'success' | 'error' | 'neutral' }
  | { kind: 'list'; experiments: ExperimentRow[] }
  | { kind: 'clear' };

export const EXPERIMENTS: Experiment[] = [
  { id: '471503201', name: 'Native keyboard', settingKey: 'nativeKeyboard' },
  { id: '824690102', name: 'Immersive search experience', settingKey: 'immersiveSearch' },
  { id: '306517403', name: 'Fluent icons', settingKey: 'fluentIcons' },
  { id: '918243604', name: 'New Watch Tab', settingKey: 'newWatchTab' },
  { id: '572638105', name: 'Dynamic sidebar icons', settingKey: 'dynamicSidebarIcons' },
  { id: '143975006', name: 'Animated boot screen', settingKey: 'animatedBootScreen' },
  { id: '689214707', name: 'Triangle loading experiment', settingKey: 'triangleExperiment' },
  { id: '385104729', name: 'Tabs', settingKey: 'tabsExperiment' },
  { id: '742839516', name: 'Search experience upgrades', settingKey: 'searchColorfulExperiment' },
  { id: '861937204', name: 'Widgets Feed', settingKey: 'widgetsFeed' },
  { id: '902417635', name: 'IsTopBarBottom', settingKey: 'isTopBarBottom' },
  { id: '648291037', name: 'IsSidebarMerged', settingKey: 'isSidebarMerged' },
  { id: '519482736', name: 'IsWallpaperAllowed', settingKey: 'isWallpaperAllowed' },
];

export const COMMAND_USAGE =
  'Commands: /vivetool /gui, /vivetool /enable|/disable /id:<9-digit-id> [/velocity] or /vivetool /list; /velocity <feature> [enable|disable]; /drivers /install|/uninstall /visuals|/resolution; /search <keyword>; /debug legacysearch; /sparkver.';

export const readExperimentRows = (settings: SystemSettings): ExperimentRow[] =>
  EXPERIMENTS.map(({ id, name, settingKey }) => ({
    id,
    name,
    enabled: settings[settingKey],
  }));

export interface ExecuteCommandContext {
  settings: SystemSettings;
  updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
  resolutionStatus: DriverStatus;
  visualStatus: DriverStatus;
  installResolutionDriver: () => void;
  rollbackResolutionDriver: () => void;
  installVisualDriver: () => void;
  rollbackVisualDriver: () => void;
  onSearch: (query: string) => void;
  onOpenAbout: () => void;
  onOpenLegacySearch: () => void;
  onOpenViveToolGui: () => void;
}

const findExperimentByName = (rawName: string): Experiment | undefined => {
  const normalized = rawName.replace(/^\/?(name|id):/i, '').trim().toLowerCase();
  if (!normalized) return undefined;
  return EXPERIMENTS.find(
    (feature) =>
      feature.name.toLowerCase() === normalized ||
      feature.name.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, '') ||
      feature.settingKey.toLowerCase() === normalized ||
      feature.id === normalized
  );
};

const applyExperimentToggle = (
  experiment: Experiment,
  shouldEnable: boolean,
  hasVelocityFlag: boolean,
  settings: SystemSettings,
  updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void
): CommandResult => {
  const isAlreadyInRequestedState = settings[experiment.settingKey] === shouldEnable;
  if (experiment.settingKey === 'isSidebarMerged' && shouldEnable && !settings.isTopBarBottom) {
    updateSetting('isTopBarBottom', true);
  }
  updateSetting(experiment.settingKey, shouldEnable);
  return {
    kind: 'message',
    message: isAlreadyInRequestedState
      ? `${experiment.name} (ID ${experiment.id}) is already ${shouldEnable ? 'ENABLED' : 'DISABLED'}${hasVelocityFlag ? ' with /velocity' : ''}.`
      : `${experiment.name} (ID ${experiment.id}) is now ${shouldEnable ? 'ENABLED' : 'DISABLED'}${hasVelocityFlag ? ' with /velocity' : ''}.`,
    tone: isAlreadyInRequestedState ? 'neutral' : 'success',
  };
};

const parseBooleanToken = (token?: string): boolean | null => {
  if (!token) return null;
  const clean = token.replace(/^\/+/, '').toLowerCase();
  if (clean === 'enable' || clean === 'enabled' || clean === 'on' || clean === 'true' || clean === '1') {
    return true;
  }
  if (clean === 'disable' || clean === 'disabled' || clean === 'off' || clean === 'false' || clean === '0') {
    return false;
  }
  return null;
};

export const executeSparkleCommand = (
  rawInput: string,
  ctx: ExecuteCommandContext
): CommandResult => {
  const rawCommand = rawInput.trim();
  const tokens = rawCommand.split(/\s+/);
  const executable = tokens[0]?.replace(/^\/+/, '').toLowerCase();
  const action = tokens[1]?.replace(/^\/+/, '').replace(/:$/, '').toLowerCase();

  if (executable === 'clear' || executable === 'cls') {
    return { kind: 'clear' };
  }

  if (executable === 'help' || executable === '?') {
    return { kind: 'message', message: COMMAND_USAGE, tone: 'neutral' };
  }

  if (executable === 'vivetool' && action === 'gui' && tokens.length === 2) {
    ctx.onOpenViveToolGui();
    return { kind: 'message', message: 'Opening ViveTool GUI.', tone: 'neutral' };
  }

  if (executable === 'sparkver') {
    ctx.onOpenAbout();
    return { kind: 'message', message: 'Opening About Sparkle.', tone: 'neutral' };
  }

  if (executable === 'debug') {
    const debugCommand = tokens[1]?.replace(/^\/+/, '').toLowerCase();
    if (debugCommand === 'legacysearch' && tokens.length === 2) {
      ctx.onOpenLegacySearch();
      return { kind: 'message', message: 'Opening the legacy search page.', tone: 'neutral' };
    }
    return { kind: 'message', message: 'Usage: /debug legacysearch', tone: 'error' };
  }

  if (executable === 'search') {
    const query = tokens.slice(1).join(' ').trim();
    if (!query) {
      return { kind: 'message', message: 'Usage: /search <keyword>', tone: 'error' };
    }
    ctx.onSearch(query);
    return { kind: 'message', message: `Searching Sparkle for "${query}".`, tone: 'neutral' };
  }

  if (executable === 'drivers') {
    const driverType = tokens[2]?.replace(/^\/+/, '').toLowerCase();
    if ((action !== 'install' && action !== 'uninstall') || (driverType !== 'visuals' && driverType !== 'resolution')) {
      return {
        kind: 'message',
        message: 'Usage: /drivers /install|/uninstall /visuals|/resolution',
        tone: 'error',
      };
    }

    const isVisualDriver = driverType === 'visuals';
    const driverName = isVisualDriver ? 'Visual effects' : 'Resolution';
    const status = isVisualDriver ? ctx.visualStatus : ctx.resolutionStatus;
    const shouldInstall = action === 'install';
    const isAlreadyInRequestedState = shouldInstall
      ? status === 'installed'
      : status !== 'installed';

    if (!isAlreadyInRequestedState) {
      if (isVisualDriver) {
        if (shouldInstall) ctx.installVisualDriver();
        else ctx.rollbackVisualDriver();
      } else if (shouldInstall) {
        ctx.installResolutionDriver();
      } else {
        ctx.rollbackResolutionDriver();
      }
    }

    return {
      kind: 'message',
      message: isAlreadyInRequestedState
        ? `${driverName} driver is already ${shouldInstall ? 'installed' : 'uninstalled'}.`
        : `${driverName} driver is now ${shouldInstall ? 'installed' : 'uninstalled'}.`,
      tone: isAlreadyInRequestedState ? 'neutral' : 'success',
    };
  }

  // Velocity command syntax:
  // /velocity IsWallpaperAllowed [enable|disable|on|off|true|false]
  // /velocity /enable|/disable IsWallpaperAllowed
  // /velocity /list
  if (executable === 'velocity') {
    if (action === 'list') {
      return { kind: 'list', experiments: readExperimentRows(ctx.settings) };
    }

    const maybeActionBool = parseBooleanToken(tokens[1]);
    let targetToken = tokens[1];
    let desiredState: boolean | null = null;

    if (maybeActionBool !== null) {
      desiredState = maybeActionBool;
      targetToken = tokens[2];
    } else if (tokens.length >= 3) {
      desiredState = parseBooleanToken(tokens[2]);
    }

    const experiment = targetToken ? findExperimentByName(targetToken) : undefined;
    if (!experiment) {
      return {
        kind: 'message',
        message: targetToken
          ? `Unknown velocity feature "${targetToken}". Run /vivetool /list to see available features.`
          : 'Usage: /velocity <featureName> [enable|disable]',
        tone: 'error',
      };
    }

    const nextState = desiredState !== null ? desiredState : !ctx.settings[experiment.settingKey];
    return applyExperimentToggle(experiment, nextState, true, ctx.settings, ctx.updateSetting);
  }

  // Direct bare feature name shortcut: e.g. "IsWallpaperAllowed" or "IsWallpaperAllowed enable|disable"
  const directExperiment = findExperimentByName(executable || '');
  if (directExperiment && !rawCommand.startsWith('/')) {
    const desiredState = parseBooleanToken(tokens[1]);
    const nextState = desiredState !== null ? desiredState : !ctx.settings[directExperiment.settingKey];
    return applyExperimentToggle(directExperiment, nextState, true, ctx.settings, ctx.updateSetting);
  }

  if (executable !== 'vivetool' && executable !== 'vivetool.exe') {
    return {
      kind: 'message',
      message: `Command not recognized: ${tokens[0]}. ${COMMAND_USAGE}`,
      tone: 'error',
    };
  }

  if (action === 'list') {
    return {
      kind: 'list',
      experiments: readExperimentRows(ctx.settings),
    };
  }

  if (action === 'enable' || action === 'disable') {
    const remainingTokens = tokens.slice(2);
    const idToken = remainingTokens.find((token) => /^\/?id:\d+$/i.test(token));
    const nameToken = remainingTokens.find((token) => /^\/?name:.+$/i.test(token));
    const featureId = idToken?.replace(/^\/?id:/i, '');
    const hasVelocityFlag = remainingTokens.some((token) => /^\/?velocity$/i.test(token));

    let experiment: Experiment | undefined;

    if (featureId) {
      if (!/^\d{9}$/.test(featureId)) {
        return {
          kind: 'message',
          message: `A 9-digit feature ID is required. ${COMMAND_USAGE}`,
          tone: 'error',
        };
      }
      experiment = EXPERIMENTS.find((feature) => feature.id === featureId);
      if (!experiment) {
        return {
          kind: 'message',
          message: `No experimental feature was found with ID ${featureId}. Run /vivetool /list to see available IDs.`,
          tone: 'error',
        };
      }
    } else if (nameToken) {
      experiment = findExperimentByName(nameToken.replace(/^\/?name:/i, ''));
      if (!experiment) {
        return {
          kind: 'message',
          message: `No experimental feature matched "${nameToken}". Run /vivetool /list to see available features.`,
          tone: 'error',
        };
      }
    } else {
      const bareName = remainingTokens.filter((t) => !/^\/?velocity$/i.test(t)).join(' ');
      experiment = findExperimentByName(bareName);
      if (!experiment) {
        return {
          kind: 'message',
          message: `A 9-digit feature ID or feature name is required. ${COMMAND_USAGE}`,
          tone: 'error',
        };
      }
    }

    const shouldEnable = action === 'enable';
    return applyExperimentToggle(experiment, shouldEnable, hasVelocityFlag, ctx.settings, ctx.updateSetting);
  }

  return {
    kind: 'message',
    message: `Invalid viVeTool command. ${COMMAND_USAGE}`,
    tone: 'error',
  };
};
