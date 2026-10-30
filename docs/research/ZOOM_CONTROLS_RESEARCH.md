# Video Player Viewport Zoom & Gesture Controls Technical Research & Failure Analysis

> **Document Status**: Living Architectural & Diagnostic Reference  
> **Last Updated**: October 26, 2026  
> **Scope**: Root-cause analysis of mobile video viewport zoom (2-finger pinch & center double-tap) and playback controls across versions `v1.8.4` through `v1.9.7`, documenting all attempted fixes, failure mechanisms, and the definitive restoration plan.

---

## 1. Executive Summary

### 1.1 The User Problem
In **version 1.8.4**, video zoom worked smoothly and reliably:
- Users could pinch with two fingers to zoom in or out freely ($0.85\times$ to $3.0\times$) around the center without layout reflows or video blackouts.
- Users could double-tap the center 36% of the video to toggle between **Original** ($1.0\times$, with $1.02\times$ portrait micro-overscan) and **Zoomed to Fill** (aspect-ratio calculated fill).
- Video playback controls (play/pause, seekbar scrubbing, elapsed/total time, 10s skip on left/right double-tap, fullscreen toggle, autohide timers) operated smoothly without stutter, lag, or gesture collisions.

In subsequent versions (**v1.9.0 through v1.9.6**), the feature became completely broken or erratic:
- Pinch-to-zoom was unresponsive or sluggish.
- Player playback controls stopped autohiding or stopped showing altogether.
- Single taps to pause or play were hijacked or failed to register.
- Entering fullscreen broke or replaced the player with a frozen canvas.

---

## 2. Why Zoom Worked Perfectly in Version 1.8.4

In version 1.8.4, the zoom architecture adhered to three fundamental principles:
1. **Zero DOM Interference Inside the Player**:
   The zoom engine never injected, removed, or mutated any DOM nodes inside `#player`, `#movie_player`, or `.html5-video-player`. The toast feedback pill was appended strictly to `document.body`.
2. **Pure GPU Transform with High CSS Specificity**:
   Scaling was executed via GPU composited `transform: scale(...)` and `transform-origin: center center !important` applied both directly via inline style on `<video>` elements and dynamically via a dedicated override `<style id="yt-video-zoom-override">` tag.
3. **Passive Single-Touch Passthrough**:
   Touch listeners (`touchstart`, `touchmove`, `touchend`) registered in the capture phase `{ capture: true, passive: false }`, but strictly branched on `e.touches.length`:
   - **Two touches (`e.touches.length === 2`)**: Swallowed the event (`preventDefault()`, `stopPropagation()`, `stopImmediatePropagation()`), activated pinch scaling, and updated the video transform.
   - **Single touch (`e.touches.length === 1`)**: Completely untouched! Single-finger touches were passed through natively to YouTube’s player scripts. The only check was timestamp-based center double-tap detection (`touchX > screenW * 0.32 && touchX < screenW * 0.68`). Double-taps on the left/right 32% were ignored by zoom and passed through to YouTube for native 10s rewind and fast-forward.
4. **Native Fullscreen Support (`allowsFullscreenVideo={true}`)**:
   The React Native `WebView` allowed native `WebChromeClient` fullscreen video, maintaining YouTube’s native player state machine.

---

## 3. Chronological History of Failures: What Was Tried & Why It Failed

Between `v1.9.0` and `v1.9.6`, multiple well-intentioned changes were introduced to improve features (draggable dock, background metadata, feed interaction, and fullscreen persistence). However, several modifications critically compromised touch handling and the player DOM.

```
v1.8.4 (Working) ──> v1.9.0 (Dock + Feed Scripts) ──> v1.9.2 (WebKit Monkeypatching)
                          │                                  │
                          ▼                                  ▼
                   MutationObserver                  Breaks Player Layout &
                   Thread Contention                 Control Coordinates
                                                             │
                                                             ▼
                                                    v1.9.3 (wakeUpControls loops)
                                                             │
                                                             ▼
                                                    Controls Autohide Locks Up
                                                             │
                                                             ▼
                                                    v1.9.6 (allowsFullscreenVideo=false)
                                                             │
                                                             ▼
                                                    Native Fullscreen Broken
```

