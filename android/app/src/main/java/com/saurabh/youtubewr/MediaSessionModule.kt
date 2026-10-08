package com.saurabh.youtubewr

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class MediaSessionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), PermissionListener {

    companion object {
        const val NAME = "MediaSessionModule"
        const val EVENT_MEDIA_ACTION = "MediaSessionAction"
        const val PERMISSION_REQ_CODE = 9002
    }

    override fun getName(): String = NAME

    init {
        // Wire callbacks from MediaPlaybackService to React Native bridge
        MediaPlaybackService.onMediaAction = { action, position, scriptHandled ->
            sendMediaActionEvent(action, position, scriptHandled)
        }
    }

    private fun sendMediaActionEvent(action: String, position: Double?, scriptHandled: Boolean) {
        try {
            val params = Arguments.createMap().apply {
                putString("action", action)
                putBoolean("scriptHandled", scriptHandled)
                if (position != null) {
                    putDouble("position", position)
                }
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_MEDIA_ACTION, params)
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native NativeEventEmitter
    }

    @ReactMethod
    fun updatePlayback(params: ReadableMap) {
        val title = if (params.hasKey("title")) params.getString("title") ?: "" else ""
        val artist = if (params.hasKey("artist")) params.getString("artist") ?: "" else ""
        val album = if (params.hasKey("album")) params.getString("album") ?: "YouTube" else "YouTube"
        val thumbnailUrl = if (params.hasKey("thumbnailUrl")) params.getString("thumbnailUrl") ?: "" else ""
        val isPlaying = if (params.hasKey("isPlaying")) params.getBoolean("isPlaying") else false
        val position = if (params.hasKey("position")) params.getDouble("position") else 0.0
        val duration = if (params.hasKey("duration")) params.getDouble("duration") else 0.0
        val speed = if (params.hasKey("speed")) params.getDouble("speed") else 1.0

        MediaPlaybackService.currentTitle = title
        MediaPlaybackService.currentArtist = artist
        MediaPlaybackService.currentAlbum = album
        MediaPlaybackService.currentThumbnailUrl = thumbnailUrl
        MediaPlaybackService.isPlaying = isPlaying
        MediaPlaybackService.currentPosition = position
        MediaPlaybackService.currentDuration = duration
        MediaPlaybackService.currentSpeed = speed

        val intent = Intent(reactContext, MediaPlaybackService::class.java).apply {
            action = MediaPlaybackService.ACTION_UPDATE
        }

        try {
            if (isPlaying || MediaPlaybackService.instance != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(reactContext, intent)
                } else {
                    reactContext.startService(intent)
                }
            }
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun stopPlayback() {
        MediaPlaybackService.isPlaying = false
        val intent = Intent(reactContext, MediaPlaybackService::class.java).apply {
            action = MediaPlaybackService.ACTION_STOP
        }
        try {
            reactContext.startService(intent)
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val permission = Manifest.permission.POST_NOTIFICATIONS
            val granted = ContextCompat.checkSelfPermission(reactContext, permission) == PackageManager.PERMISSION_GRANTED
            if (granted) {
                promise.resolve(true)
                return
            }

            val currentActivity = reactContext.currentActivity
            if (currentActivity is PermissionAwareActivity) {
                currentActivity.requestPermissions(
                    arrayOf(permission),
                    PERMISSION_REQ_CODE,
                    this
                )
                promise.resolve(null)
            } else {
                promise.resolve(false)
            }
        } else {
            promise.resolve(true)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        return requestCode == PERMISSION_REQ_CODE
    }
}
