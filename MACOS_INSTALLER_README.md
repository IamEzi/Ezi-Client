# Ezi Client 1.0.0 — macOS Installer

This package is prepared for direct macOS distribution.

## What users receive

- `Ezi-Client-1.0.0-universal.dmg` — recommended installer
- Universal app supports Intel and Apple Silicon Macs.
- The DMG opens with Ezi Client and an Applications shortcut for drag-and-drop installation.

## Build on a Mac

Requirements:
- macOS 12 or newer
- Node.js/npm
- Internet connection for the first `npm install`

Run:

```bash
chmod +x build-mac.sh
./build-mac.sh
```

Or:

```bash
npm install
npm run build:mac:universal
```

The finished files are placed in `dist/`.

## Important for public release

For the smoothest Gatekeeper experience, sign the application with an Apple Developer ID Application certificate and notarize the release. electron-builder can use the signing credentials available in the Mac keychain/environment.

Without signing/notarization, macOS may show a security warning when a user opens a downloaded app.
