package com.saurabh.youtubewr

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

import android.webkit.CookieManager

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)

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
