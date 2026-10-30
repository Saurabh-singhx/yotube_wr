# Generated Standalone Release APK for Vidwr

This folder contains the **Standalone Release APK** for `Vidwr`.
The JavaScript bundle (`index.android.bundle`) and Hermes bytecode are **pre-packaged inside the APK**, allowing it to run completely offline without Metro or any USB/Wi-Fi connection to a development computer.

## Latest Build Information
- **Version:** `v2.0.3` (Build `60` / `versionCode: 60`)
- **App Name:** `Vidwr`
- **Package ID:** `com.saurabh.vidwr`
- **Build Date:** October 30, 2026

## What's New in v2.0.3
- **Module Architecture Standardisation**:
  - Cleaned internal core extension file names (`contentShield.ts`, `autoQualityHD.ts`, `distractionFree.ts`, `sponsorSkipper.ts`, `profileShortcutsScript.ts`).
  - Added local `.gitignore` protection for developer reference mapping (`dev_docs/`).
- **Storage & Identity Sanitization**:
  - Unified `@vidwr_*` local storage namespaces and synchronized extension authorship.
  - Standardized notification media session fallback metadata.
- **Modern Soft Neumorphic Iconography**:
  - High-resolution tactile glyph icon with electric cyan glow and adaptive Android launcher assets.
- **Enhanced Stream Optimization (Content Shield Pro)**:
  - 3-Tier optimization: Data-level payload sanitization, instant cosmetic layout cleaner, and velocity transition skipper.
- **Uncompromised Background Audio Playback**:
  - Native Android `MediaPlaybackService` with notification controls and lockscreen integration.
  - Page Visibility API and Document lifecycle normalization for continuous background audio.
- **Battle-Tested Gesture & Zoom Engine**:
  - Clean two-finger pinch zoom ($0.85\times$ to $3.0\times$) and center double-tap toggle.
  - Zero single-finger touch interference with native in-page controls.

## APK Files
- `Vidwr-v2.0.3.apk`: Standard version-tagged release package.
- `Vidwr.apk`: Latest stable release binary.
- `Vidwr-standalone.apk`: Latest stable offline package.
- `app-release.apk`: Direct build output.

## Installation Instructions
Install directly onto any Android device via ADB:
```bash
adb install -r generated_apk/Vidwr-v2.0.3.apk
```
Or copy `Vidwr-v2.0.3.apk` (or `Vidwr.apk`) to your device storage and tap to install!