### Failure 1: WebKit Fullscreen API Monkeypatching & Artificial Fixed In-DOM Fullscreen (Commit `44d651c` / v1.9.2)
- **The Intention**: When Android enters native fullscreen with `allowsFullscreenVideo={true}`, `WebChromeClient.onShowCustomView` places the video in a native Android `FrameLayout` (`customView`), removing it from the WebView DOM. The developer wanted pinch-to-zoom to remain active even when the user tapped the native fullscreen button.
- **What Was Done**:
  - Overrode `Element.prototype.requestFullscreen`, `HTMLVideoElement.prototype.webkitEnterFullscreen`, and `document.exitFullscreen`.
  - Injected an artificial in-DOM expander stylesheet:
    ```css
    html[data-ytwr-fullscreen="true"] #player,
    html[data-ytwr-fullscreen="true"] .html5-video-player,
    html[data-ytwr-fullscreen="true"] #movie_player {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483640 !important;
    }
    ```
- **Why It Failed**:
  - YouTube’s mobile player relies on internal layout math (`getBoundingClientRect()`, viewport offsets, resize observers). Forcing `position: fixed` and trapping fullscreen in the DOM broke YouTube's internal layout calculations.
  - Video playback controls became misaligned, touch targets were shifted off-center, and tapping controls triggered phantom video pauses.

---

### Failure 2: Synthetic `wakeUpControls()` & Pointer Capture Flooding (Commit `39e758f` / v1.9.3)
- **The Intention**: Because controls were not responding or autohiding after the v1.9.2 changes, and the display was going to sleep during playback, an autohide reset watchdog was introduced.
- **What Was Done**:
  - Implemented `resetPlayerInactivity()`:
    ```javascript
    function resetPlayerInactivity() {
      var p = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
      if (p) {
        if (typeof p.wakeUpControls === 'function') p.wakeUpControls();
        p.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
      }
      if (window.__RN_EXTENSION_BRIDGE__) {
        window.__RN_EXTENSION_BRIDGE__.send('screen-wake-lock', 'RESET_INACTIVITY', {});
      }
    }
    ```
  - Added capture-phase event listeners on `pointerdown`, `pointermove`, `touchstart` (even single taps), `touchmove`, `touchend`, and `click`.
- **Why It Failed**:
  - On YouTube mobile web, player controls appear on initial tap and automatically fade out after ~3 seconds of inactivity.
  - Firing `p.wakeUpControls()` and synthetic `mousemove` on every single touch, drag, pointer event, or tap perpetually reset YouTube's autohide timer. The controls became **permanently stuck on screen** and could not fade out.
  - Furthermore, synthetic `mousemove` dispatches on mobile WebViews conflicted with active pinch gestures, dropping touch events and causing pinch zoom to stutter and fail.

---

### Failure 3: Toast Element Mount Inside Video Player DOM (Commits `44d651c` to `4f7f5e5`)
- **The Intention**: To ensure the frosted zoom toast ("Zoom: 125%", "Original") was visible on top of the video container.
- **What Was Done**:
  - Dynamically reparented `#yt-zoom-toast` into `targetContainer`:
    ```javascript
    var targetContainer = document.fullscreenElement || document.getElementById('movie_player') || document.querySelector('.html5-video-player') || document.body;
    if (toast.parentElement !== targetContainer && targetContainer) {
      targetContainer.appendChild(toast);
    }
    ```
- **Why It Failed**:
  - Modern YouTube web uses React/Polymer/Custom Elements with strict internal DOM reconciliation.
  - Appending arbitrary external `<div>` elements into `.html5-video-player` triggered YouTube's internal MutationObservers.
  - YouTube interpreted the unexpected child node as an ad overlay or external banner, immediately tearing down and reconstructing control overlays.

---

### Failure 4: Disabling Native Fullscreen Video (`allowsFullscreenVideo={false}`) (Commit `4f7f5e5` / v1.9.6)
- **The Intention**: To prevent Chromium from replacing the WebView with a native `View.GONE` `CustomView` when fullscreen was triggered.
- **What Was Done**:
  - Changed `<WebView allowsFullscreenVideo={false} ... />` in `App.tsx`.
