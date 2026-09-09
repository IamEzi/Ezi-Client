# GitHub Actions macOS Build

This project can build the Ezi Client macOS installer on GitHub's macOS runner, so a Windows PC does not need to build macOS locally.

## 1. Upload the project to GitHub

Push the contents of this folder to the Ezi Client repository. Make sure these files are included:

- `main.js`
- `package.json`
- `logo.png` (if used by the project)
- `.github/workflows/build-macos.yml`

## 2. Start a build manually

Open the repository on GitHub:

**Actions → Build Ezi Client for macOS → Run workflow**

After it finishes, open the workflow run and download:

`Ezi-Client-1.0.0-macOS-universal`

The artifact contains the DMG and ZIP.

## 3. Build automatically when releasing

Create and push a version tag such as:

```text
v1.0.0
```

The workflow will build the macOS DMG/ZIP and attach them to the GitHub Release.

## Important

This workflow creates an unsigned/unnotarized build unless Apple signing credentials are configured. For public distribution, Apple Developer ID signing and notarization are recommended.
