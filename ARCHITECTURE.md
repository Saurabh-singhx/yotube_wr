# YouTube_wr — Architecture & Technical Design Document

> **Document Version:** 1.3.0  
> **Status:** Active / Living Document  
> **Last Updated:** October 2026  
> **Maintainer:** YouTube_wr Engineering Team  

---

## 1. Executive Summary & Philosophy

`YouTube_wr` is a modern mobile YouTube client designed to combine the flexibility of YouTube's web platform with native mobile enhancements:
1. **Uncompromised Ad & Tracker Blocking:** Complete removal of video pre-roll/mid-roll ads, sponsored feed banners, search ads, and Google telemetry without black screen stalls or playback freezes.
2. **Pluggable Extension Architecture:** A modular, Userscript-inspired extension engine that allows both pre-compiled and user-defined scripts/styles to run seamlessly in the web sandbox.
3. **Tactile Neumorphic (Soft UI) Interface:** A cohesive visual design language employing dual-light elevation, concave pressed states, and spring-driven controls that deliver a unique tactile feel.
4. **Resilience to YouTube Web Changes:** By separating UI customization, script injection, and native controls into decoupled layers, upstream YouTube DOM updates can be accommodated simply by updating extension rules rather than rebuilding the entire native binary.

---

## 2. Technology Stack — What We Used & Why

| Component | Technology | Rationale & Alternatives Considered |
| :--- | :--- | :--- |
| **Framework** | **Expo SDK 57 / React Native 0.86** | Provides high-performance Continuous Native Generation (CNG), cross-platform mobile rendering, and access to modern native hardware APIs (Haptics, Status Bar, Safe Area) without Xcode/Android Studio manual configuration overhead. |
| **Language** | **TypeScript 5.x / 6.x (Strict)** | Guarantees type safety across extension manifests, setting schemas, bridge events, and neumorphic style contracts. |
| **Browser Engine** | **`react-native-webview` (v13.x)** | Chosen over building a custom Chromium/Gecko fork (which would add ~150MB to app size and face severe App Store rejections) and over native video players (which frequently break when YouTube alters stream cipher signatures). WebViews receive native platform hardware acceleration (`androidLayerType="hardware"`), full HTML5 video support, and two-way script injection capabilities. |
| **Design Language** | **Neumorphism (Soft UI)** | Chosen over standard Material or Flat design to provide an elevated, modern tactile experience suited for audio/video media controls (e.g., sunken inputs, extruded knobs, tactile haptic toggles). |
| **Storage Engine** | **`@react-native-async-storage`** | Lightweight, key-value asynchronous storage without native database dependencies (SQLite/Realm), ideal for saving extension manifests, user configurations, theme preferences, and ad-blocking statistics. |
| **Haptics** | **`expo-haptics`** | Provides tactile feedback on button presses, search actions, and switch toggles, enhancing the neumorphic physical feel. |

---

## 3. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Native Application Layer                   │
│                                                                        │
│   ┌───────────────────────┐  ┌─────────────────────────────────────┐  │
│   │   TopHeader (Nav/Logo)│  │   BottomDock (Home, Search, Zen)    │  │
│   └───────────┬───────────┘  └──────────────────┬──────────────────┘  │
│               │                                 │                      │
│   ┌───────────▼─────────────────────────────────▼──────────────────┐  │
│   │        ExtensionContext & ThemeContext State Manager            │  │
│   │   • Extension Registry  • Settings  • AdBlock Stats  • Theme    │  │
│   └───────────┬─────────────────────────────────┬──────────────────┘  │
│               │                                 │                      │
│   ┌───────────▼───────────┐         ┌───────────▼──────────────────┐  │
│   │    ExtensionEngine    │         │  AsyncStorage Persistence    │  │
│   │  • Script Compiler    │         │  • Enabled extensions        │  │
│   │  • CSS Builder        │         │  • Custom userscripts        │  │
│   │  • Bridge Dispatcher  │         │  • Live blocking statistics  │  │
│   └───────────┬───────────┘         └──────────────────────────────┘  │
└───────────────┼────────────────────────────────────────────────────────┘
                │ Injected Scripts & CSS / PostMessage Bridge
