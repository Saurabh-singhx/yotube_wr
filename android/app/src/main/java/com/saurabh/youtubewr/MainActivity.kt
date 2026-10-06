package com.saurabh.youtubewr

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

import android.webkit.CookieManager

import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import java.lang.ref.WeakReference

class MainActivity : ReactActivity() {

  companion object {
    var instance: WeakReference<MainActivity>? = null

    fun executeRemoteMediaAction(action: String, position: Double? = null) {
      val activity = instance?.get() ?: return
      activity.runOnUiThread {
        try {
          val webView = findWebView(activity.window.decorView)
          if (webView != null) {
            val pos = if (position != null && !position.isNaN()) position else 0.0
            val script = buildRemoteControlScript(action, pos)
            webView.resumeTimers()
            webView.evaluateJavascript(script, null)
          }
        } catch (_: Exception) {}
      }
    }

    private fun findWebView(view: View?): WebView? {
      if (view == null) return null
      if (view is WebView) return view
      if (view is ViewGroup) {
        for (i in 0 until view.childCount) {
          val found = findWebView(view.getChildAt(i))
          if (found != null) return found
        }
      }
      return null
    }

    private fun buildRemoteControlScript(action: String, position: Double): String {
      return """
        (function() {
          try {
            function getTargetVideo() {
              var videos = document.querySelectorAll('video');
              for (var i = 0; i < videos.length; i++) {
                var v = videos[i];
                var isPreview = !!(v.closest && v.closest(
                  '.inline-preview, ytd-video-preview, ytm-video-preview, ytm-media-item, ' +
                  'ytm-playlist-media-item, ytd-rich-item-renderer, ytd-compact-video-renderer, ' +
                  '.video-preview, .feed-item-preview'
                ));
                if (!isPreview) return v;
              }
              return document.querySelector('#movie_player video, .html5-video-player video, #player video, video.video-stream, video');
            }

            function getTargetPlayer() {
              return document.getElementById('movie_player') ||
                     document.querySelector('.html5-video-player') ||
                     document.getElementById('player') ||
                     document.querySelector('.video-player');
            }

            var video = getTargetVideo();
            var player = getTargetPlayer();
            var actions = window.__ytwrMediaActions || {};

            switch ('$action') {
              case 'PLAY':
                window.__userWantsPaused = false;
                window.__isRemotePlayCommand = true;
                if (player) {
                  try {
                    if (typeof player.unMute === 'function' && typeof player.isMuted === 'function' && player.isMuted()) player.unMute();
                    if (typeof player.setVolume === 'function' && typeof player.getVolume === 'function' && player.getVolume() === 0) player.setVolume(100);
                    if (typeof player.playVideo === 'function') player.playVideo();
                  } catch(e) {}
                }
                if (typeof actions['play'] === 'function') {
                  try { actions['play'](); } catch(e) {}
                }
                if (video) {
                  try {
                    if (video.muted) video.muted = false;
                    if (typeof video.volume === 'number' && video.volume === 0) video.volume = 1.0;
                    video.play().catch(function(){});
                  } catch(e) {}
                }
                var playBtn = document.querySelector(
                  '.ytp-play-button[aria-label*="Play" i], ytm-play-pause-button[aria-label*="Play" i], ' +
                  'button[aria-label*="Play" i], .ytp-large-play-button, .player-control-play'
                );
                if (playBtn && video && video.paused) {
                  try { playBtn.click(); } catch(e) {}
                }
                break;

              case 'PAUSE':
                window.__userWantsPaused = true;
                window.__isRemotePauseCommand = true;
                if (player && typeof player.pauseVideo === 'function') {
                  try { player.pauseVideo(); } catch(e) {}
                }
                if (typeof actions['pause'] === 'function') {
                  try { actions['pause'](); } catch(e) {}
                }
                if (video) {
                  try { video.pause(); } catch(e) {}
                }
                var pauseBtn = document.querySelector(
                  '.ytp-play-button[aria-label*="Pause" i], ytm-play-pause-button[aria-label*="Pause" i], ' +
                  'button[aria-label*="Pause" i]'
                );
                if (pauseBtn && video && !video.paused) {
                  try { pauseBtn.click(); } catch(e) {}
                }
                break;

              case 'FAST_FORWARD':
                var curF = video && typeof video.currentTime === 'number' ? video.currentTime : 0;
                var durF = video && typeof video.duration === 'number' && isFinite(video.duration) ? video.duration : Infinity;
                var newTimeF = Math.min(durF, curF + 10);
                if (player && typeof player.seekTo === 'function') {
                  try { player.seekTo(newTimeF, true); } catch(e) {}
                }
                if (video) {
                  try { video.currentTime = newTimeF; } catch(e) {}
                }
                if (typeof actions['seekforward'] === 'function') {
                  try { actions['seekforward']({ seekOffset: 10 }); } catch(e) {}
                }
                break;

              case 'REWIND':
                var curR = video && typeof video.currentTime === 'number' ? video.currentTime : 0;
                var newTimeR = Math.max(0, curR - 10);
                if (player && typeof player.seekTo === 'function') {
                  try { player.seekTo(newTimeR, true); } catch(e) {}
                }
                if (video) {
                  try { video.currentTime = newTimeR; } catch(e) {}
                }
                if (typeof actions['seekbackward'] === 'function') {
                  try { actions['seekbackward']({ seekOffset: 10 }); } catch(e) {}
                }
                break;

              case 'SEEK_TO':
                if (player && typeof player.seekTo === 'function') {
                  try { player.seekTo($position, true); } catch(e) {}
                }
                if (video) {
                  try { video.currentTime = $position; } catch(e) {}
                }
                if (typeof actions['seekto'] === 'function') {
                  try { actions['seekto']({ seekTime: $position }); } catch(e) {}
                }
                break;

              case 'SKIP_NEXT':
                if (player && typeof player.nextVideo === 'function') {
                  try { player.nextVideo(); } catch(e) {}
                }
                if (typeof actions['nexttrack'] === 'function') {
                  try { actions['nexttrack'](); } catch(e) {}
                }
                var nextBtn = document.querySelector(
                  '.ytp-next-button, button[aria-label*="Next" i], ytm-next-button, .item-thumbnail-next, .navigation-endpoint[aria-label*="Next" i]'
                );
                if (nextBtn) {
                  try { nextBtn.click(); } catch(e) {}
                }
                break;

              case 'SKIP_PREV':
                if (player && typeof player.previousVideo === 'function') {
                  try { player.previousVideo(); } catch(e) {}
                }
                if (typeof actions['previoustrack'] === 'function') {
                  try { actions['previoustrack'](); } catch(e) {}
                }
                var prevBtn = document.querySelector(
                  '.ytp-prev-button, button[aria-label*="Previous" i], ytm-prev-button'
                );
                if (prevBtn) {
                  try { prevBtn.click(); } catch(e) {}
                } else if (video && video.currentTime > 3) {
                  video.currentTime = 0;
                } else {
                  window.history.back();
                }
                break;

              case 'STOP':
                window.__userWantsPaused = true;
                window.__isRemotePauseCommand = true;
                if (player && typeof player.stopVideo === 'function') {
                  try { player.stopVideo(); } catch(e) {}
                } else if (player && typeof player.pauseVideo === 'function') {
                  try { player.pauseVideo(); } catch(e) {}
                }
                if (video) {
                  try { video.pause(); } catch(e) {}
                }
                break;
            }
          } catch(e) {}
        })();
        true;
      """.trimIndent()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    instance = WeakReference(this)

    // Pre-seed CookieManager so initial HTTP requests to YouTube have valid mobile cookies & dark theme
    try {
      val cookieManager = CookieManager.getInstance()
      cookieManager.setAcceptCookie(true)
      cookieManager.setCookie("https://m.youtube.com", "PREF=f6=400&f7=1; path=/; domain=.youtube.com; max-age=31536000")
      cookieManager.setCookie("https://www.youtube.com", "PREF=f6=400&f7=1; path=/; domain=.youtube.com; max-age=31536000")
      cookieManager.setCookie("https://youtube.com", "PREF=f6=400&f7=1; path=/; domain=.youtube.com; max-age=31536000")
      cookieManager.flush()
    } catch (_: Exception) {}
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
   * Move root activity to background on back press so background media playback continues uninterrupted.
   */
  override fun invokeDefaultOnBackPressed() {
      if (!moveTaskToBack(true)) {
          super.invokeDefaultOnBackPressed()
      }
  }

  override fun onDestroy() {
      if (instance?.get() == this) {
          instance = null
      }
      super.onDestroy()
      if (isFinishing) {
          try {
              val stopIntent = android.content.Intent(this, MediaPlaybackService::class.java).apply {
                  action = MediaPlaybackService.ACTION_STOP
              }
              startService(stopIntent)
          } catch (_: Exception) {}
      }
  }
}
