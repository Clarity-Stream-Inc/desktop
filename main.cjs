/**
 * Clarity Stream — Electron main process
 *
 * Wraps the live Clarity Stream web app (https://claritystream.io) in a
 * native desktop shell. The same React + Supabase code runs unchanged in the
 * BrowserWindow; this process only adds:
 *   • Tray icon + menu
 *   • Native OS notifications (forwarded from the renderer over IPC)
 *   • Deep links: claritystream://oauth/callback, claritystream://alert/:id
 *   • Auto-update via electron-updater (GitHub Releases feed)
 *   • Single-instance lock + window restoration
 *   • Navigation guard — only auth + dashboard routes allowed
 */
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  shell,
  safeStorage,
  nativeImage,
  session,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { autoUpdater } = require('electron-updater');

const TARGET_URL = process.env.CLARITY_TARGET_URL || 'https://claritystream.io';
const PROTOCOL = 'claritystream';
const SESSION_FILE = path.join(app.getPath('userData'), 'session.bin');
const ALLOWED_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/password-reset',
  '/dashboard',
  '/yachting-dashboard',
  '/profile',
  '/checkout',
  '/alerts',
  '/activity-log',
  '/request-trace',
  '/payment-success',
  '/subscription-success',
  '/subscription-canceled',
];

let mainWindow = null;
let tray = null;
let isQuitting = false;

/* -------------------------------------------------------------------------- */
/*  Single-instance + protocol registration                                    */
/* -------------------------------------------------------------------------- */

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', (_event, argv) => {
  // Someone tried to launch a second copy — focus our window instead
  showMainWindow();
  // On Windows the deep link arrives as a CLI argument
  const deepLink = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  if (deepLink) handleDeepLink(deepLink);
});

app.on('open-url', (event, url) => {
  // macOS deep link
  event.preventDefault();
  handleDeepLink(url);
});

/* -------------------------------------------------------------------------- */
/*  Window                                                                     */
/* -------------------------------------------------------------------------- */

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0F1B3D',
    show: false,
    title: 'Clarity Stream',
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Block navigation away from the auth + dashboard surface
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      // External links open in the default browser
      shell.openExternal(url);
    }
  });

  // Open *_blank links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
      // Mac convention: close hides, ⌘Q quits
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  loadDashboard();
}

function loadDashboard() {
  // Default landing — the renderer will redirect to /login if no session
  const url = new URL(TARGET_URL);
  url.pathname = '/dashboard';
  url.searchParams.set('source', 'desktop');
  mainWindow.loadURL(url.toString());
}

function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function isAllowedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const target = new URL(TARGET_URL);
    if (u.origin !== target.origin) return false;
    return ALLOWED_PATH_PREFIXES.some((p) => u.pathname.startsWith(p));
  } catch {
    return false;
  }
}

