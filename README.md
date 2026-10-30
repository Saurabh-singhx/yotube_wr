# Vidwr ⚡

An open-source, privacy-first mobile media browser built with **React Native**, **Expo SDK 57**, and `react-native-webview`, engineered with a **Soft Neumorphic UI Design System** and an extensible **Userscript Extension Engine**.

> **Legal Disclosure**: Vidwr is an independent, open-source software project. It is not affiliated with, authorized, maintained, sponsored, or endorsed by Google LLC, YouTube, Reddit Inc., X Corp., Twitch Interactive, Meta Platforms, or any of their subsidiaries. See [LEGAL.md](LEGAL.md) or [docs/LEGAL.md](docs/LEGAL.md) for full legal disclosures.

---

## 📚 Documentation Index

All in-depth research, architectural schematics, and design documents have been organized into the [`/docs`](docs/) directory:

- 🏗️ **[System Architecture](docs/ARCHITECTURE.md)**: Deep-dive into native React Native, Android Foreground Service, Hermes AOT compilation, and WebView sandbox subsystems.
- ⚖️ **[Legal Information & Terms](docs/LEGAL.md)**: Non-affiliation declaration, fair use protections, and user agent autonomy.
- 📜 **[Changelog](docs/CHANGELOG.md)**: Detailed version history and semantic release notes.
- 🔬 **Engineering Research Reports**:
  - **[Stream Optimization & Telemetry Sanitization](docs/research/STREAM_OPTIMIZATION_RESEARCH.md)**: 3-Tier content filtering, InnerTube response sanitization, and 150ms debounce lock.
  - **[Media Background Playback Architecture](docs/research/BACKGROUND_PLAYBACK_RESEARCH.md)**: Android OS minimization phases, Chromium C++ lifecycle spoofing, and AudioFocus synchronization.
  - **[Viewport Zoom & Gesture Controls](docs/research/ZOOM_CONTROLS_RESEARCH.md)**: GPU hardware transforms, two-finger pinch zoom, double-tap fill, and touch passthrough mechanics.

---

## ✨ Features

### 🛡️ Content Shield Pro (Media Optimization & Layout Cleaner)
- **Pre-content Interceptor:** Sanitizes incoming JSON telemetry and cleans media player payloads (`youtubei/v1/player`) to prevent unnecessary bandwidth consumption and background network stalls.
- **Cosmetic CSS Filtering:** Injects robust styling rules to hide disruptive feed items, surveys, and intrusive promo banners.
- **Velocity Presentation Handler:** Smoothly accelerates promotional segments with real-time statistics.
- **Live Efficiency Stats:** Tracks blocked trackers and estimated data saved.

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

### 🌐 Multi-Platform WebApps Hub
- Seamless integration with web platforms including Reddit, X, Twitch, Instagram, SoundCloud, and custom web URLs.
- Desktop Mode toggle for full desktop layouts on demand.

### 🧩 Extensible Plugin / Extension Architecture
- **Unified Two-Way Bridge (`window.__RN_EXTENSION_BRIDGE__`):** Injected web scripts communicate with React Native asynchronously.
- **Dynamic CSS & Script Injection:** Extensions inject styles and scripts matching wildcard patterns.
- **Pre-installed Extensions:**
  1. **Content Shield Pro (`youtube-adblocker`)**: Content layout and telemetry cleaner.
  2. **Auto HD Quality Lock (`youtube-autohd`)**: Crisp resolution lock across viewports.
  3. **Zen Focus (`youtube-distraction-free`)**: Toggle to hide distracting algorithmic feeds, shorts shelves, and comments.
  4. **SponsorBlock (`youtube-sponsorblock`)**: Community-driven in-video sponsor skipping.
- **Custom Extension Builder:**
  - Create and test custom extensions directly within the app.
  - Configure name, URL match pattern, custom CSS, and custom JavaScript.
  - Persisted locally with `@react-native-async-storage/async-storage`.

---

## 🏗️ Codebase Structure

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
│       ├── contentShield.ts
│       ├── autoQualityHD.ts
│       ├── distractionFree.ts
│       ├── sponsorSkipper.ts
│       └── defaultExtensions.ts
├── components/
│   ├── neumorphic/           # Reusable soft-UI primitive components
│   ├── BottomDock.tsx        # Floating tactile navigation dock
│   ├── ExtensionsModal.tsx   # Extension store & stats sheet
│   ├── CustomExtensionModal.tsx # Userscript & CSS editor
│   ├── SearchModal.tsx       # Multi-platform WebApps Hub & Search
│   └── SettingsModal.tsx     # Unified preferences & tools modal
└── utils/
    ├── haptics.ts            # Tactile haptic feedback triggers
    ├── mediaSessionScript.ts # Background playback & media session bridge
    └── zoomScript.ts         # Multi-touch GPU pinch zoom engine
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
npm test             # Unit & integration test suite (17 passed)
```
