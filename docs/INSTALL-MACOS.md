# Installing on macOS

1. Download **`ClarityStream.dmg`** from the [latest release](https://github.com/Clarity-Stream-Inc/desktop/releases/latest).
2. Double-click the `.dmg` to mount it.
3. Drag **Clarity Stream** into your **Applications** folder.
4. Eject the `.dmg`.
5. Launch Clarity Stream from Launchpad or `/Applications`.

## First launch

The app is signed with an Apple Developer ID and notarized by Apple, so Gatekeeper should open it without warnings.

If you see *"Clarity Stream cannot be opened because the developer cannot be verified"*:
1. Open **System Settings → Privacy & Security**
2. Scroll to the bottom and click **Open Anyway** next to the Clarity Stream notice.

## Verifying the signature

```bash
spctl --assess --type execute --verbose /Applications/Clarity\ Stream.app
codesign --verify --deep --strict --verbose=2 /Applications/Clarity\ Stream.app
```

Expected: `accepted` and `source=Notarized Developer ID`.

## Uninstalling

Drag **Clarity Stream** from `/Applications` to the Trash. Optional cleanup:
```bash
rm -rf ~/Library/Application\ Support/Clarity\ Stream
rm -rf ~/Library/Caches/com.claritystream.desktop
```
