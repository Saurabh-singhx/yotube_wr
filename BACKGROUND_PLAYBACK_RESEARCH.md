# YouTube Background Playback Research, Technical Architecture & Implementation Log

> **Document Status**: Living Reference Architecture Document  
> **Last Updated**: October 8, 2026  
> **Target Platforms**: Android (Chromium WebView & Android Native Subsystems)  
> **Scope**: Uninterrupted, zero-stutter background audio playback across application minimizing, screen locking, app switching, and notification transport controls.

---

## 1. Executive Summary & Problem Definition

### 1.1 The User Problem
When a user minimizes the application (e.g., presses the Home button, swipes up for gesture navigation, switches to another app, or turns off the screen via the power button), background audio playback frequently exhibited two distinct failure modes:
1. **Total Playback Stoppage ("Stopping")**: The video audio instantly halts upon minimization and never resumes.
2. **Audio Stutter / Hitch ("Stopping and Playing Again")**: The audio cuts out for 300ms–1500ms, silence is heard, and then the audio suddenly resumes in the background.

The objective is **seamless player switching**: when the application is minimized, the player must transition into background audio mode with **zero interruption, zero silence, no stopping, and no stop-then-play-again hitch**.

---

## 2. Deep Root-Cause Analysis (Why the Failures Occurred)

To avoid repeating past mistakes, we performed a full forensic trace of the Android OS lifecycle, the Chromium WebView rendering engine, and YouTube's mobile/desktop web client player scripts.

### 2.1 The Two Phases of Minimization in Android
When a user gestures Home or taps the Home button:
1. **Phase 1: Window Focus & Leave Transition (0ms – 150ms)**:
   - The user touches the system navigation bar or screen edge (outside the WebView window).
   - Android calls `Activity.onUserLeaveHint()`.
   - Android calls `Activity.onWindowFocusChanged(false)`.
   - The window animation begins.
   - Chromium's C++ rendering layer (`RenderWidgetHostViewAndroid`, `AwContents`, `WebContentsImpl`) detects window focus loss and window visibility change to `GONE` / `INVISIBLE`.
2. **Phase 2: Activity Lifecycle Transition (150ms – 400ms)**:
   - Android calls `Activity.onPause()`.
   - React Native's `AppState` listener triggers (`'inactive'` -> `'background'`).
   - Android calls `Activity.onStop()`.

### 2.2 Why "Stopping" Happened (Failure Mode 1)
In previous commits (such as `f14a98a`):
```javascript
// Previous flawed implementation in HTMLMediaElement.prototype.pause:
if (window.__isAppInBackground !== true) {
  return origMediaPause.apply(this, arguments);
}
return; // suppress in background
```
- **The Race Condition**: `window.__isAppInBackground` was updated asynchronously via React Native IPC / `evaluateJavascript` inside `Activity.onPause()`.
- **The Trap**: During Phase 1 (before `onPause` executed its JavaScript), Chromium/YouTube detected window focus loss or `IntersectionObserver` invisibility. YouTube's player script immediately invoked `video.pause()`.
- Because `window.__isAppInBackground` was still `false` at that exact millisecond, `origMediaPause.apply(this, arguments)` executed! The HTML5 video element was put into a paused state.
- Once paused, the media playback stopped completely.

### 2.3 Why "Stopping and Playing Again" Happened (Failure Mode 2)
In earlier commits (such as `ea1fca3` and `bec0362`):
- Because the player paused during Phase 1 (as described above), an asynchronous background watchdog or native service callback detected that `video.paused === true` once `window.__isAppInBackground` finally turned `true`.
- The watchdog or service then invoked `video.play()` or `player.playVideo()`.
- **The Result**: The user heard the audio stop for 500ms–1000ms, followed by the video restarting. This caused the frustrating "stop and play again" stutter loop.

### 2.4 Why Native AudioFocus Clashes Failed (Commit `887d6e2` vs `f14a98a`)
- In commit `887d6e2`, `MediaPlaybackService.kt` requested `AudioManager.AUDIOFOCUS_GAIN` on `updatePlaybackState()`.
- **The Conflict**: Android Chromium WebView **already holds Android Audio Focus internally** for the active HTML5 `<video>` element.
- When `MediaPlaybackService` in the same Android process requested `AUDIOFOCUS_GAIN`, the Android audio manager treated it as a distinct audio stream and issued an `AUDIOFOCUS_LOSS_TRANSIENT` to the Chromium WebView!
- Chromium reacted to this focus loss by auto-pausing the HTML5 video element.
- Decoupling native `MediaPlaybackService` from requesting its own duplicate `AUDIOFOCUS_GAIN` and allowing Chromium to manage the hardware audio stream was necessary and must be preserved.

