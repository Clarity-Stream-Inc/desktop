# Installing on Windows

1. Download **`ClarityStream-Setup.exe`** from the [latest release](https://github.com/Clarity-Stream-Inc/desktop/releases/latest).
2. Double-click the installer.
3. Follow the prompts. The app installs to `%LOCALAPPDATA%\Programs\Clarity Stream` by default.
4. Launch Clarity Stream from the Start menu.

## SmartScreen

The installer is signed with a code-signing certificate issued to **Clarity Stream Inc**. Until enough installs build SmartScreen reputation, you may see a *"Windows protected your PC"* warning.

To proceed:
1. Click **More info**
2. Confirm the publisher reads **Clarity Stream Inc**
3. Click **Run anyway**

## Verifying the signature

Right-click `ClarityStream-Setup.exe` → **Properties → Digital Signatures** tab.
Signer name should be **Clarity Stream Inc**, with a valid timestamp.

Or via PowerShell:
```powershell
Get-AuthenticodeSignature .\ClarityStream-Setup.exe | Format-List
```

## Uninstalling

**Settings → Apps → Installed apps → Clarity Stream → Uninstall**.