┌───────────────▼────────────────────────────────────────────────────────┐
│                      WebView Execution Sandbox                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  Document Start: window.__RN_EXTENSION_BRIDGE__                │   │
│   │  • Clean window environment without fetch monkey-patching      │   │
│   │  • Early documentElement theme attribute & cookie injection    │   │
│   │  • Pre-seeded HD player quality local storage                  │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │  DOM / Content Ready: Style & Script Runner                    │   │
│   │  • Non-destructive CSS rules (<style id="__rn_extension_styles__">)│
│   │  • Bulletproof Video Ad Skipper (Fast-forward, skip, unmute)   │   │
│   │  • Auto HD Max Resolution Enforcer (Quality locking engine)    │   │
│   │  • Zen Focus (Shorts & comments blocker)                       │   │
│   │  • SPA Hook: Re-apply on 'yt-navigate-finish' & MutationObserver│
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Layer AdBlocker & Black Screen Resolution

### Root Cause Analysis of the "Black Screen" Stall

Through deep debugging across YouTube's web client and leading adblock mechanisms (`uBlockOrigin/uAssets`, `TheRealJoelmatic/RemoveAdblockThing`, `0x48piraj/fadblock`), the infamous YouTube ad blocker "black screen" was identified as being caused by three fatal flaws:

1. **Monkey-Patching `fetch()` and `XMLHttpRequest` with Compressed Payloads:**
   * *Problem:* Previous adblock implementations monkey-patched `window.fetch` to intercept `youtubei/v1/player`. When inspecting and reconstructing the response via `new Response(JSON.stringify(data), { headers: response.headers })`, the original `content-encoding: gzip` or `br` header remained in place. The browser's native networking layer attempted decompression on uncompressed text, failing with `net::ERR_CONTENT_DECODING_FAILED`. As a result, the video player never received valid streaming URLs and stalled on a pitch black box.
   * *Solution:* Leave native `window.fetch` completely untouched. Never manipulate `/youtubei/v1/player` HTTP streams.
2. **CSS Over-blocking (`.video-ads`, `[id^="ad_"]`, `.ytp-ad-module`):**
   * *Problem:* `.video-ads` and `.ytp-ad-module` are integral containers inside YouTube's HTML5 video player that house the video element and the skip button overlay. Setting `display: none !important` on them conceals the video frame itself, creating a black hole while the ad audio plays in the background, and hides the skip button so it can never be clicked.
   * *Solution:* Never apply `display: none` to `.video-ads` or video player modules. Target only out-of-player cosmetic elements (e.g. `ytd-promoted-sparkles-web-renderer`, `ytd-display-ad-renderer`, `#masthead-ad`).
3. **Buffer Stalls from Artificially Seeking `video.currentTime`:**
   * *Problem:* Jumping directly to `video.duration - 0.05` causes the HTML5 media player to enter an unbuffered wait state when the trailing chunks are not pre-fetched, locking the player in a spinning loader or black screen.
   * *Solution:* Implement a **Fast-Forward & Skip Engine** running at 50ms intervals:
     - Detects ad status via `.ad-showing`, `.ad-interrupting`, `.ytp-ad-badge` (strictly visible), or skip button presence.
     - Immediately mutes ad audio.
     - Automatically clicks all skip buttons (`.ytp-ad-skip-button`, `.ytp-ad-skip-button-modern`, etc.) and calls `player.skipAd()`.
     - Sets `video.playbackRate = 16.0` and invokes `video.play()` so any unskippable bumpers elapse in under 200ms without buffering stalls.
     - Guardrail: Only skips short bumper ads (`duration < 120s`), ensuring regular video duration is never truncated.
     - Instantly restores original `playbackRate` (1.0x), volume, and unmuted status as soon as the ad concludes.

---

## 5. Video Playback Continuity & Auto High Quality (Auto HD)