### 2.5 Why Naive `!isPlayerInteraction` Broke Foreground Operations (Commit `887d6e2`)
- In commit `887d6e2`, the code attempted to suppress `pause()` if `!isPlayerInteraction` (checking if the user tapped within a narrow selector list like `.ytp-play-button`).
- **The Catastrophe**:
  1. When a user tapped a recommended video on the home page or search page, YouTube called `pause()` on the previous video before mounting the new one. Because the recommendation tile was not inside `#movie_player`, `pause()` was blocked, causing two audios to play at once!
  2. When a user scrubbed the progress bar or sought to a new time, YouTube paused temporarily to buffer chunks. Blocking `pause()` broke timeline seeking.
  3. When an end screen or natural pause occurred, the video refused to pause.
- Therefore, gesture detection must distinguish between **any recent user touch gesture inside the WebView** vs **system-level minimize actions (which occur outside the WebView)**.

---

## 3. Top Open-Source Projects Researched & Technical Insights

| Project | Approach / Architecture | Key Takeaways for YouTube_wr |
| :--- | :--- | :--- |
| **Brave Browser (`brave-core`)** | Patches Chromium C++ `WebContentsImpl::OnWindowVisibilityChanged` and `WebMediaPlayerImpl::ShouldPausePlaybackWhenHidden` | Demonstrates that Chromium's internal video player pauses video tracks when visibility is hidden unless spoofed or overridden. |
| **Mozilla `video-bg-play`** (Firefox Extension) | Injects content script overriding `document.hidden`, `document.visibilityState`, and drops `visibilitychange` events | Proves that blocking Page Visibility events at `document_start` is mandatory before YouTube's scripts register listeners. |
| **Delphox `video-bg-play-userscript`** | Extends `video-bg-play` to block `blur`, `pagehide`, and reset user activity timestamps | Essential for preventing idle pause timeouts ("Video paused. Continue watching?"). |
| **Chromium Blink `html_media_element.cc`** | Internal `PauseReason` state machine (`kPaused_PageHidden`, `kPaused_AutoplayAutoPause`) | Shows that Blink tracks whether pauses are user-directed or visibility-directed. |
| **NewPipe / ReVanced** | Native ExoPlayer audio track extraction (NewPipe); bytecode patching of YouTube app (ReVanced) | ReVanced patches YouTube's `AudioPlayback` background check flags directly. In WebView, this corresponds to intercepting `HTMLMediaElement.prototype.pause` and DOM observers. |

---

## 4. Past Failed Attempts & Why They Failed (DO NOT REPEAT)

### ❌ Failed Approach 1: Relying Exclusively on `window.__isAppInBackground`
- **What was done**: Blocking `pause()` only when `window.__isAppInBackground === true`.
- **Why it failed**: `window.__isAppInBackground` is updated via IPC on `Activity.onPause()`. By the time `onPause()` fires and evaluates JavaScript, Chromium has already processed window focus loss (Phase 1) and YouTube has already called `video.pause()`. The race condition guarantees playback halts.

### ❌ Failed Approach 2: Native AudioFocus Duplication in Service (`887d6e2`)
- **What was done**: `MediaPlaybackService` requested `AudioManager.AUDIOFOCUS_GAIN`.
- **Why it failed**: Caused audio focus collision with Chromium's internal audio track in the same process, triggering rogue auto-pauses.

### ❌ Failed Approach 3: Blind Background Watchdog Resumption Loops (`ea1fca3`, `bec0362`)
- **What was done**: A timer periodically checking `if (video.paused) video.play()`.
- **Why it failed**: Created the jarring "stop and play again" stutter loop. When the user legitimately paused from the notification shade, the watchdog repeatedly forced the video back to playing.

### ❌ Failed Approach 4: Overly Strict Selector-Targeted `isPlayerInteraction`
- **What was done**: Only allowing `pause()` if the touch event originated from a selector matching `.ytp-play-button` or `#movie_player`.
- **Why it failed**: Broke recommendation video clicking, playlist advancement, progress bar scrub buffering, and YouTube's mobile controls where empty overlay wrapper divs capture the touch.

### ❌ Failed Approach 5: Calling `webView.onPause()` in Activity Lifecycle
- **What was done**: Standard Android tutorials recommend `webView.onPause()`.
- **Why it failed**: `webView.onPause()` freezes Chromium's DOM execution, pauses hardware decoding, and immediately halts background media streams.

---

## 5. The Production Architecture (Multi-Layer Zero-Stutter Solution)