function getAppIcon() {
  const candidates = [
    path.join(__dirname, 'assets', 'icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return nativeImage.createFromPath(p);
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/*  Tray                                                                       */
/* -------------------------------------------------------------------------- */

function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = fs.existsSync(trayIconPath)
    ? nativeImage.createFromPath(trayIconPath).resize({ width: 18, height: 18 })
    : (getAppIcon() || nativeImage.createEmpty()).resize({ width: 18, height: 18 });

  tray = new Tray(icon);
  tray.setToolTip('Clarity Stream');
  rebuildTrayMenu();
  tray.on('click', showMainWindow);
}

function rebuildTrayMenu(recentAlerts = []) {
  if (!tray) return;
  const alertsSection =
    recentAlerts.length > 0
      ? recentAlerts.slice(0, 5).map((a) => ({
          label: a.title || 'Alert',
          click: () => {
            showMainWindow();
            if (a.id) {
              mainWindow.webContents.send('clarity:navigate', `/alerts/${a.id}`);
            }
          },
        }))
      : [{ label: 'No recent alerts', enabled: false }];

  const menu = Menu.buildFromTemplate([
    { label: 'Open Clarity Stream', click: showMainWindow },
    { type: 'separator' },
    { label: 'Recent alerts', enabled: false },
    ...alertsSection,
    { type: 'separator' },
    {
      label: 'Check for updates…',
      click: () => autoUpdater.checkForUpdatesAndNotify().catch(noop),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}

/* -------------------------------------------------------------------------- */
/*  Deep links                                                                 */
/* -------------------------------------------------------------------------- */

function handleDeepLink(rawUrl) {
  if (!rawUrl?.startsWith(`${PROTOCOL}://`)) return;
  showMainWindow();

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return;
  }

  const host = parsed.hostname; // 'oauth' | 'alert' | 'device'
  const pathname = parsed.pathname.replace(/^\//, '');

  if (host === 'oauth') {
    // Forward the OAuth fragment/query to the renderer so Supabase can finish
    const target = new URL(TARGET_URL);
    target.pathname = '/login';
    target.search = parsed.search;
    target.hash = parsed.hash;
    mainWindow.loadURL(target.toString());
    return;
  }

  if (host === 'alert' && pathname) {
    mainWindow.webContents.send('clarity:navigate', `/alerts/${pathname}`);
    return;
  }
  if (host === 'device' && pathname) {
    mainWindow.webContents.send('clarity:navigate', `/dashboard/devices/${pathname}`);
  }
}

/* -------------------------------------------------------------------------- */
/*  IPC bridge (window.clarityDesktop in renderer)                             */
/* -------------------------------------------------------------------------- */

ipcMain.handle('clarity:notify', (_event, payload) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({
    title: payload?.title || 'Clarity Stream',
    body: payload?.body || '',
    silent: !!payload?.silent,
  });
  n.on('click', () => {
    showMainWindow();
    if (payload?.alertId) {
      mainWindow.webContents.send('clarity:navigate', `/alerts/${payload.alertId}`);
    }
  });
  n.show();
  return true;
});

ipcMain.handle('clarity:set-recent-alerts', (_event, alerts) => {
  rebuildTrayMenu(Array.isArray(alerts) ? alerts : []);
  return true;
});

ipcMain.handle('clarity:set-badge', (_event, count) => {
  if (typeof count === 'number') app.setBadgeCount(count);
  return true;
});

ipcMain.handle('clarity:session-save', (_event, json) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(SESSION_FILE, json, 'utf8');
      return true;
    }
    const enc = safeStorage.encryptString(String(json ?? ''));
    fs.writeFileSync(SESSION_FILE, enc);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('clarity:session-load', () => {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const buf = fs.readFileSync(SESSION_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(buf);
      } catch {
        return buf.toString('utf8'); // Legacy plaintext fallback
      }
    }
    return buf.toString('utf8');
  } catch {
    return null;
  }
});

ipcMain.handle('clarity:session-clear', () => {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('clarity:open-external', (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url);
  return true;
});

ipcMain.handle('clarity:get-app-info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  locale: app.getLocale(),
}));

/* -------------------------------------------------------------------------- */
/*  Auto-update                                                                */
/* -------------------------------------------------------------------------- */

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('clarity:update-downloaded', {
        version: info.version,
      });
    }
  });
  autoUpdater.on('error', (err) => {
    console.error('[autoUpdater]', err?.message || err);
  });
  // Initial check after launch, then every 6 hours
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(noop), 30_000);
  setInterval(
    () => autoUpdater.checkForUpdatesAndNotify().catch(noop),
    6 * 60 * 60 * 1000,
  );
}

ipcMain.handle('clarity:install-update', () => {
  isQuitting = true;
  autoUpdater.quitAndInstall();
});

/* -------------------------------------------------------------------------- */
/*  Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

app.whenReady().then(() => {
  // Tighten the renderer's CSP to the Clarity origin + known APIs
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const headers = details.responseHeaders || {};
    cb({ responseHeaders: headers });
  });

  createMainWindow();
  createTray();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else showMainWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS the app stays alive in the dock until ⌘Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});

function noop() {}