### The "Video Restart on In-Page Modals" Bug Resolved
* **The Root Cause:**
  When a user opens YouTube in-page dialogs (e.g., Settings, Quality, Playback Speed, Comments, Share, or Description), YouTube mobile web calls `history.pushState(null, '', '#...')`.
  `onNavigationStateChange` in `react-native-webview` captured this new URL and passed it to `setCurrentUrl(navState.url)`. Because the `<WebView source={{ uri: currentUrl }}>` prop was bound directly to this state variable, React Native updated the `source` prop, causing Android's `RNCWebViewManager` to call native `view.loadUrl(newUrl)`. This forced a full webpage reload and restarted the video from `0:00`.
* **The Architecture Fix:**
  1. `<WebView source={webViewSource}>` now references a memoized object that only changes on deliberate top-level user actions (Home button, Search submission, or Desktop Mode toggle).
  2. `currentUrl` is updated strictly for UI tracking (e.g., Search Modal pre-fill) and is completely decoupled from the WebView's active `source` prop.
  3. `injectedStartScript` and `injectedEndScript` are memoized on `[extensions, isDark]` rather than `currentUrl`, eliminating script re-evaluations during in-page navigation.

### Always High Quality (Auto HD) Extension (`src/core/extensions/youtubeAutoHD.ts`)
* Automatically detects the highest available resolution for the current video:
  - Queries `player.getAvailableQualityLevels()` (e.g. `['hd2160', 'hd1440', 'hd1080', 'hd720', ...]`).
  - Automatically identifies the maximum resolution and invokes `player.setPlaybackQualityRange(maxLevel, maxLevel)` and `player.setPlaybackQuality(maxLevel)`.
  - Debounced retry logic runs up to 8 checks on video start/navigation, then enters idle mode to prevent repeated stream rebuffering.
  - Pre-seeds YouTube's `localStorage` with `{ "data": "highres" }` on document start.

---

## 6. UI/UX & Neumorphic Architecture

### Stable View Hierarchy & Gesture Responsiveness
In previous implementations, `NeumorphicBox` toggled between a dual-view hierarchy when `elevated` and a single-view hierarchy when `pressed`. When a user touched a `NeumorphicButton`, React Native's gesture responder tree changed dynamically mid-touch, causing the `Pressable` to cancel the active gesture and silently drop `onPress`.

**The Solution:**
1. `NeumorphicBox` maintains a strictly identical 2-View hierarchy (`lightShadowWrapper` -> `container`) across both `elevated` and `pressed` states.
2. `StyleSheet.flatten` extracts outer layout properties (`margin`, `flex`, `width`, `height`, `zIndex`) for the outer shadow wrapper, while inner surface properties (`padding`, `alignItems`, `justifyContent`, `backgroundColor`, `borderRadius`, `borderWidth`) are assigned to the inner container.
3. If fixed dimensions (`width: 38, height: 38` or `46x46`) or `flex: 1` are passed, the inner container automatically expands to 100% with centered alignment, eliminating off-center clipping and misalignments.
4. Generous `hitSlop` (`top: 8, bottom: 8, left: 8, right: 8`) guarantees immediate responsiveness on mobile touch screens.

### Streamlined Navigation Layout
* **Top Header (`src/components/TopHeader.tsx`):**
  - Removed clunky search bar from top to maximize web view real estate.
  - Multi-layer navigation fallback: executes both native `webViewRef.current.goBack()` and in-page `window.history.back()` to reliably support YouTube Single Page Application (SPA) routing.
  - Quick access to Protection Overview and Dark/Light theme toggle.
* **Bottom Dock (`src/components/BottomDock.tsx`):**
  - High-depth floating pill housing 5 evenly-spaced 46x46 circular tactile buttons:
    1. **Home:** Instant return to YouTube home feed.
    2. **Search:** Opens the Neumorphic Search Modal.
    3. **Zen Focus:** Distraction-free mode toggle (Shorts, comments, recommendations).
    4. **Desktop / Mobile:** Switches User-Agent between desktop and mobile formats.
    5. **Extensions Hub:** Displays active badge count; opens extensions manager and custom script builder.