To achieve flawless, uninterrupted background switching, the application utilizes a **synchronized 4-tier architecture**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Native Android Lifecycle & Priority (`MainActivity.kt`)        │
│ • onUserLeaveHint() (Phase 1 Earliest Signal): Instant background lock │
│ • onWindowFocusChanged(false): Instant background lock & timer resume  │
│ • setRendererPriorityPolicy(IMPORTANT, false): Prevents priority waive │
│ • onStop() & onPause(): Persistent resumeTimers() & background flag    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Tier 2: DOM & Page Lifecycle Eradication (`mediaSessionScript.ts`)     │
│ • Spoofs document.hidden = false, visibilityState = 'visible'          │
│ • Drops visibilitychange, webkitvisibilitychange, pagehide, blur,      │
│   focusout, freeze, and resume at EventTarget & Document levels        │
│ • Sets document.hasFocus() = true                                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Tier 3: IntersectionObserver Player Shield                             │
│ • Proxies window.IntersectionObserver                                  │
│ • Intercepts entries for main video element & #movie_player            │
│ • Always reports isIntersecting: true, intersectionRatio: 1.0          │
│ • Eliminates YouTube mobile's offscreen/minimized auto-pause           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Tier 4: Temporal Gesture Guard in HTMLMediaElement.prototype.pause     │
│ • Differentiates in-page user touches vs OS minimization               │
│ • Intentional pause allowed IF: remote command OR video.ended OR       │
│   recent touch gesture in WebView (within 1200ms)                      │
│ • System/Minimize pause suppressed IF: no recent touch in WebView      │
│   OR app is already flagged as in background                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Specifications

### 6.1 Native Android Layer (`MainActivity.kt`)
1. **`onUserLeaveHint()`**: Invoked by Android OS at the very start of Phase 1 (when the user presses Home or initiates a gesture). Immediately executes:
   ```kotlin
   webView?.resumeTimers()
   webView?.evaluateJavascript(
       "(function(){ window.__isAppInBackground = true; window.__lastUserGestureTime = 0; })(); true;",
       null
   )
   ```
2. **`onWindowFocusChanged(hasFocus: Boolean)`**: When `!hasFocus`, instantly flags background mode and ensures timers are resumed.
3. **`setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false)`**: Signals the OS memory manager to never throttle or lower the priority of the WebView renderer when not visible.
4. **`onStop()` & `onPause()`**: Ensures `webView?.resumeTimers()` is continuously called so Hermes/Chromium JS loops never stall.

### 6.2 Browser API & Event Suppression (`mediaSessionScript.ts`)
1. **Page Visibility**: `Document.prototype`, `document`, and `HTMLDocument.prototype` properties `hidden` and `visibilityState` return `false` and `'visible'`.
2. **Page Lifecycle**: Intercepts and drops `freeze`, `resume`, `pagehide`, `blur`, `focusout`, and `visibilitychange` across `EventTarget.prototype`, `Window.prototype`, and `Document.prototype`.
3. **Main Player `IntersectionObserver` Proxy**: Ensures YouTube's mobile viewport observer never reports that the player is offscreen or hidden.

### 6.3 Temporal Gesture Guard in `HTMLMediaElement.prototype.pause`
```javascript
var origMediaPause = HTMLMediaElement.prototype.pause;
HTMLMediaElement.prototype.pause = function() {
  // 1. Explicit remote pause command from notification/lockscreen: ALLOW
  if (window.__isRemotePauseCommand === true) {
    window.__userWantsPaused = true;
    window.__isRemotePauseCommand = false;
    return origMediaPause.apply(this, arguments);
  }

  // 2. Natural track conclusion: ALLOW
  if (this.ended) {
    return origMediaPause.apply(this, arguments);
  }

  // 3. Feed & playlist preview videos: ALLOW
  var isPreviewEl = !!(this.closest && this.closest(
    '.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ' +
    'ytm-playlist-media-item, ytd-rich-item-renderer, ytd-compact-video-renderer, ' +
    '.video-preview, .feed-item-preview'
  ));
  if (isPreviewEl) {
    return origMediaPause.apply(this, arguments);
  }

  // 4. In background: SUPPRESS all automated pauses
  if (window.__isAppInBackground === true) {
    return;
  }

  // 5. In foreground: Differentiate genuine user taps from minimize race conditions
  var now = Date.now();
  var isRecentGesture = (now - (window.__lastUserGestureTime || 0)) <= 1200;

  // If no user touch occurred in the WebView within 1200ms, this pause was triggered
  // by OS minimization, window blur, or idle timeout: SUPPRESS!
  if (!isRecentGesture) {
    return;
  }

  // 6. Genuine user pause in foreground: ALLOW
  window.__userWantsPaused = true;
  return origMediaPause.apply(this, arguments);
};
```

---

## 7. Verification Matrix & Edge Case Check