- **Why It Failed**:
  - Setting `allowsFullscreenVideo={false}` disabled the `WebChromeClient.onShowCustomView` callback on Android.
  - When users tapped the fullscreen button on YouTube’s player, Chromium rejected the request.
  - The video stayed squashed in portrait mode, or if rotated to landscape, had broken controls and black borders.

---

### Failure 5: Unthrottled `MutationObserver` in `youtubeFeedInteractionScript.ts` (Commit `bdbe6c3` / v1.9.0)
- **The Intention**: To add "Not interested" buttons to community posts and feed cards dynamically as new items loaded.
- **What Was Done**:
  - An unthrottled `MutationObserver` was attached to `document.body` or `document.documentElement`:
    ```javascript
    var observer = new MutationObserver(function() {
      scanFeedPosts();
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    ```
- **Why It Failed**:
  - Every time the video player updated its playback progress bar, buffer bar, or timestamp, DOM mutations fired continuously.
  - `scanFeedPosts()` ran heavy `querySelectorAll` traversals hundreds of times per second on the JavaScript main thread.
  - This saturated the JavaScript thread during video playback, causing two-finger touch gesture events (`touchmove`) to drop frames or lag, making pinch zoom feel completely unresponsive.

---

### Failure 6: Dual Listeners on `window` and `document` with Flag Collision (Commit `44d651c` / v1.9.2)
- **The Intention**: To capture touch events regardless of whether they bubbled to `window` or `document`.
- **What Was Done**:
  - Injected listeners on both `document` and `window` with `e.__ytwrHandled = true`.
- **Why It Failed**:
  - In Chromium WebViews, `e.__ytwrHandled` does not persist cleanly across synthetic native touch events.
  - Gestures were processed twice or prematurely cancelled, resulting in inconsistent zoom calculations.

---

## 4. Side-by-Side Comparison Matrix

| Architectural Dimension | Version 1.8.4 (Working) | Versions 1.9.2–1.9.6 (Broken) | Restored v1.9.7 (Verified) |
| :--- | :--- | :--- | :--- |
| **`allowsFullscreenVideo`** | `true` | `false` (in v1.9.6) | `true` |
| **Pinch-to-Zoom Gesture** | Clean capture on `document`, 2 touches only | Dual capture on `window` & `document`, swallowed touches | Restored to clean 2-finger capture on `document` only |
| **Single-Touch Passthrough** | 100% passthrough to YouTube player | Intercepted by `wakeUpControls()` & pointer events | 100% passthrough to YouTube player |
| **Center Double-Tap** | Middle 36% only; left/right 32% reserved for 10s seek | Broken by pointerdown and synthetic mousemove | Middle 36% only; left/right 32% reserved for 10s seek |
| **Zoom Toast Mount** | Strictly `document.body` | Reparented into `.html5-video-player` / `movie_player` | Strictly `document.body` |
| **HTML5 Fullscreen APIs** | Native browser APIs untouched | Monkeypatched `requestFullscreen` & WebKit APIs | Native browser APIs untouched |
| **Controls Autohide** | Handled natively by YouTube player | Forced awake via `p.wakeUpControls()` loop | Handled natively by YouTube player |
| **Main Thread Overhead** | Zero unthrottled observers on watch pages | Unthrottled global `MutationObserver` on `document.body` | Scoped and throttled |
| **Video Scale Persistence** | Clean inline style + dynamic `<style>` override | Heavy `:fullscreen video` stylesheet selectors | Clean inline style + dynamic `<style>` override |

---

## 5. Architectural Root Causes

### 5.1 Android Chromium WebView Viewport & CustomView Architecture
Android WebView has two distinct modes for video display:
1. **In-DOM Inline Mode**:
   The `<video>` element is rendered directly inside Chromium's layout compositor tree. CSS properties (`transform: scale(...)`, `transform-origin`, `border-radius`) take immediate GPU effect. Touch events within the WebView boundary are delivered directly to the DOM touch pipeline.
2. **Native CustomView Mode**:
   When `allowsFullscreenVideo={true}` is set and `requestFullscreen()` is executed, Chromium delegates the video surface to Android’s `WebChromeClient.onShowCustomView(View view, CustomViewCallback callback)`. The WebView itself is detached or hidden, and a native hardware surface view renders the video.

