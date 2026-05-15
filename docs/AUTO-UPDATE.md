# Auto-update

Clarity Stream uses [`electron-updater`](https://www.electron.build/auto-update) to deliver updates from this GitHub repo.

## How it works

1. On launch (and every 4 hours after), the app checks `https://github.com/Clarity-Stream-Inc/releases/releases/latest`.
2. It compares the published version against the running version using `latest-mac.yml` / `latest.yml`.
3. If a newer signed build is available, it is downloaded silently in the background.
4. The renderer receives an `update-downloaded` event and shows a non-blocking banner: *"A new version is ready — restart to install."*
5. Clicking **Restart** calls `installUpdate()`, which quits and re-launches into the new version.

## Update feeds

- **macOS:** `latest-mac.yml` — published as a release asset on each tag.
- **Windows:** `latest.yml` — published as a release asset on each tag.

These are generated automatically by the CI workflow.

## Disabling auto-update

Auto-update is on by default and recommended for security. To disable for a single machine:

- **macOS:** `defaults write com.claritystream.desktop autoUpdate -bool false`
- **Windows:** create `%APPDATA%\Clarity Stream\config.json` with `{ "autoUpdate": false }`

Enterprise customers can ship a managed config — contact support@claritystream.io.

## Rollback

If a release is bad, delete or un-publish the GitHub Release. Clients will fall back to the previous `latest-*.yml` on the next check.