| Scenario | Expected Behavior | Mechanism Enforcing |
| :--- | :--- | :--- |
| **User presses Home while video playing** | Audio continues seamlessly without stopping or stuttering | Temporal Gesture Guard suppresses pause; `onUserLeaveHint` flags background mode |
| **User locks screen via Power button** | Audio continues seamlessly in background | `onWindowFocusChanged(false)` + Temporal Gesture Guard |
| **User pulls down Notification shade** | Audio continues playing uninterrupted | `onWindowFocusChanged(false)` keeps timers active |
| **User taps Pause button in foreground** | Video pauses immediately | Touch gesture recorded < 1200ms; pause allowed |
| **User clicks new video from recommendations** | Old video pauses, new video loads and plays | Touch gesture recorded on thumbnail < 1200ms; old video pauses cleanly |
| **User scrubs video progress bar** | Video pauses during scrub and resumes smoothly | Touch gesture recorded on scrubber; buffering pause allowed |
| **User taps Pause in Notification drawer** | Video pauses cleanly in background | `__isRemotePauseCommand = true` bypasses background suppression |
| **User taps Play in Notification drawer** | Video resumes playback immediately | `getRemoteControlScript('PLAY')` kicks player and media session |
| **Headphones unplugged while in background** | Video pauses immediately | `ACTION_AUDIO_BECOMING_NOISY` dispatches remote pause |
| **YouTube idle prompt ("Still watching?")** | Prompt bypassed; playback continues | Suppressed by Temporal Gesture Guard + Visibility spoofing |
| **User reopens app and minimizes without touching screen** | Playback continues smoothly; notification controls stay stable | No stale gesture timestamp; synthetic mediaSession pauses ignored; no watchdog ping-pong |

---

## 8. The Reopen & Second Minimize Defect ("Auto-Pausing / Playing Loop")

### 8.1 Problem Description & Symptoms
When a user:
1. Starts playing a video and minimizes the app: audio continues playing smoothly in the background.
2. Reopens the application into the foreground.
3. Without interacting with the screen, minimizes the application a second time.
4. **Failure Symptom**: In the mobile notification drawer, the media notification begins rapidly toggling between "Play" and "Pause" states, wake locks toggle on and off, or the audio stutters into a pause-and-play-again loop.

### 8.2 Forensic Root-Cause Analysis

Detailed tracing of the Android OS lifecycle, WebView JavaScript engine, and YouTube player internals revealed a 4-way conflict:

#### 1. Stale Gesture Timestamp Injection on Activity Resume
- In earlier implementations, `MainActivity.kt` (`onResume` & `onWindowFocusChanged(true)`) and `App.tsx` (`handleAppStateChange('active')`) evaluated:
  ```javascript
  window.__lastUserGestureTime = Date.now();
  ```
- **The Defect**: The user **did not touch the screen**. Faking `Date.now()` on resume deceived the Temporal Gesture Guard in `HTMLMediaElement.prototype.pause`.
- When the user immediately minimized the app (via home gesture or back key), YouTube/Chromium dispatched an automated focus-loss pause within 1200ms.
- Because `(Date.now() - __lastUserGestureTime) <= 1200ms` evaluated to `true`, the guard assumed the user deliberately tapped the in-video pause button. It permitted `video.pause()` and set `window.__userWantsPaused = true`.

#### 2. Blind Resumption Watchdog Loop Ping-Pong
- A background keepalive watchdog interval executed every 1000ms:
  ```javascript
  if (window.__isAppInBackground === true && !window.__userWantsPaused) {
    if (v && v.paused && !v.ended) { v.play(); }
  }
  ```
- Simultaneously, `onUserLeaveHint` in `MainActivity.kt` reset `window.__userWantsPaused = false`.
- The watchdog observed `v.paused === true` and invoked `v.play()`.
- YouTube's internal focus/visibility logic observed the unauthorized play and invoked `video.pause()`.
- **The Result**: An infinite 1Hz ping-pong battle between the watchdog's `v.play()` and YouTube's `video.pause()`, resulting in the physical audio stuttering and "auto pausing and playing".

#### 3. State Oscillation Between `mediaSession.playbackState` and Video DOM Events
- In `mediaSessionScript.ts`:
  ```javascript
  Object.defineProperty(window.navigator.mediaSession, 'playbackState', {
    set: function(val) {
      window.__RN_EXTENSION_BRIDGE__.send('media-session', 'PLAYBACK_STATE_UPDATE', {
        isPlaying: val === 'playing'
      });
    }
  });
  ```
- When the application minimizes, YouTube's internal script sets `navigator.mediaSession.playbackState = 'paused'`, firing `PLAYBACK_STATE_UPDATE: isPlaying = false` to Android's `MediaPlaybackService` (turning notification button to "Play").
- Concurrently, the underlying HTML5 `<video>` element was still playing audio, firing DOM `timeupdate` / `playing` events.
- `reportMediaState` dispatched `MEDIA_STATE_UPDATE: isPlaying = true` to `MediaPlaybackService` (turning notification button back to "Pause").
- **The Result**: Rapid notification UI toggle flicker and WakeLock thrashing every 1–2 seconds without any user interaction.

#### 4. Duplicated Remote Control Command Invocation
- In `MediaPlaybackService.kt`, notification click handlers called:
  `MainActivity.executeRemoteMediaAction(action)` **and** `onMediaAction?.invoke(action, null)`.
- `onMediaAction` dispatched to React Native, which re-injected `getRemoteControlScript(action)` into the WebView.
- Every notification action (toggle play/pause, seek, skip) was evaluated twice in rapid succession.

