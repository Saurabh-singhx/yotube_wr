# Changelog

All notable changes to the **Vidwr** application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.3] - 2026-10-30

### Changed
- **Module Architecture Standardisation**: Cleaned internal core extension file names (`contentShield.ts`, `autoQualityHD.ts`, `distractionFree.ts`, `sponsorSkipper.ts`, `profileShortcutsScript.ts`).
- **Developer Documentation Security**: Added local `.gitignore` protection for internal development mapping references (`dev_docs/`).
- **Backward Compatibility Aliases**: Maintained backward-compatible runtime export aliases across all core userscript modules.

---

## [2.0.2] - 2026-10-30

### Changed
- **Storage Namespace Sanitization**: Standardized internal AsyncStorage keys to `@vidwr_*` schema for isolated persistence.
- **Media Session Metadata**: Standardized notification media metadata fallback identifiers across Web SPA navigation.
- **Extension Authorship**: Synchronized unified `Vidwr Core Team` metadata across all built-in extension manifests.

---

## [2.0.1] - 2026-10-30

### Changed
- **Documentation Architecture**: Reorganized research, legal, and architecture documentation into an organized `/docs` hierarchy (`/docs/architecture`, `/docs/research`, `/docs/LEGAL.md`).
- **UI Label Refinement**: Streamlined in-app extension and search labels (`Items Filtered`, `Telemetry Shielded`, `Search Web & Video`).
- **Performance Optimizations**: Enhanced media observer debouncing and script injection efficiency.

---

## [2.0.0] - 2026-10-30

### Added
- **Neumorphic Visual Identity**: Designed and integrated a custom Soft Neumorphic glyph icon and adaptive asset suite (obsidian squircle, dual-shadow tactile lighting, and electric cyan accent glow).
- **Core Architecture Modernization**: Fully decoupled client-side userscript compiler and modern multi-platform web browsing engine.
- **Legal & User-Agent Compliance**: Integrated formal non-affiliation disclosures and client-side DOM rendering autonomy statements in `LEGAL.md`.

---

## [1.1.0] - 2026-10-06

### Added
- **Auto-Fullscreen on Landscape Rotation**: Rotating the device into landscape orientation while viewing or playing any video automatically triggers in-player fullscreen. Rotating back to portrait restores normal view.
- **Auto-Shrinking Bottom Navigation Dock**: The bottom navigation dock automatically shrinks to an animated compact floating icon during video playback and expands on pause/stop.
- **Native `AppState` Background Bridge**: Integrated React Native `AppState` to dynamically inform WebView of background/active transitions, eliminating false pause triggers.
- **Dynamic In-App Version Display**: Settings modal footer dynamically displays app version and build number from centralized configuration.
- **Automated Versioning System**: Added automated version bump scripts to keep `package.json`, `app.json`, `build.gradle`, and `version.ts` in sync.

### Fixed
- **Background Playback Pause Loop**: Resolved issue where minimizing, reopening, and minimizing the app would trigger an automated 1000ms pause ↔ play oscillation.
- **Swipe-to-Home False Pause**: Refined gesture tracking to distinguish between navigation bar swipes and actual player pause button taps.
- **Speedmaster 2x Icon on Zoom**: Suppressed in-page 2x speedmaster overlay icon, bezel, and accidental 2x locks during two-finger pinch-to-zoom gestures.
- **Home Screen Redundant Navigation Bar**: Hidden redundant mobile bottom pivot bars and adjusted scroll clearance.
- **Transition Volume Spikes**: Fixed volume leveling by respecting normalized loudness APIs during transitions.
- **First-Install Glitches**: Prevented white background flash on cold boot with dark style injection.

---

## [1.0.0] - 2026-10-05

### Initial Release
- Hardware-accelerated mobile player with custom extension engine.
- Background playback with Android MediaSession notification and lockscreen controls.
- Pure GPU transform 2-finger pinch-to-zoom with center double-tap toggle.
- Built-in Content Shield stream acceleration and cosmetic banner cleaner.
- Auto-HD resolution selector and community sponsor skipper integration.
- Floating Picture-in-Picture (PiP) miniplayer and WebApps Hub.
- Distraction-Free Zen mode and Dark/Light theme synchronization.
