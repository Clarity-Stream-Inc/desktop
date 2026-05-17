# Clarity Stream — Desktop App

Native macOS + Windows wrapper around the live Clarity Stream dashboard. Reuses the existing React + Supabase code unchanged — this folder only contains the Electron shell, native bridges, and packaging config.

## What's here

```
desktop/
├── main.cjs        Electron main process (window, tray, deep links, auto-update, IPC)
├── preload.cjs     contextBridge exposing window.clarityDesktop to the renderer
├── package.json    Electron + packager dependencies (separate from web app)
├── assets/icon.png Brand icon (1024×1024)
└── README.md       this file
```

The web app stays at `claritystream.io` — the desktop shell loads it directly and locks navigation to auth + dashboard routes. No separate Vite build is required for v1.

## Local development

```bash
cd desktop
npm install            # one-time, ~150 MB
npm start              # launches against https://claritystream.io
npm run start:local    # launches against http://localhost:8080 (your dev server)
```

## Native features wired up

| Feature | API in renderer |
|---|---|
| OS notifications | `window.clarityDesktop.notify({ title, body, alertId })` |
| Tray "recent alerts" menu | `window.clarityDesktop.setRecentAlerts([{id, title}])` |
| Dock/taskbar badge count | `window.clarityDesktop.setBadgeCount(n)` |
| Encrypted session (Keychain / DPAPI) | `saveSession / loadSession / clearSession` |
| Deep links (`claritystream://`) | `onNavigate(path => …)` |
| Open external URL in browser | `openExternal(url)` |
| Auto-update install prompt | `onUpdateDownloaded` + `installUpdate()` |

A renderer-side hook will be added in `src/integrations/desktop/` in the next iteration to wire `NotificationContext` and Supabase auth into these bridges automatically.

## Building distributable installers

Building requires real OS runners (you can't sign macOS apps from Linux):

```bash
# macOS (run on a Mac with Xcode CLT installed)
APPLE_SIGN_IDENTITY="Developer ID Application: Your Co (TEAMID)" \
APPLE_ID="you@example.com" \
APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
APPLE_TEAM_ID="TEAMID" \
npm run pack:mac

# Windows (run on Windows with signtool available)
npm run pack:win

# Linux (optional)
npm run pack:linux
```

Output lands in `desktop/release/`.

## Required certificates (you provide)

| Cert | Where to buy | Yearly cost | What it removes |
|---|---|---|---|
| Apple Developer ID | developer.apple.com | $99 | macOS Gatekeeper warning |
| Windows OV/EV code-sign | Sectigo, DigiCert, SSL.com | $200–400 | SmartScreen warning |

Add the cert credentials as GitHub Actions secrets (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_SIGN_IDENTITY`, `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`) — the release workflow will pick them up.

## What's still TODO (next iteration)

- [ ] `src/integrations/desktop/` renderer bridge (auto-detect, wire NotificationContext, Supabase storage adapter)
- [ ] Supabase tables: `desktop_devices`, `app_releases`
- [ ] Edge function: `register-desktop-device`
- [ ] `/download` page on marketing site (auto-detects OS)
- [ ] `.github/workflows/desktop-release.yml` (build + sign + publish to GitHub Releases on tag `desktop-v*`)
- [ ] `.icns` (macOS) and `.ico` (Windows) variants of the icon