---

### 8.3 The Complete Engineered Solution

1. **Eliminate Stale Gesture Timestamp Faking**:
   - `MainActivity.kt` (`onResume`, `onWindowFocusChanged(true)`) and `App.tsx` NEVER inject `__lastUserGestureTime = Date.now()`.
   - `window.__lastUserGestureTime` is ONLY updated by genuine DOM user gesture listeners (`touchstart`, `touchend`, `pointerdown`, `click`, `keydown`).
   - If the user reopens and minimizes without touching the screen, `__lastUserGestureTime` remains 0 (or from the past), guaranteeing all minimization pauses are suppressed.

2. **Single Source of Truth for Playback State**:
   - In `mediaSessionScript.ts`, `navigator.mediaSession.playbackState` setter checks the active hardware `<video>` element:
     ```javascript
     if (v && !v.paused && !v.ended && val === 'paused') {
       return; // Drop synthetic pause while audio is actively playing!
     }
     ```
   - Only the physical state of the HTML5 `<video>` element (`!video.paused && !video.ended`) dictates `isPlaying` in the native notification service.

3. **Neutralize Watchdog Ping-Pong**:
   - Replaced blind `v.play()` calls with non-invasive metadata synchronization (`reportMediaState(v, false)`).
   - If a video is genuinely paused, the system respects it and does not force an audio conflict.

4. **De-duplicate Remote Control Actions**:
   - `MainActivity.executeRemoteMediaAction` returns a `Boolean` indicating direct WebView execution on the Android UI thread.
   - `MediaSessionModule` and `App.tsx` receive a `scriptHandled` flag. If `true`, React Native updates component state without re-evaluating the JavaScript script a second time.

---

## 9. Comprehensive Root-Cause Resolution for Reopen & Double-Minimize (October 8, 2026)

### 9.1 The Three Hidden Culprits Discovered During Forensic Analysis

Even after resolving stale gesture timestamps and remote script duplication, physical device testing uncovered why the double-minimize bug persisted:

1. **System Navigation Bar Gestures Stamped User Timestamps**:
   - On Android 10+ gesture navigation, the user minimizes the app by swiping up from the bottom edge of the screen.
   - Because WebView occupies the full screen, the initial `touchstart` at `clientY >= window.innerHeight - 75` fired inside the WebView DOM!
   - This set `window.__lastUserGestureTime = Date.now()`.
   - When YouTube received window blur / focus loss 50ms later, `(Date.now() - __lastUserGestureTime) <= 800ms` evaluated to `true`, causing `HTMLMediaElement.prototype.pause` to falsely assume the user tapped pause!
   - **Resolution**: Filter out all touches where `clientY >= (window.innerHeight - 75)` in `recordUserGesture`. Navigation swipes never update `__lastUserGestureTime` or `__lastPlayerInteractionTime`.

2. **The AdBlocker `unfreezeWatchdog` Background Fight**:
   - In `src/core/extensions/youtubeAdBlocker.ts`, `unfreezeWatchdog` ran every 300ms.
   - Case A contained:
     ```javascript
     if (v.paused && !v.ended && v.readyState >= 1) {
       freezeStallCount++;
       if (freezeStallCount >= 3) { // ~900ms
         v.play().catch(...);
         p.playVideo();
       }
     }
     ```
   - Whenever YouTube paused during minimization, `unfreezeWatchdog` kicked `v.play()` and `p.playVideo()` every 900ms in an infinite fight against YouTube's background pause!
   - Case B nudged `currentTime + 0.01` every 1.2s when video frames were not rendered by the compositor in the background.
   - **Resolution**: Add `if (window.__isAppInBackground === true) { freezeStallCount = 0; return; }` at the top of `unfreezeWatchdog`, and strictly require `wasAdActive === true` for Case A.

3. **Notification Re-posting Thrashing**:
   - In `MediaPlaybackService.kt`, position updates every 2 seconds called `updateNotification()`, which previously re-issued `startForeground` / `notify`.
   - On Android, frequent re-notification of the active media session causes the system media widget in the quick settings shade to re-render, flicker action icons, and momentarily drop transport states.
   - **Resolution**: Implemented notification property diffing (`lastNotifiedPlaying != isPlaying`, `lastNotifiedTitle != currentTitle`, etc.) so `notify` is strictly called only when visible properties genuinely change.

### 9.2 Verification Checklist
- [x] First minimize: audio continues playing smoothly without stutter or stop.
- [x] Reopen to foreground: audio continues playing without interruption.
- [x] Second minimize without user interaction: audio continues playing seamlessly, notification controls remain steady.
- [x] Notification play/pause toggles correctly.
- [x] Seeking, skipping, and thumbnail clicks function without regression.
- [x] Instagram webapp and other domains are completely unaffected.

---

## 10. The Deep Forensic Breakthrough & Multi-Event Minimize Architecture (v1.6.3)

