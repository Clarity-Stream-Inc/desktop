# Clarity Stream — Desktop Releases

Public distribution repository for the **Clarity Stream** desktop application (macOS + Windows).

This repo holds the signed, notarized installers and the auto-update metadata that the in-app updater reads. The application source code lives in the private Clarity Stream monorepo — only release artifacts are published here.

🌐 Web app: https://claritystream.io
📦 Latest release: https://github.com/Clarity-Stream-Inc/releases/releases/latest

---

## Download

| Platform | File | Notes |
|---|---|---|
| macOS (Apple Silicon + Intel) | `ClarityStream.dmg` | Signed with Apple Developer ID, notarized by Apple |
| Windows 10/11 (x64) | `ClarityStream-Setup.exe` | Signed with OV/EV code-signing certificate |

The dashboard's sidebar **"Get Mac App / Get Windows App"** button auto-detects your OS and downloads the correct installer from the latest release.

---

## System requirements

- **macOS** 11 Big Sur or later (universal binary — Apple Silicon and Intel)
- **Windows** 10 (1809+) or Windows 11, x64
- 200 MB disk space, 4 GB RAM
- Internet connection (the app loads the live `claritystream.io` dashboard)

---

## Repository structure

```
.
├── README.md                       you are here
├── SECURITY.md                     vulnerability disclosure policy
├── CHANGELOG.md                    human-readable release notes
├── .github/
│   └── workflows/
│       └── desktop-release.yml     CI: builds, signs, notarizes, publishes on tag push
├── docs/
│   ├── INSTALL-MACOS.md            install + Gatekeeper guidance
│   ├── INSTALL-WINDOWS.md          install + SmartScreen guidance
│   └── AUTO-UPDATE.md              how the in-app updater works
└── latest/                         (optional) static mirror for non-GitHub clients
    ├── latest-mac.yml              electron-updater feed (macOS)
    └── latest.yml                  electron-updater feed (Windows)
```

> Installers themselves are **not** committed to git. They are uploaded as **GitHub Release assets** by the CI workflow when a `desktop-v*` tag is pushed.

---

## Release process (maintainers)

1. Bump `version` in `desktop/package.json` in the main app repo.
2. Tag the commit:
   ```bash
   git tag desktop-v1.0.0
   git push origin desktop-v1.0.0
   ```
3. The `desktop-release.yml` workflow will:
   - Build the macOS universal `.dmg` on a `macos-latest` runner
   - Sign and notarize it with Apple credentials (GitHub Secrets)
   - Build the Windows `.exe` installer on a `windows-latest` runner
   - Sign it with the OV/EV code-signing certificate
   - Generate `latest-mac.yml` / `latest.yml` for `electron-updater`
   - Create a GitHub Release in **this repo** and upload all assets

### Required GitHub Secrets (in this repo's Settings → Secrets → Actions)

| Secret | Purpose |
|---|---|
| `APPLE_ID` | Apple ID email used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | 10-character Apple Developer Team ID |
| `APPLE_SIGN_IDENTITY` | e.g. `Developer ID Application: Clarity Stream Inc (TEAMID)` |
| `MAC_CERT_P12_BASE64` | Base64-encoded `.p12` of the Developer ID cert |
| `MAC_CERT_PASSWORD` | Password for the `.p12` |
| `WIN_CERT_PFX_BASE64` | Base64-encoded `.pfx` of the Windows code-signing cert |
| `WIN_CERT_PASSWORD` | Password for the `.pfx` |
| `GH_RELEASE_TOKEN` | PAT with `contents:write` on this repo |

---

## Verifying a download

**macOS** — verify notarization:
```bash
spctl --assess --type execute --verbose /Applications/Clarity\ Stream.app
codesign --verify --deep --strict --verbose=2 /Applications/Clarity\ Stream.app
```

**Windows** — right-click the `.exe` → **Properties → Digital Signatures**. The signer should read **Clarity Stream Inc**.

SHA-256 checksums for every asset are listed in the GitHub Release body.

---

## Security

Found a vulnerability? See [`SECURITY.md`](./SECURITY.md). Please **do not** open a public issue for security reports.

---

## License

The Clarity Stream desktop application is proprietary software. © Clarity Stream Inc. All rights reserved. Use is governed by the [Terms of Service](https://claritystream.io/terms) and [End User License Agreement](https://claritystream.io/eula).
