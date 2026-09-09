# Ezi Client 1.0.0

A custom desktop client for **Kirka**, built with Electron and focused on performance, customization, and a clean user experience.

**Author / Owner:** IamEzi  
**Version:** 1.0.0  
**Status:** Closed-source / Proprietary

---

## Features

### 🎨 Player Color Changer
Customize the appearance of player skins with separate color controls:

- Head Color
- Body Color
- Apply Player Color
- Works with 64×64 player skin textures
- Selected colors are saved locally

### ⚡ Performance

Ezi Client includes performance-focused options designed to provide a smoother Kirka experience:

- Performance Mode
- GPU acceleration optimizations
- GPU rasterization
- Zero-copy rendering
- High-performance GPU preference
- Reduced background throttling
- Reduced renderer backgrounding
- Chromium performance flags

#### Uncapped FPS

- Optional Uncapped FPS mode
- **OFF by default**
- Uses Chromium frame-rate options when enabled
- Changing the Uncapped FPS setting restarts the client so the setting can be applied correctly

### 📊 FPS Monitor

Optional FPS monitoring for checking game performance.

**Shortcut:** `Alt + P`

### 🔎 Profiler

Optional lightweight performance profiler.

It can display:

- Frame timing information
- JavaScript memory information when available

**Shortcut:** `Alt + O`

### 🖥️ Interface

The client menu is designed to stay fixed and centered.

- Fixed menu position
- Non-draggable interface
- Hide Chat
- Hide Interface
- Ezi theme
- Dark theme
- Light theme
- Glass theme

### 📜 Userscripts

Built-in userscript support allows custom JavaScript to run after Kirka loads.

Supported features include:

- `.js` userscripts
- `@name`
- `@match`
- `@run-at`
- `GM_addStyle`
- `GM_getValue`
- `GM_setValue`

Userscripts can be:

- Enabled or disabled
- Loaded from a selected folder
- Reloaded without rebuilding the client
- Opened directly from the client

### 🛠️ General Tools

Ezi Client also provides:

- Fullscreen
- Reload Kirka
- Developer Tools
- Keyboard shortcuts
- Discord community button

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Right Shift` | Open / close Ezi Client menu |
| `F5` | Reload Kirka |
| `F12` | Open Developer Tools |
| `Alt + P` | Toggle FPS Monitor |
| `Alt + O` | Toggle Profiler |

---

## Default Settings

| Setting | Default |
|---|---|
| Performance Mode | ON |
| Uncapped FPS | OFF |
| FPS Monitor | OFF |
| Profiler | OFF |
| Userscripts | ON |
| Menu Position | Fixed / Centered |
| Menu Theme | Ezi |
| Head Color | `#f2c29b` |
| Body Color | `#3b82f6` |

---

## Installation

1. Download the latest Ezi Client release.
2. Extract the downloaded archive if required.
3. Run **Ezi Client**.
4. Launch Kirka through the client.
5. Open the client menu with `Right Shift`.

For userscripts, select your userscript folder from the **Userscripts** tab.

---

## Userscripts

To use a userscript:

1. Create or obtain a `.js` userscript.
2. Put it inside your userscript folder.
3. Open **Ezi Client → Userscripts**.
4. Select the folder.
5. Make sure userscripts are enabled.
6. Reload Kirka.

Userscripts run locally through the client and are separate from the main Ezi Client interface.

---

## Closed-Source Project

Ezi Client is proprietary and closed-source software.

The source code, compiled binaries, graphical assets, branding, interface design, and other original materials remain the property of **IamEzi**, except for third-party components that are covered by their own licenses.

Do not copy, modify, repackage, redistribute, sell, or publish modified versions of Ezi Client without permission.

See the included `LICENSE` file for the full terms.

---

## Disclaimer

Ezi Client is an independent third-party client and is **not an official Kirka product**.

Kirka and its related trademarks belong to their respective owners.

---

## Credits

**Ezi Client 1.0.0**  
Created and maintained by **IamEzi**

---

© 2026 IamEzi — All Rights Reserved.