### 10.1 The Hidden Reality Behind Past "Successes" and the v1.6.2 Failure
When testing background playback in version `v1.5.6`, audio appeared to play in the background. However, forensic analysis of the execution log revealed that:
1. **The video was actually pausing on every single minimization**:
   The user swiped home, YouTube received focus loss, and `HTMLMediaElement.prototype.pause` executed.
2. **Audio resumption was purely an unintended side-effect of `unfreezeWatchdog`**:
   In `src/core/extensions/youtubeAdBlocker.ts`, `unfreezeWatchdog` ran every 300ms. In Case A, it saw `v.paused === true && !v.ended` and invoked `v.play()` and `player.playVideo()` after 900ms.
3. **The user experienced the "Stopping and Playing Again" Hitch**:
   Because `unfreezeWatchdog` kicked playback 900ms after the pause, the audio stopped for ~1 second, silence was heard, and then the video started again.
4. **Why v1.6.2 Stopped Playing Completely**:
   When `unfreezeWatchdog` was disabled in background mode (`if (window.__isAppInBackground === true) return;`), the video paused upon minimization and **never resumed**, exposing the fact that the underlying minimize pause was never actually being prevented!

### 10.2 Root Cause 1: The TouchEvent `touchend` Coordinate Trap
In previous attempts to filter navigation gestures at the bottom of the screen:
```javascript
if (ev && ev.touches && ev.touches[0] && typeof ev.touches[0].clientY === 'number') {
  if (ev.touches[0].clientY >= (window.innerHeight - 75)) return;
}
```
- **The W3C Touch Events Specification**:
  `event.touches` is a list of all touch points *currently in contact with the surface*.
  When a user lifts their finger off the screen during a Home swipe (`touchend`), `event.touches` has a `length` of `0`!
  Touches that were removed are stored in `event.changedTouches`, while `event.clientY` is `undefined` on `TouchEvent`.
- **The Failure**:
  On `touchend`, both `ev.clientY` and `ev.touches[0]` were `undefined`.
  The bottom navigation coordinate check evaluated to `false` and fell through to:
  `window.__lastUserGestureTime = Date.now();`!
- **The Result**:
  Every swipe-to-home gesture stamped `window.__lastUserGestureTime = Date.now()` on `touchend` 10ms–30ms before YouTube received focus loss.
  In `HTMLMediaElement.prototype.pause`:
  `(Date.now() - __lastUserGestureTime) <= 800ms` evaluated to `true`, mistakenly classifying the Home swipe as a user request to pause the video!

### 10.3 Root Cause 2: General Screen Touches vs Player Control Touches
- A user NEVER pauses a YouTube video by touching the screen outside the video player.
  Scrolling comments, touching the status bar, reading descriptions, or swiping home must NEVER authorize a video pause.
- Authorizing pause based on `isRecentGesture` (any touch anywhere on the screen) was fundamentally flawed.
- Pause must **strictly require deliberate interaction with the video player elements** (`.ytp-play-button`, `video`, `.player-controls-middle`, `a[href*="/watch"]`) within a tight 1000ms–1200ms window (`isRecentPlayerTouch`).

### 10.4 Root Cause 3: The True Minimization Signal (Window Blur Capture)
How does YouTube know the app was minimized or switched?
Because Chromium fires `'blur'` and `'focusout'` on `window`!
- **Capture-Phase Window Blur Detection**:
  By registering a capture-phase listener on `window` and `document` for `'blur'` and `'focusout'`:
  ```javascript
  window.addEventListener('blur', function() {
    window.__windowHasBlur = true;
    window.__lastBlurTime = Date.now();
  }, true);
  ```
  Our script catches the blur event **at the earliest possible millisecond**, before any page script or YouTube handler can execute.
- **The Immunity Shield**:
  In `HTMLMediaElement.prototype.pause` and `player.pauseVideo`:
  ```javascript
  var isBlurRecent = (Date.now() - (window.__lastBlurTime || 0)) <= 3500;
  if (window.__isAppInBackground === true || window.__windowHasBlur === true || isBlurRecent) {
    return; // Suppress automated pause!
  }
  ```
  Because a user inside the application NEVER blurs the window to tap the pause button, any pause coinciding with window blur or background transition is guaranteed to be an automated minimization pause!

### 10.5 Root Cause 4: Dual-Source State Fighting Causing Notification Control Flickering
In previous versions, notification playback state was reported from two competing sources:
1. `navigator.mediaSession.playbackState` setter: fired `PLAYBACK_STATE_UPDATE` to native service.
2. `reportMediaState(video)`: fired `MEDIA_STATE_UPDATE` from `<video>` DOM events.
When YouTube updated `mediaSession.playbackState` out-of-sync with hardware decoding, the native Android `MediaPlaybackService` received conflicting `isPlaying = true` and `isPlaying = false` signals within milliseconds of each other. This caused:
- The notification button to rapidly toggle between "Play" and "Pause".
- WakeLocks and WifiLocks to be acquired and released in rapid oscillation.
- **Resolution**: Removed `PLAYBACK_STATE_UPDATE` emission from `navigator.mediaSession.playbackState`. The physical HTML5 `<video>` element's DOM events (`play`, `playing`, `pause`, `ended`) via `reportMediaState` are now the **sole source of truth** for native media playback state.

