/**
 * Renderer-side bridge. Exposes a tiny, typed surface as `window.clarityDesktop`.
 * Never expose ipcRenderer or Node APIs directly.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clarityDesktop', {
  isDesktop: true,
  notify: (payload) => ipcRenderer.invoke('clarity:notify', payload),
  setRecentAlerts: (alerts) => ipcRenderer.invoke('clarity:set-recent-alerts', alerts),
  setBadgeCount: (count) => ipcRenderer.invoke('clarity:set-badge', count),
  saveSession: (json) => ipcRenderer.invoke('clarity:session-save', json),
  loadSession: () => ipcRenderer.invoke('clarity:session-load'),
  clearSession: () => ipcRenderer.invoke('clarity:session-clear'),
  openExternal: (url) => ipcRenderer.invoke('clarity:open-external', url),
  getAppInfo: () => ipcRenderer.invoke('clarity:get-app-info'),
  installUpdate: () => ipcRenderer.invoke('clarity:install-update'),
  onNavigate: (cb) => {
    const handler = (_e, path) => cb(path);
    ipcRenderer.on('clarity:navigate', handler);
    return () => ipcRenderer.removeListener('clarity:navigate', handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_e, info) => cb(info);
    ipcRenderer.on('clarity:update-downloaded', handler);
    return () => ipcRenderer.removeListener('clarity:update-downloaded', handler);
  },
});