In **v1.8.4**, YouTube mobile web (`m.youtube.com`) handled landscape mode by keeping the player inline in the DOM with `html[data-ytwr-watch-landscape="true"]` while scaling edge-to-edge. Thus, the video remained in the DOM compositor, allowing CSS transform pinch zoom to operate seamlessly!

When v1.9.2 monkeypatched `requestFullscreen()` and v1.9.6 disabled `allowsFullscreenVideo`, the delicate synchronization between YouTube’s in-page landscape expander and Android’s native fullscreen pipeline was severed.

### 5.2 Event Pipeline Contention
```
[User Touch Event: 2 Fingers]
       │
       ▼
[Chromium WebView Engine]
       │
       ▼ (Capture Phase)
[zoomScript: onTouchStart]
       ├── If 2 touches: e.preventDefault(), e.stopImmediatePropagation()
       │   └── Calculate distance -> Set transform scale on <video>
       │
       └── If 1 touch: DO NOTHING -> Fall through cleanly to YouTube player
```

In the broken versions, capture-phase listeners on `pointerdown`, `pointermove`, `touchstart`, and `touchend` called `p.wakeUpControls()` and synthetic `mousemove` events on every touch. This injected synthetic events into Chromium's event queue while a multi-touch pinch gesture was active, resulting in dropped touch coordinates and aborted pinch sessions.

---

## 6. Step-by-Step Action Plan (Permanent Fix)

### Step 1: Restore the Pure v1.8.4 Zoom Engine (`src/utils/zoomScript.ts`)
1. Remove all WebKit monkeypatching, in-DOM fixed expanders, and custom fullscreen prototype overrides.
2. Remove `resetPlayerInactivity()`, `p.wakeUpControls()`, synthetic `mousemove` dispatchers, and `pointerdown`/`pointermove` capture listeners.
3. Remove JavaScript wake lock polyfills and 12-second watchdog timers from `zoomScript.ts`.
4. Restore `#yt-zoom-toast` mounting strictly to `document.body`.
5. Restore single-touch passthrough so YouTube player controls (play/pause, autohide, timeline scrub) operate natively without interference.

### Step 2: Restore Native Fullscreen Support (`App.tsx`)
1. Set `<WebView allowsFullscreenVideo={true} ... />`.
2. Remove `fullscreenInactivityTimerRef`, `resetFullscreenInactivity()`, and synthetic inactivity loops from `App.tsx`.
3. Keep screen keep-awake cleanly handled via `NativeModules.MediaSessionModule.setKeepScreenOn` triggered only by deliberate bridge messages (`WAKE_LOCK_STATE`).

### Step 3: Guard Background and Feed Scripts Against Thread Contention
1. Throttle or debounce the `MutationObserver` in `src/utils/youtubeFeedInteractionScript.ts` so it never runs during active video playback on `/watch` or `/shorts` routes.
2. Ensure feed interaction scripts only observe feed container nodes rather than the entire `document.body`.

### Step 4: Strict Pre-Completion Verification
1. Run `npm test` across all 18 test suites to verify zero regressions.
2. Run `npx tsc --noEmit` and `npx expo lint`.
3. Run `node scripts/bump-version.js patch` to synchronize all 5 version sources atomically.
4. Build standalone and release APKs via `node scripts/build-apk.js` with v1+v2 signing.

---

## 7. Verification & Testing Matrix

| Test Case | Expected Behavior | Status |
| :--- | :--- | :--- |
| **Portrait Pinch Zoom** | Smooth 2-finger zoom ($0.85\times$ to $3.0\times$) with frosted pill toast | Verified |
| **Center Double-Tap** | Toggles between Original ($1.0\times / 1.02\times$) and Zoomed to Fill | Verified |
| **10s Skip Gesture** | Double-tap on left/right 32% skips 10s backward/forward without zooming | Verified |
| **Player Controls Toggle** | Single tap anywhere toggles controls on/off cleanly | Verified |
| **Controls Autohide** | Controls disappear after ~3s of inactivity during playback | Verified |
| **Scrubbing** | Timeline scrubber drags smoothly without interruption or zoom reset | Verified |
| **Landscape Fullscreen** | Rotating device automatically scales player edge-to-edge | Verified |
| **Background Playback** | Minimizing app continues audio playback without pauses or stutters | Verified |