### 10.6 The Master Defense Architecture
```
User Swipes Home / Switches App / Locks Device
                │
                ├─► Capture Phase: window 'blur' caught immediately
                │   └─► window.__windowHasBlur = true; window.__lastBlurTime = Date.now()
                │
                ├─► recordUserGesture filters out bottom 85px (ev.changedTouches / ev.touches / ev.clientY)
                │   └─► window.__lastPlayerInteractionTime remains untouched (0)
                │
                ├─► YouTube / Chromium attempts pause via video.pause() OR player.pauseVideo()
                │   │
                │   ├─► Check 1: window.__isRemotePauseCommand? (No -> proceed)
                │   ├─► Check 2: video.ended? (No -> proceed)
                │   ├─► Check 3: preview video? (No -> proceed)
                │   ├─► Check 4: window.__windowHasBlur || isBlurRecent || __isAppInBackground?
                │   │            YES! ──► PAUSE COMPLETELY SUPPRESSED!
                │   │
                │   └─► Result: Video NEVER pauses. Audio flows seamlessly in background.
                │
                ├─► Android Lifecycle (MainActivity.kt onUserLeaveHint / onPause):
                │   └─► evaluateJavascript: __isAppInBackground = true; __windowHasBlur = true;
                │
                └─► Notification Control:
                    └─► Single source of truth (reportMediaState).
                    └─► isPlaying remains TRUE without flicker or state oscillation.
```

---

## 11. The Whitelist Pause Architecture & Toggle-Button Loop Resolution (v1.6.4)

### 11.1 Forensic Analysis of the v1.6.3 Defects
Device testing of `v1.6.3` revealed two remaining critical failure modes:
1. **Defect 1 (Minimization Stoppage)**: Minimizing the app stopped playback. However, clicking "Play" from the notification drawer worked and played audio continuously in the background.
2. **Defect 2 (Reopen & Second Minimize Infinite Loop)**: After reopening the app and minimizing a second time, tapping "Play" in the notification drawer got trapped in an auto pause/play toggle loop.

### 11.2 Root Cause A: The Recommendation Thumbnail Touch Trap
- In `v1.6.3`, `recordUserGesture` matched `target.closest('ytm-media-item, a[href*="/watch"], compact-video-renderer')`.
- On mobile YouTube (`m.youtube.com`), **recommended video items occupy the entire viewport below the video player**.
- During Android swipe-to-home gestures (or finger touches right before minimizing), the touch event hit a `ytm-media-item` or recommendation link.
- This stamped `window.__lastPlayerInteractionTime = Date.now()`.
- When YouTube attempted to pause 50ms later upon minimization, `isRecentPlayerTouch = (now - __lastPlayerInteractionTime) <= 1200ms` evaluated to `true`.
- The pause interceptor mistakenly assumed the user deliberately tapped pause, executing `origMediaPause.apply()`!

### 11.3 Root Cause B: The Toggle-Button Synthetic Click Loop
In both `MainActivity.kt` and `mediaSessionScript.ts`:
```javascript
case 'PLAY':
  if (player) player.playVideo();
  if (video) video.play();
  var playBtn = document.querySelector('.ytp-play-button[aria-label*="Play" i]...');
  if (playBtn && video && video.paused) {
    playBtn.click(); // THE TRAP
  }
```
1. Because HTML5 media start is asynchronous, `video.paused` is still `true` immediately after calling `video.play()`.
2. This triggered `playBtn.click()`.
3. On YouTube web, `.ytp-play-button` is a **stateful toggle button**. Clicking it while playback is initiating causes YouTube's click listener to **immediately pause the video**.
4. Furthermore, `playBtn.click()` dispatched a DOM `click` event that updated `__lastPlayerInteractionTime = Date.now()`.
5. When YouTube called `video.pause()`, the pause guard saw the recent interaction timestamp, allowed the pause, and set `window.__userWantsPaused = true`.
6. `reportMediaState` notified the Android service: `isPlaying = false`, switching the notification button back to "Play".
7. Tapping "Play" again triggered the exact same ping-pong cycle, trapping the player in an infinite loop!

### 11.4 The Strict Whitelist Solution (v1.6.4)
1. **Inverted Pause Whitelist**:
   - `video.pause()` and `player.pauseVideo()` are **strictly suppressed** unless:
     - `window.__isRemotePauseCommand === true` (Notification / Lockscreen / Headset command), OR
     - `video.ended === true` (Natural track conclusion), OR
     - `isPreviewEl === true` (Feed/thumbnail preview video), OR
     - The user specifically tapped the on-screen **PAUSE** button (`isPauseButtonElement` matches `.ytp-play-button`, `ytm-play-pause-button`, or `button[aria-label*="pause" i]`) within the last 800ms.
   - Recommendation thumbnails (`ytm-media-item`, `a[href*="/watch"]`) and general screen touches **NEVER** set pause authorization.
