# YouTube_wr ⚡

A high-performance YouTube Web Wrapper built with **React Native**, **Expo SDK 57**, and `react-native-webview`, engineered with a **Soft Neumorphic UI Design System** and an extensible **Userscript Extension Engine**.

---

## ✨ Features

### 🛡️ AdShield Pro (Comprehensive YouTube AdBlocker)
- **Pre-content Network Interceptor:** Intercepts `window.fetch` and `XMLHttpRequest` requests to block Google ad servers, tracking telemetry, and ad formats (`googleads.g.doubleclick.net`, `/pagead/`, `api/stats/ads`, `ptracking`).
- **Player Config Scrubbing:** Intercepts `youtubei/v1/player` responses and strips `adPlacements`, `playerAds`, and `adSlots` directly before the web player initializes them.
- **Cosmetic CSS Filtering:** Injects robust styling rules to hide desktop and mobile ad banners, promoted feed items, and survey popups (`.ytp-ad-module`, `ytd-promoted-sparkles-web-renderer`, `ytd-display-ad-renderer`, `#player-ads`, etc.).
- **Smart HTML5 Player Ad Skipper:** Automatically detects playing ads, mutes them, seeks to the end, clicks skip buttons (`.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern`), and restores volume.
- **Real-time Live Stats:** Tracks ads blocked, network trackers stopped, and estimated time saved.

### 🎨 Neumorphic Design System (Soft UI)
- **Dual Lighting Soft Shadows:** Tactile extruded surfaces, light highlight top-left, depth shadow bottom-right.
- **Dual Themes:** Both **Dark Neumorphism** and **Light Neumorphism** supported with smooth transitions.
- **Tactile Components:**
  - `NeumorphicBox`: Multi-depth elevated/recessed containers.
  - `NeumorphicButton`: Press-in tactile depression with haptic feedback.
  - `NeumorphicSwitch`: Sunken pill track with sliding convex circular knob.
  - `NeumorphicSlider`: Sunken groove track with extruded thumb for speed and volume adjustments.
  - `NeumorphicInput`: Recessed inset fields for URLs, search, and custom scripts.
  - `NeumorphicBadge`: Elevated status pills with glowing indicator dots.

### 🧩 Extensible Plugin / Extension Architecture
- **Unified Two-Way Bridge (`window.__RN_EXTENSION_BRIDGE__`):** Injected web scripts communicate with React Native asynchronously.
- **Dynamic CSS & Script Injection:** Extensions inject styles and scripts matching URL wildcard patterns (`*://*.youtube.com/*`).
- **Pre-installed Extensions:**
  1. **AdShield Pro (`youtube-adblocker`)**: Full network & player ad-blocking.
  2. **Audio & Playback Pro (`youtube-playback-boost`)**: 0.25x - 3.5x playback speed control & Web Audio API volume booster (up to 300%).
  3. **Zen Focus / Distraction-Free (`youtube-distraction-free`)**: Toggle to hide YouTube Shorts, comment sections, related videos, and end screens.
  4. **Sponsor & Intro Skipper (`youtube-sponsorblock`)**: Framework for in-video sponsor skipping.
- **Custom Extension Builder:**
  - Create and test custom extensions directly within the app.
  - Configure name, URL match pattern, custom CSS, and custom JavaScript.
  - Persisted locally with `@react-native-async-storage/async-storage`.

---

## 🏗️ Architecture

```
src/
├── types/
│   └── extension.ts          # Extension manifests, settings, and bridge schemas
├── theme/
│   ├── colors.ts             # Light & Dark Neumorphic color tokens
│   └── neumorphism.ts        # Soft shadow & elevation helpers
├── context/
│   ├── ThemeContext.tsx      # Dark/Light theme state & persistence
│   └── ExtensionContext.tsx  # Extensions registry, settings, stats, & bridge handler
├── core/
│   ├── ExtensionEngine.ts    # Script/CSS compiler & message dispatcher
│   └── extensions/
│       ├── youtubeAdBlocker.ts
│       ├── youtubePlaybackEnhancer.ts
│       ├── youtubeDistractionFree.ts
│       ├── youtubeSponsorBlock.ts
│       └── defaultExtensions.ts
├── components/
│   ├── neumorphic/           # Reusable soft-UI primitive components
│   ├── TopHeader.tsx         # Navigation bar & URL/Search bar
│   ├── BottomDock.tsx        # Floating action dock
│   ├── ExtensionsModal.tsx   # Extension store & stats sheet
│   ├── CustomExtensionModal.tsx # Userscript & CSS editor
│   └── PlaybackControlsModal.tsx # Speed & Audio Gain modal
└── utils/
    └── haptics.ts            # Cross-platform haptic feedback triggers
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo CLI

### Run Dev Server
```bash
npx expo start
```

### Verification & Diagnostic Commands
```bash
npx expo lint        # Linting (passed with 0 errors)
npx tsc --noEmit     # TypeScript typecheck (passed with 0 errors)
npx expo-doctor      # Dependency & configuration check (21/21 passed)
```