* **Search Modal (`src/components/SearchModal.tsx`):**
  - Features quick topic chips (`Trending`, `Music`, `Gaming`, `Podcasts`, `Lofi Chill`, `Tech Reviews`).
  - Supports search queries and direct URL navigation with `KeyboardAvoidingView`.

---

## 7. Dark Mode Synchronization Architecture

YouTube Web does not automatically respond to React Native app theme switches without direct integration. The application implements a multi-tier theme synchronizer:

1. **Root Attribute Injection (`document_start` & `document_end`):**
   * Forces `dark="true"` on `<html>` and `<body>`, which YouTube's Polymer/Web components rely on to activate dark design tokens (`--yt-spec-base-background`, `--yt-spec-text-primary`).
   * Explicitly sets `document.documentElement.style.colorScheme = 'dark'`.
2. **Cookie State Persistence:**
   * Sets `document.cookie = "PREF=f6=400; domain=.youtube.com; path=/; max-age=31536000"` so YouTube's server-rendered HTML responds with dark theme tokens immediately upon navigation.
3. **MutationObserver Guardian:**
   * YouTube's client-side SPA scripts periodically reset attributes on `<html>`. A lightweight `MutationObserver` on `document.documentElement` monitors the `dark` attribute and immediately re-applies it if YouTube attempts to remove it.
4. **Instant Dynamic Theme Toggle (`ExtensionEngine.getThemeToggleScript`):**
   * When the user taps the theme button in `TopHeader`, React Native executes an in-page script that toggles `dark` attributes, swaps `__rn_theme_style__` CSS variables, and fires a `yt-navigate-finish` event. YouTube transitions instantly between Dark and Light mode without a page reload.

---

## 8. How to Add New Extensions in the Future

### Method A: Adding Built-in Extensions (In Code)

1. **Create the extension file** in `src/core/extensions/`:
   ```typescript
   // src/core/extensions/youtubeMyFeature.ts
   import { ExtensionManifest } from '../../types/extension';

   export const youtubeMyFeature: ExtensionManifest = {
     id: 'youtube-my-feature',
     name: 'My New Feature',
     description: 'Does something useful on YouTube',
     version: '1.0.0',
     author: 'Your Name',
     icon: 'sparkles',
     category: 'enhancement',
     enabled: true,
     urlMatches: ['*://*.youtube.com/*'],
     runAt: 'document_end',
     injectedCSS: (settings) => `/* Custom CSS */`,
     injectedJSEnd: (settings) => `
       (function() {
         console.log('Feature active!');
       })();
     `,
   };
   ```

2. **Register the extension** in `src/core/extensions/defaultExtensions.ts`:
   ```typescript
   import { youtubeMyFeature } from './youtubeMyFeature';

   export const DEFAULT_EXTENSIONS: ExtensionManifest[] = [
     youtubeAdBlocker,
     youtubeAutoHD,
     youtubeDistractionFree,
     youtubeSponsorBlock,
     youtubeMyFeature, // <-- Add here
   ];
   ```

3. **Verify with commands**:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```

---

### Method B: Adding Custom Extensions (In App at Runtime)

1. Open the app and tap the **Extensions (`🧩`)** button in the bottom dock.
2. Tap **`+ Add Custom`**.
3. Fill in:
   - **Name:** e.g. "Auto High Quality"
   - **URL Match Pattern:** `*://*.youtube.com/*`
   - **Custom CSS:** (Optional CSS overrides)
   - **Custom JavaScript:** Code to execute in the web context with access to `window.__RN_EXTENSION_BRIDGE__`.
4. Tap **Save & Install**. The script is immediately compiled, persisted to `AsyncStorage`, and executed on matching pages.

---

## 9. Quality Verification Checklist

Before releasing updates or adding new dependencies, run:
```bash
npx expo lint        # 0 errors, 0 warnings
npx tsc --noEmit     # TypeScript typecheck
npx expo-doctor      # 21/21 checks passed
```
