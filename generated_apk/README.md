# Generated Standalone Release APK for YouTube_wr

This folder contains the **Standalone Release APK** for `YouTube_wr`.
The JavaScript bundle (`index.android.bundle`) and Hermes bytecode are **pre-packaged inside the APK**, allowing it to run completely offline without Metro or any USB/Wi-Fi connection to a development computer.

## Latest Build Information
- **Version:** `v1.5.6` (Build `27` / `versionCode: 27`)
- **Build Date:** October 8, 2026
- **SHA-256 Checksum:** `3188a7e93cbb1cddc145ca53387735b9106f3d7d7e977ede813cca4388204313`

## Built-in Features
- **Official Custom Logo (`logo/logo.png`)**: Applied as the app launcher icon, adaptive icon, splash screen, and in-app header branding.
- **Offline / Standalone Ready**: `index.android.bundle` is embedded directly into APK assets with Hermes AOT bytecode.
- **Enhanced AdShield Pro**:
  - **Tier 1 (Safe Data Neutralization)**: Deletes ad payloads at `document_start` across `ytInitialPlayerResponse`, `Response.prototype.json`, and `JSON.parse` to prevent player schema validation crashes.
  - **Tier 2 (Cosmetic Shielding)**: CSS suppression hides ad overlays, badges, and skip buttons instantly before DOM render.
  - **Tier 3 (Velocity Skipper & Debounce Lock)**: 16x accelerated ad skipping with a 150ms Exit Debounce Lock to eliminate audio pops and flickering between sequential ads.
- **Instant Video Playback Accelerator**:
  - Eliminates 300ms touch-to-click mobile delay on thumbnails and buttons (`touch-action: manipulation`).
  - Pre-warms DNS and preconnects to Google video and image CDNs (`googlevideo.com`, `i.ytimg.com`, `yt3.ggpht.com`).
  - Kicks cued thumbnail overlays immediately on navigation so videos start playing without delay.
- **Background Playback & Native Media Controls**:
  - Direct native execution bypasses background WebView bridge suspension.
  - Full transport controls in notification drawer and lock screen: Play/Pause, Rewind 10s, Fast-Forward 10s, Next Track, Previous Track.
  - Back button minimization: Keeps background playback alive without killing the app.
- **Multi-Platform WebApps Hub & Instagram Shield**:
  - High-DPI 1080p video profile spoofing (`ig_pr=3`, `ig_vw=1080`, `ig_vh=1920`).
  - Fluid reel vertical scrolling and gesture handling without viewport zoom destruction.
  - Non-colliding floating dock button to keep external webapp navigation unobstructed.
  - Optional Desktop Mode toggle with desktop User-Agent.
- **Auto HD Quality Lock**: Enforces 1080p / 4K resolution across mobile and desktop player containers without interfering with startup buffering.
- **Zen Mode (Distraction-Free)**: Suppresses Shorts shelves, comment sections, related suggestions, and end screens.
- **Fullscreen & Screen Zoom Customization**: 16:9 Fit, Zoom to Fill, Stretch, fine-tuned stepper, and isolated 2-finger zoom gestures.

## APK Files
- `YouTube_wr-v1.5.6-b27.apk` (76.01 MB): Version and build-tagged release binary.
- `YouTube_wr-v1.5.6.apk` (76.01 MB): Version-tagged release binary.
- `YouTube_wr.apk` (76.01 MB): Latest stable release binary.
- `app-release.apk` (76.01 MB): Direct release binary.

## Installation Instructions
Install directly onto any Android phone:
```bash
adb install -r generated_apk/YouTube_wr-v1.5.6.apk
```
Or copy `YouTube_wr-v1.5.6.apk` (or `YouTube_wr.apk`) to your phone storage and tap to install!
