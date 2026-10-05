# Changelog

All notable changes to the **YouTube_wr** application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-06

### Added
- **Auto-Fullscreen on Landscape Rotation**: Rotating the device into landscape orientation while viewing or playing any video automatically triggers in-player fullscreen. Rotating back to portrait restores normal view.
- **Auto-Shrinking Bottom Navigation Dock**: The bottom navigation dock automatically shrinks to an animated compact floating icon during video playback and expands on pause/stop.
- **Native `AppState` Background Bridge**: Integrated React Native `AppState` to dynamically inform WebView of background/active transitions, eliminating false pause triggers.
- **Dynamic In-App Version Display**: Settings modal footer dynamically displays app version and build number from centralized configuration.
- **Automated Versioning System**: Added `npm run version:bump` and `npm run build:apk` scripts to keep `package.json`, `app.json`, `build.gradle`, and `version.ts` in sync.

### Fixed
- **Background Playback Pause Loop**: Resolved issue where minimizing, reopening, and minimizing the app would trigger an automated 1000ms pause ↔ play oscillation.
- **Swipe-to-Home False Pause**: Refined gesture tracking to distinguish between navigation bar swipes and actual player pause button taps.
- **Speedmaster 2x Icon on Zoom**: Completely suppressed YouTube's 2x speedmaster overlay icon, bezel, and accidental 2x locks during two-finger pinch-to-zoom gestures.
- **Home Screen Duplicate Pivot Bar**: Hidden redundant mobile YouTube `<ytm-pivot-bar-renderer>` navigation bar and adjusted scroll padding.
- **Mid-Video Volume Spikes**: Fixed volume leveling by respecting YouTube's normalized loudness API during transitions.
- **First-Install Glitches**: Prevented white background flash on cold boot with dark style injection and auto-dismissed consent prompts.

---

## [1.0.0] - 2026-10-05

### Initial Release
- Hardware-accelerated YouTube mobile player with custom extension engine.
- Background playback with Android MediaSession notification and lockscreen controls.
- Pure GPU transform 2-finger pinch-to-zoom with center double-tap toggle.
- Built-in AdShield Pro high-speed ad skipper and banner blocker.
- Auto-HD resolution selector and SponsorBlock integration.
- Floating Picture-in-Picture (PiP) miniplayer and WebApps Hub.
- Distraction-Free Zen mode and Dark/Light theme synchronization.