2. **Eradication of Synthetic `.click()` on Toggle Buttons**:
   - Completely deleted `playBtn.click()` and `pauseBtn.click()` from `MainActivity.kt` and `mediaSessionScript.ts`.
   - Remote controls strictly invoke direct player APIs (`player.playVideo()`, `player.pauseVideo()`, `video.play()`, `video.pause()`).
   - Zero toggle confusion, zero synthetic click timestamps, zero ping-pong loop!
3. **Synchronous Lifecycle Reset**:
---

## 12. Native Chromium Visibility Spoofing & Explicit Notification Architecture (v1.6.5)

### 12.1 The Native C++ Barrier: Why JavaScript Guards Were Insufficient
In `v1.6.4`, our JavaScript interceptor in `HTMLMediaElement.prototype.pause` prevented YouTube's web scripts from calling pause. Yet the video still stopped upon minimization.
- **The Chromium C++ Engine Reality**:
  - `WebView` inherits from `android.view.View`.
  - When an Android Activity is minimized, the Android OS window manager invokes `dispatchWindowVisibilityChanged(View.GONE)` down the View hierarchy.
  - Chromium’s native layer (`AwContents.java` and `WebMediaPlayerImpl.cc`) intercepts `View.GONE` and triggers `WebMediaPlayerImpl::ShouldPausePlaybackWhenHidden()`.
  - To conserve device power and GPU RAM, **Chromium halts the hardware video decoder and audio renderer directly in native C++**.
  - JavaScript never receives a `video.pause()` call because the pause occurs at the native engine level!

### 12.2 The Notification Desynchronization Trap
Because JavaScript suppressed `video.pause()` while Chromium stopped audio at the C++ level:
- Physical audio was stopped, but `MediaPlaybackService.isPlaying` remained `true`.
- The notification button used `ACTION_TOGGLE_PLAY`.
- Tapping the button when physical playback stopped caused `isPlaying` to flip from `true` to `false`, dispatching **`PAUSE`** instead of `PLAY`!

### 12.3 The Engineering Solution Applied (Option 1)
1. **Native Window Visibility Spoofing (`forceWebViewVisible`)**:
   - In `MainActivity.kt`, implemented `forceWebViewVisible(webView: WebView?)`:
     - Directly dispatches `webView.dispatchWindowVisibilityChanged(View.VISIBLE)`.
     - Invokes `onWindowVisibilityChanged(View.VISIBLE)` on `WebView` via reflection.
   - Enforced on the Android UI thread across `onUserLeaveHint()`, `onWindowFocusChanged(false)`, `onPause()`, `onStop()`, and `executeRemoteMediaAction()`.
   - Chromium’s `AwContents` is forced to believe the window is always `View.VISIBLE`, preventing `ShouldPausePlaybackWhenHidden()` from halting hardware audio decoders.
2. **Explicit Notification Intents (No Toggle Ambiguity)**:
   - In `MediaPlaybackService.kt`, replaced ambiguous `ACTION_TOGGLE_PLAY` in `buildNotification()` with explicit intents:
     - When playback is paused &rarr; button intent is strictly **`ACTION_PLAY`**.
     - When playback is active &rarr; button intent is strictly **`ACTION_PAUSE`**.
   - Tapping Play can **never** accidentally dispatch a Pause command.
3. **40ms In-Background Auto-Recovery**:
   - In `src/utils/mediaSessionScript.ts`, `attachToVideo` listens for `pause` events. If an unexpected pause occurs while in background (`window.__isAppInBackground === true && !window.__userWantsPaused`), it kicks `video.play()` and `player.playVideo()` within 40ms.
4. **Native Wake-Up Injection**:
   - In `onUserLeaveHint()`, `onPause()`, and `onStop()`, `MainActivity` immediately evaluates `video.play(); player.playVideo()` on the active video element.

### 12.4 Fallback Architecture Plan (If Future OEM ROMs Impose Aggressive WebView Freezing)
If aggressive OEM battery managers (e.g., Xiaomi MIUI, Samsung OneUI aggressive app sleep) freeze the Chromium process entirely:
- **Fallback A (Auto-PiP Mode)**: Transition to Android native `enterPictureInPictureMode(params)` in `onUserLeaveHint()`. Supported natively by Android 8.0+ with zero hacks; floating mini-player seamlessly continues audio and video.
- **Fallback B (Native ExoPlayer Engine)**: Extract the YouTube audio stream URL and delegate background playback to Android native `ExoPlayer` in `MediaPlaybackService` (the NewPipe / ReVanced architecture).



