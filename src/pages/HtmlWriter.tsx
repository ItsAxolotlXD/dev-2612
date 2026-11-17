import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Columns2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FolderOpen,
  Laptop,
  Play,
  Plus,
  RotateCw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { FluentHtmlWriterIcon } from '../components/FluentIcons';

type LayoutMode = 'split' | 'code' | 'preview';
type ViewportPreset = 'desktop' | 'tablet' | 'mobile';

interface HtmlDocumentItem {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
}

interface ConsoleEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  timestamp: string;
}

const STORAGE_KEY = 'sparkle_html_writer_docs_v1';
const ACTIVE_DOC_KEY = 'sparkle_html_writer_active_id_v1';

const STARTER_TEMPLATES: Array<{ id: string; label: string; name: string; content: string }> = [
  {
    id: 'starter-fluent',
    label: 'Fluent Welcome Card',
    name: 'welcome.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hello HTML Writer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f0f6ff 0%, #e5efff 50%, #f8fafc 100%);
      color: #0f172a;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      padding: 28px;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 20px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    button {
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: #0067c0;
      color: #ffffff;
      transition: transform 0.12s ease, background 0.15s ease;
    }
    button:hover { background: #0058a6; }
    button:active { transform: scale(0.98); }
    .count {
      font-size: 14px;
      font-weight: 600;
      color: #0067c0;
      font-variant-numeric: tabular-nums;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>HTML Writer Live Runner</h1>
    <p>Edit the HTML, CSS, or JavaScript on the left and click Run (or enable Auto-run) to test immediately.</p>
    <div class="actions">
      <button id="btn">Click counter</button>
      <span class="count" id="output">Clicks: 0</span>
    </div>
  </main>

  <script>
    let count = 0;
    const btn = document.getElementById('btn');
    const output = document.getElementById('output');
    btn.addEventListener('click', () => {
      count += 1;
      output.textContent = 'Clicks: ' + count;
      console.log('Button clicked:', count);
    });
  </script>
</body>
</html>`,
  },
  {
    id: 'starter-blank',
    label: 'Blank HTML5',
    name: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Untitled Document</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <h1>Hello World</h1>
  <p>Start writing your HTML here.</p>
</body>
</html>`,
  },
  {
    id: 'starter-dashboard',
    label: 'Responsive Grid Demo',
    name: 'grid-demo.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CSS Grid Showcase</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 28px;
    }
    header {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .tile {
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 18px;
    }
    .label { font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    .metric { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <header>
    <h2>System Metrics</h2>
    <span id="clock" style="color:#38bdf8;font-variant-numeric:tabular-nums;"></span>
  </header>
  <section class="grid">
    <div class="tile"><div class="label">Active Nodes</div><div class="metric">24</div></div>
    <div class="tile"><div class="label">Avg Latency</div><div class="metric">14 ms</div></div>
    <div class="tile"><div class="label">Throughput</div><div class="metric">1.8 GB/s</div></div>
  </section>
  <script>
    const clock = document.getElementById('clock');
    const tick = () => { clock.textContent = new Date().toLocaleTimeString(); };
    tick();
    setInterval(tick, 1000);
  </script>
</body>
</html>`,
  },
];

const formatHtmlCode = (raw: string): string => {
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  const tokens = raw
    .replace(/>\s+</g, '>\n<')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let indent = 0;
  const formatted: string[] = [];

  for (const line of tokens) {
    const isClosingTag = /^<\/[a-zA-Z0-9-]+>/.test(line);
    if (isClosingTag) {
      indent = Math.max(0, indent - 1);
    }

    formatted.push(`${'  '.repeat(indent)}${line}`);

    const openMatch = line.match(/^<([a-zA-Z0-9-]+)(?:\s[^>]*)?>$/);
    const isSelfClosing = /\/>$/.test(line) || /^<!/.test(line);
    const hasInlineClose = openMatch ? line.includes(`</${openMatch[1]}>`) : false;

    if (openMatch && !isSelfClosing && !hasInlineClose && !voidTags.has(openMatch[1].toLowerCase())) {
      indent += 1;
    }
  }

  return formatted.join('\n');
};

const extractDocumentTitle = (html: string): string => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.trim();
  return title || 'Preview';
};

const buildRunnerSrcDoc = (html: string, channelId: string): string => {
  const bridgeScript = `<script>
(function() {
  var CHANNEL = ${JSON.stringify(channelId)};
  function serializeArg(arg) {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.stack || arg.message;
    try { return JSON.stringify(arg); } catch (e) { return String(arg); }
  }
  function send(level, args) {
    try {
      var text = Array.prototype.slice.call(args).map(serializeArg).join(' ');
      window.parent.postMessage({ source: 'html-writer-console', channel: CHANNEL, level: level, text: text }, '*');
    } catch (err) {}
  }
  ['log', 'info', 'warn', 'error'].forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      send(level, arguments);
      if (orig) orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function(e) {
    send('error', [e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    send('error', ['Unhandled Promise Rejection:', e.reason]);
  });
})();
</script>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}\n${bridgeScript}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${bridgeScript}</head>`);
  }
  return `<!DOCTYPE html><html><head>${bridgeScript}</head><body>${html}</body></html>`;
};

const loadStoredDocs = (): HtmlDocumentItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return [
    {
      id: 'doc-welcome',
      name: STARTER_TEMPLATES[0].name,
      content: STARTER_TEMPLATES[0].content,
      updatedAt: Date.now(),
    },
  ];
};

export const HtmlWriter: React.FC = () => {
  const [docs, setDocs] = useState<HtmlDocumentItem[]>(loadStoredDocs);
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    const savedId = localStorage.getItem(ACTIVE_DOC_KEY);
    const initialDocs = loadStoredDocs();
    return initialDocs.some((d) => d.id === savedId) ? (savedId as string) : initialDocs[0].id;
  });

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) ?? docs[0],
    [activeDocId, docs]
  );

  const [code, setCode] = useState<string>(() => activeDoc?.content ?? STARTER_TEMPLATES[0].content);
  const [runCode, setRunCode] = useState<string>(() => activeDoc?.content ?? STARTER_TEMPLATES[0].content);
  const [runRevision, setRunRevision] = useState(1);
  const [autoRun, setAutoRun] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [viewportPreset, setViewportPreset] = useState<ViewportPreset>('desktop');
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [isFilesDrawerOpen, setIsFilesDrawerOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [editingDocNameId, setEditingDocNameId] = useState<string | null>(null);
  const [editingDocNameValue, setEditingDocNameValue] = useState('');

  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const channelIdRef = useRef(`html-writer-${Math.random().toString(36).slice(2, 10)}`);

  // Persist docs & active selection
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      localStorage.setItem(ACTIVE_DOC_KEY, activeDocId);
    } catch {
      // ignore storage quota errors
    }
  }, [activeDocId, docs]);

  // Sync editor state when switching documents
  useEffect(() => {
    if (!activeDoc) return;
    setCode(activeDoc.content);
    setRunCode(activeDoc.content);
    setRunRevision((r) => r + 1);
    setConsoleLogs([]);
  }, [activeDoc?.id]);

  // Update stored doc content cleanly
  const updateActiveDocContent = useCallback(
    (nextContent: string) => {
      setCode(nextContent);
      setDocs((prev) =>
        prev.map((d) =>
          d.id === activeDocId ? { ...d, content: nextContent, updatedAt: Date.now() } : d
        )
      );
    },
    [activeDocId]
  );

  // Auto-run debounce
  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(() => {
      setConsoleLogs([]);
      setRunCode(code);
      setRunRevision((r) => r + 1);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [autoRun, code]);

  // Listen for sandboxed console messages
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (
        !data ||
        typeof data !== 'object' ||
        data.source !== 'html-writer-console' ||
        data.channel !== channelIdRef.current
      ) {
        return;
      }
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setConsoleLogs((prev) => [
        ...prev.slice(-99),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level: data.level === 'warn' || data.level === 'error' || data.level === 'info' ? data.level : 'log',
          text: String(data.text ?? ''),
          timestamp,
        },
      ]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Split pane drag resizing
  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: PointerEvent) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(78, Math.max(22, Math.round(rawPct))));
    };
    const onUp = () => setIsDraggingSplit(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDraggingSplit]);

  const handleRunNow = useCallback(() => {
    setConsoleLogs([]);
    setRunCode(code);
    setRunRevision((r) => r + 1);
  }, [code]);

  const handleSaveExplicit = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 1600);
    } catch {
      // ignore
    }
  }, [docs]);

  const handleFormat = useCallback(() => {
    const formatted = formatHtmlCode(code);
    updateActiveDocContent(formatted);
  }, [code, updateActiveDocContent]);

  const handleCreateDoc = (template?: (typeof STARTER_TEMPLATES)[number]) => {
    const chosen = template ?? STARTER_TEMPLATES[1];
    const baseName = chosen.name.replace(/\.html$/i, '');
    let candidate = `${baseName}.html`;
    let counter = 2;
    while (docs.some((d) => d.name.toLowerCase() === candidate.toLowerCase())) {
      candidate = `${baseName}-${counter}.html`;
      counter += 1;
    }
    const newDoc: HtmlDocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: candidate,
      content: chosen.content,
      updatedAt: Date.now(),
    };
    setDocs((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setIsTemplatesOpen(false);
    setIsFilesDrawerOpen(false);
  };

  const handleDeleteDoc = (id: string) => {
    if (docs.length <= 1) return;
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (id === activeDocId && next.length > 0) {
        setActiveDocId(next[0].id);
      }
      return next;
    });
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = editingDocNameValue.trim();
    if (trimmed) {
      const finalName = trimmed.includes('.') ? trimmed : `${trimmed}.html`;
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, name: finalName } : d)));
    }
    setEditingDocNameId(null);
  };

  const handleExportHtml = () => {
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeDoc?.name || 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const newDoc: HtmlDocumentItem = {
        id: `doc-${Date.now()}`,
        name: file.name || 'imported.html',
        content: text,
        updatedAt: Date.now(),
      };
      setDocs((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setIsFilesDrawerOpen(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedNotice(true);
      window.setTimeout(() => setCopiedNotice(false), 1500);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunNow();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSaveExplicit();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const nextValue = `${code.slice(0, start)}  ${code.slice(end)}`;
      updateActiveDocContent(nextValue);
      window.requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const lineCount = useMemo(() => Math.max(1, code.split('\n').length), [code]);
  const previewTitle = useMemo(() => extractDocumentTitle(runCode), [runCode]);
  const srcDoc = useMemo(
    () => buildRunnerSrcDoc(runCode, channelIdRef.current),
    [runCode]
  );

  const errorCount = useMemo(
    () => consoleLogs.filter((entry) => entry.level === 'error').length,
    [consoleLogs]
  );

  const toolbarBtnClass =
    'h-8 px-2.5 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-[#1f2937] dark:text-[#e5e7eb] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.09] dark:active:bg-white/[0.12]';

  return (
    <div className="w-full flex-1 h-full min-h-0 flex flex-col bg-[#f3f3f3] dark:bg-[#1e1e1e] text-[#111827] dark:text-[#f3f4f6] select-none relative overflow-hidden">
      {/* Top Toolbar */}
      <header className="min-h-[46px] px-2.5 py-1.5 bg-[#f7f7f8] dark:bg-[#252526] border-b border-black/[0.08] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Brand, Active File, Templates & File Actions */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-2 pl-1 pr-2">
            <FluentHtmlWriterIcon className="w-5 h-5 shrink-0" />
            <span className="text-[13.5px] font-semibold tracking-tight hidden sm:inline">
              HTML Writer
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsFilesDrawerOpen((prev) => !prev)}
            className={`h-8 px-2.5 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5 border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#2d2d30] hover:bg-[#fafafa] dark:hover:bg-[#36363a] cursor-pointer max-w-[170px]`}
            title="Switch or manage HTML files"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
            <span className="truncate">{activeDoc?.name || 'index.html'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCreateDoc()}
            className={toolbarBtnClass}
            title="New HTML file"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTemplatesOpen((prev) => !prev)}
              className={toolbarBtnClass}
              title="Starter templates"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0067c0] dark:text-[#4cc2ff]" />
              <span className="hidden lg:inline">Templates</span>
            </button>
            {isTemplatesOpen && (
              <div className="absolute left-0 top-9 z-40 w-56 p-1 rounded-lg bg-white dark:bg-[#2b2b2e] border border-black/10 dark:border-white/10 shadow-xl">
                {STARTER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleCreateDoc(tpl)}
                    className="w-full text-left px-3 py-2 rounded-[5px] text-[12.5px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">{tpl.label}</span>
                    <span className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">{tpl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={handleFormat} className={toolbarBtnClass} title="Format HTML">
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Format</span>
          </button>

          <button
            type="button"
            onClick={handleSaveExplicit}
            className={toolbarBtnClass}
            title="Save (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{savedNotice ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            className={toolbarBtnClass}
            title="Download .html file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Export</span>
          </button>
        </div>

        {/* Right: View Switcher, Auto-run, Console, Run */}
        <div className="flex items-center gap-1.5">
          {/* Segmented View Mode */}
          <div className="flex items-center p-0.5 rounded-[6px] bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.06]">
            {(
              [
                { id: 'code' as LayoutMode, label: 'Code', icon: Code2 },
                { id: 'split' as LayoutMode, label: 'Split', icon: Columns2 },
                { id: 'preview' as LayoutMode, label: 'Preview', icon: Eye },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = layoutMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLayoutMode(tab.id)}
                  title={tab.label}
                  className={`h-7 px-2 rounded-[4px] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#38383c] text-[#111827] dark:text-white shadow-xs'
                      : 'text-[#4b5563] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsConsoleOpen((prev) => !prev)}
            className={`h-8 px-2.5 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isConsoleOpen
                ? 'bg-black/[0.08] dark:bg-white/[0.12] text-[#111827] dark:text-white'
                : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#374151] dark:text-[#d1d5db]'
            }`}
            title="Toggle Console"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Console</span>
            {consoleLogs.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
                  errorCount > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-black/10 dark:bg-white/15 text-[#111827] dark:text-white'
                }`}
              >
                {consoleLogs.length}
              </span>
            )}
          </button>

          <label className="hidden sm:flex items-center gap-1.5 px-2 h-8 rounded-[5px] text-[12px] font-medium hover:bg-black/[0.05] dark:hover:bg-white/[0.07] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="accent-[#0067c0] dark:accent-[#4cc2ff] cursor-pointer"
            />
            <span>Auto-run</span>
          </label>

          <button
            type="button"
            onClick={handleRunNow}
            title="Run HTML (Ctrl+Enter)"
            className="h-8 px-3 rounded-[5px] bg-[#0067c0] hover:bg-[#1975c5] active:bg-[#0058a6] dark:bg-[#4cc2ff] dark:hover:bg-[#60cdff] text-white dark:text-[#001f33] text-[12.5px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run</span>
          </button>
        </div>
      </header>

      {/* Main Body (Optional Sidebar Drawer + Editor / Preview Split) */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Saved Files Side Drawer */}
        {isFilesDrawerOpen && (
          <aside className="w-60 shrink-0 h-full bg-[#f5f5f6] dark:bg-[#252526] border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col z-20">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#9ca3af]">
                Workspace Files
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Import .html file"
                  className="p-1.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilesDrawerOpen(false)}
                  title="Close drawer"
                  className="p-1.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              onChange={handleImportFile}
              className="hidden"
            />

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {docs.map((doc) => {
                const isActive = doc.id === activeDocId;
                const isRenaming = editingDocNameId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[12.5px] transition-colors ${
                      isActive
                        ? 'bg-[#0067c0]/10 dark:bg-[#4cc2ff]/15 text-[#0067c0] dark:text-[#4cc2ff] font-medium'
                        : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={editingDocNameValue}
                        onChange={(e) => setEditingDocNameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(doc.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(doc.id);
                          if (e.key === 'Escape') setEditingDocNameId(null);
                        }}
                        className="flex-1 min-w-0 bg-white dark:bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#0067c0] text-[12px] text-[#111827] dark:text-white focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveDocId(doc.id)}
                        onDoubleClick={() => {
                          setEditingDocNameId(doc.id);
                          setEditingDocNameValue(doc.name);
                        }}
                        className="flex-1 min-w-0 text-left truncate cursor-pointer"
                        title="Click to open, double-click to rename"
                      >
                        {doc.name}
                      </button>
                    )}
                    {docs.length > 1 && !isRenaming && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        title="Delete file"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/15 hover:text-rose-500 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Code + Preview Workspace */}
        <div
          ref={splitContainerRef}
          className="flex-1 min-w-0 h-full flex flex-col"
        >
          <div className="flex-1 min-h-0 flex relative overflow-hidden">
            {/* CODE EDITOR PANE */}
            {layoutMode !== 'preview' && (
              <section
                aria-label="HTML Code Editor"
                style={layoutMode === 'split' ? { width: `${splitPercent}%` } : { width: '100%' }}
                className="h-full min-w-0 flex flex-col bg-white dark:bg-[#1e1e1e] border-r border-black/[0.08] dark:border-white/[0.08]"
              >
                {/* Sub-bar */}
                <div className="h-8 px-3 bg-[#fafafa] dark:bg-[#252526] border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11.5px] text-[#6b7280] dark:text-[#9ca3af] shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#d97706]">HTML5</span>
                    <span>•</span>
                    <span className="tabular-nums">{lineCount} lines</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#374151] dark:text-[#d1d5db] cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedNotice ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Gutter + Textarea */}
                <div className="flex-1 min-h-0 flex relative overflow-hidden font-mono text-[13px] leading-[1.55]">
                  <div
                    ref={gutterRef}
                    aria-hidden="true"
                    className="w-11 py-3 pr-2.5 text-right text-[12px] text-[#9ca3af] dark:text-[#6e7681] bg-[#f8f9fa] dark:bg-[#1e1e1e] border-r border-black/[0.05] dark:border-white/[0.06] overflow-hidden select-none shrink-0 tabular-nums"
                  >
                    {Array.from({ length: lineCount }, (_, idx) => (
                      <div key={idx + 1}>{idx + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => updateActiveDocContent(e.target.value)}
                    onKeyDown={handleEditorKeyDown}
                    onScroll={(e) => {
                      if (gutterRef.current) {
                        gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    aria-label="HTML editor"
                    className="flex-1 w-full h-full p-3 bg-transparent text-[#111827] dark:text-[#d4d4d4] resize-none focus:outline-none overflow-auto select-text whitespace-pre [tab-size:2]"
                  />
                </div>
              </section>
            )}

            {/* DRAGGABLE RESIZER HANDLE */}
            {layoutMode === 'split' && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize editor and preview"
                onPointerDown={() => setIsDraggingSplit(true)}
                className="w-1.5 h-full shrink-0 cursor-col-resize bg-black/[0.04] hover:bg-[#0067c0]/40 dark:bg-white/[0.04] dark:hover:bg-[#4cc2ff]/40 transition-colors"
              />
            )}

            {/* LIVE HTML PREVIEW PANE */}
            {layoutMode !== 'code' && (
              <section
                aria-label="Live HTML Preview"
                style={layoutMode === 'split' ? { width: `${100 - splitPercent}%` } : { width: '100%' }}
                className="h-full min-w-0 flex flex-col bg-[#e8eaed] dark:bg-[#141416]"
              >
                {/* Mini Browser Chrome Bar */}
                <div className="h-8 px-2.5 bg-[#fafafa] dark:bg-[#252526] border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={handleRunNow}
                      title="Reload preview"
                      className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#4b5563] dark:text-[#d1d5db] cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[12px] font-medium text-[#374151] dark:text-[#d1d5db] truncate">
                      {previewTitle}
                    </span>
                  </div>

                  {/* Viewport Width Presets */}
                  <div className="flex items-center gap-0.5">
                    {(
                      [
                        { id: 'desktop' as ViewportPreset, label: 'Desktop width', icon: Laptop },
                        { id: 'tablet' as ViewportPreset, label: 'Tablet (768px)', icon: Tablet },
                        { id: 'mobile' as ViewportPreset, label: 'Mobile (375px)', icon: Smartphone },
                      ] as const
                    ).map((vp) => {
                      const Icon = vp.icon;
                      const active = viewportPreset === vp.id;
                      return (
                        <button
                          key={vp.id}
                          type="button"
                          onClick={() => setViewportPreset(vp.id)}
                          title={vp.label}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            active
                              ? 'bg-black/[0.08] dark:bg-white/[0.12] text-[#0067c0] dark:text-[#4cc2ff]'
                              : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sandboxed Output Container */}
                <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto p-0">
                  <div
                    className={`h-full bg-white shadow-sm transition-all duration-150 ${
                      viewportPreset === 'mobile'
                        ? 'w-[375px] max-w-full my-2 rounded-lg border border-black/15 overflow-hidden'
                        : viewportPreset === 'tablet'
                          ? 'w-[768px] max-w-full my-2 rounded-lg border border-black/15 overflow-hidden'
                          : 'w-full'
                    }`}
                  >
                    <iframe
                      key={runRevision}
                      title={previewTitle}
                      srcDoc={srcDoc}
                      sandbox="allow-scripts allow-modals allow-forms"
                      className={`w-full h-full border-0 bg-white ${
                        isDraggingSplit ? 'pointer-events-none' : ''
                      }`}
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* BOTTOM SANDBOXED CONSOLE DRAWER */}
          {isConsoleOpen && (
            <div className="h-40 shrink-0 bg-[#f9fafb] dark:bg-[#1b1b1d] border-t border-black/[0.1] dark:border-white/[0.1] flex flex-col">
              <div className="h-8 px-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[12px]">
                <span className="font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console Output</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setConsoleLogs([])}
                    className="px-2 py-0.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#4b5563] dark:text-[#9ca3af] cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConsoleOpen(false)}
                    className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-1.5 font-mono text-[12px] space-y-1 select-text">
                {consoleLogs.length === 0 ? (
                  <p className="text-[#6b7280] dark:text-[#9ca3af] py-1">
                    No console messages yet. Use console.log() in your script block to inspect output.
                  </p>
                ) : (
                  consoleLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-2 px-1.5 py-0.5 rounded ${
                        entry.level === 'error'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : entry.level === 'warn'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'text-[#111827] dark:text-[#e5e7eb]'
                      }`}
                    >
                      <span className="text-[11px] text-[#9ca3af] shrink-0 tabular-nums">
                        [{entry.timestamp}]
                      </span>
                      <span className="whitespace-pre-wrap break-all">{entry.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HtmlWriter;
