package com.saurabh.youtubewr

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat as MediaNotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class MediaPlaybackService : Service() {

    companion object {
        const val CHANNEL_ID = "ytwr_media_playback"
        const val NOTIFICATION_ID = 9001

        const val ACTION_PLAY = "com.saurabh.youtubewr.ACTION_PLAY"
        const val ACTION_PAUSE = "com.saurabh.youtubewr.ACTION_PAUSE"
        const val ACTION_TOGGLE_PLAY = "com.saurabh.youtubewr.ACTION_TOGGLE_PLAY"
        const val ACTION_REWIND = "com.saurabh.youtubewr.ACTION_REWIND"
        const val ACTION_FAST_FORWARD = "com.saurabh.youtubewr.ACTION_FAST_FORWARD"
        const val ACTION_SKIP_NEXT = "com.saurabh.youtubewr.ACTION_SKIP_NEXT"
        const val ACTION_SKIP_PREV = "com.saurabh.youtubewr.ACTION_SKIP_PREV"
        const val ACTION_STOP = "com.saurabh.youtubewr.ACTION_STOP"
        const val ACTION_UPDATE = "com.saurabh.youtubewr.ACTION_UPDATE"

        var instance: MediaPlaybackService? = null
        var onMediaAction: ((action: String, position: Double?, scriptHandled: Boolean) -> Unit)? = null

        var currentTitle = ""
        var currentArtist = ""
        var currentAlbum = "YouTube"
        var currentThumbnailUrl = ""
        var isPlaying = false
        var currentPosition = 0.0 // seconds
        var currentDuration = 0.0 // seconds
        var currentSpeed = 1.0
    }

    private var mediaSession: MediaSessionCompat? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var currentBitmap: Bitmap? = null
    private var lastLoadedThumbnailUrl = ""

    private var isForegroundActive = false
    private var lastNotifiedPlaying: Boolean? = null
    private var lastNotifiedTitle: String = ""
    private var lastNotifiedArtist: String = ""
    private var lastNotifiedBitmap: Bitmap? = null

    private var isNoisyReceiverRegistered = false

    private val noisyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                if (isPlaying) {
                    isPlaying = false
                    updatePlaybackState()
                    updateNotification()
                    val handled = MainActivity.executeRemoteMediaAction("PAUSE")
                    onMediaAction?.invoke("PAUSE", null, handled)
                }
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this

        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "YouTubeWR::MediaWakeLock")?.apply {
            setReferenceCounted(false)
        }

        val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        @Suppress("DEPRECATION")
        wifiLock = wifiManager?.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "YouTubeWR::WifiLock")?.apply {
            setReferenceCounted(false)
        }
        try {
            registerReceiver(noisyReceiver, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))
            isNoisyReceiverRegistered = true
        } catch (_: Exception) {}

        createNotificationChannel()
        setupMediaSession()
    }


    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "YouTube Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Controls for background YouTube video playback"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(channel)
        }
    }

    @Suppress("DEPRECATION")
    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "YouTubeWR_MediaSession").apply {
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            )

            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    isPlaying = true
                    updatePlaybackState()
                    updateNotification()
                    val handled = MainActivity.executeRemoteMediaAction("PLAY")
                    onMediaAction?.invoke("PLAY", null, handled)
                }

                override fun onPause() {
                    isPlaying = false
                    updatePlaybackState()
                    updateNotification()
                    val handled = MainActivity.executeRemoteMediaAction("PAUSE")
                    onMediaAction?.invoke("PAUSE", null, handled)
                }

                override fun onFastForward() {
                    currentPosition = (currentPosition + 10.0).coerceAtMost(currentDuration)
                    updatePlaybackState()
                    val handled = MainActivity.executeRemoteMediaAction("FAST_FORWARD")
                    onMediaAction?.invoke("FAST_FORWARD", null, handled)
                }

                override fun onRewind() {
                    currentPosition = (currentPosition - 10.0).coerceAtLeast(0.0)
                    updatePlaybackState()
                    val handled = MainActivity.executeRemoteMediaAction("REWIND")
                    onMediaAction?.invoke("REWIND", null, handled)
                }

                override fun onSkipToNext() {
                    val handled = MainActivity.executeRemoteMediaAction("SKIP_NEXT")
                    onMediaAction?.invoke("SKIP_NEXT", null, handled)
                }

                override fun onSkipToPrevious() {
                    val handled = MainActivity.executeRemoteMediaAction("SKIP_PREV")
                    onMediaAction?.invoke("SKIP_PREV", null, handled)
                }

                override fun onSeekTo(pos: Long) {
                    val posSeconds = pos / 1000.0
                    currentPosition = posSeconds
                    updatePlaybackState()
                    val handled = MainActivity.executeRemoteMediaAction("SEEK_TO", posSeconds)
                    onMediaAction?.invoke("SEEK_TO", posSeconds, handled)
                }

                override fun onStop() {
                    isPlaying = false
                    updatePlaybackState()
                    val handled = MainActivity.executeRemoteMediaAction("STOP")
                    onMediaAction?.invoke("STOP", null, handled)
                    stopServiceSafely()
                }
            })

            isActive = true
        }
    }

    private fun updatePlaybackState() {
        val state = if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val actions = PlaybackStateCompat.ACTION_PLAY or
                      PlaybackStateCompat.ACTION_PAUSE or
                      PlaybackStateCompat.ACTION_PLAY_PAUSE or
                      PlaybackStateCompat.ACTION_FAST_FORWARD or
                      PlaybackStateCompat.ACTION_REWIND or
                      PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                      PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                      PlaybackStateCompat.ACTION_SEEK_TO or
                      PlaybackStateCompat.ACTION_STOP

        val playbackState = PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, (currentPosition * 1000).toLong(), currentSpeed.toFloat())
            .build()

        mediaSession?.setPlaybackState(playbackState)

        val metadataBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, if (currentTitle.isNotEmpty()) currentTitle else "YouTube")
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, if (currentArtist.isNotEmpty()) currentArtist else "Playing in background")
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (currentDuration * 1000).toLong())

        if (currentBitmap != null) {
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentBitmap)
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, currentBitmap)
        }

        mediaSession?.setMetadata(metadataBuilder.build())

        // Manage WakeLock and WifiLock to prevent device from sleeping while playing
        if (isPlaying) {
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire(12 * 60 * 60 * 1000L) // 12h safety ceiling
            }
            if (wifiLock?.isHeld != true) {
                wifiLock?.acquire()
            }
        } else {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
        }
    }

    private fun buildNotification(): Notification {
        val sessionToken = mediaSession?.sessionToken

        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        // 0. Previous Video Action
        val prevIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_SKIP_PREV }
        val prevPendingIntent = PendingIntent.getService(
            this, 5, prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val prevAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_previous, "Previous Video", prevPendingIntent
        ).build()

        // 1. Rewind Action (-10s)
        val rewIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_REWIND }
        val rewPendingIntent = PendingIntent.getService(
            this, 1, rewIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val rewAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_rew, "Rewind 10s", rewPendingIntent
        ).build()

        // 2. Play/Pause Action: Explicit action based on current state (never toggle ambiguity)
        val playPauseIntent = Intent(this, MediaPlaybackService::class.java).apply {
            action = if (isPlaying) ACTION_PAUSE else ACTION_PLAY
        }
        val playPausePendingIntent = PendingIntent.getService(
            this, 2, playPauseIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val playPauseIcon = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playPauseTitle = if (isPlaying) "Pause" else "Play"
        val playPauseAction = NotificationCompat.Action.Builder(
            playPauseIcon, playPauseTitle, playPausePendingIntent
        ).build()

        // 3. Fast Forward Action (+10s)
        val ffIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_FAST_FORWARD }
        val ffPendingIntent = PendingIntent.getService(
            this, 3, ffIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val ffAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_ff, "Forward 10s", ffPendingIntent
        ).build()

        // 4. Skip Next Action
        val nextIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_SKIP_NEXT }
        val nextPendingIntent = PendingIntent.getService(
            this, 4, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val nextAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_media_next, "Next Video", nextPendingIntent
        ).build()

        val mediaStyle = MediaNotificationCompat.MediaStyle()
        if (sessionToken != null) {
            mediaStyle.setMediaSession(sessionToken)
        }
        // In compact view: Rewind, Play/Pause, Forward (actions 1, 2, 3)
        mediaStyle.setShowActionsInCompactView(1, 2, 3)

        // Delete intent if user swipes notification away when paused
        val deleteIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_STOP }
        val deletePendingIntent = PendingIntent.getService(
            this, 99, deleteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(if (currentTitle.isNotEmpty()) currentTitle else "YouTube")
            .setContentText(if (currentArtist.isNotEmpty()) currentArtist else "Playing in background")
            .setContentIntent(contentPendingIntent)
            .setDeleteIntent(deletePendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setStyle(mediaStyle)
            .addAction(prevAction)
            .addAction(rewAction)
            .addAction(playPauseAction)
            .addAction(ffAction)
            .addAction(nextAction)
            .setOngoing(isPlaying)
            .setSilent(true)

        if (currentBitmap != null) {
            builder.setLargeIcon(currentBitmap)
        }

        return builder.build()
    }

    fun updateNotification(force: Boolean = false) {
        val playingChanged = lastNotifiedPlaying != isPlaying
        val titleChanged = lastNotifiedTitle != currentTitle
        val artistChanged = lastNotifiedArtist != currentArtist
        val bitmapChanged = lastNotifiedBitmap != currentBitmap

        if (!force && isForegroundActive && !playingChanged && !titleChanged && !artistChanged && !bitmapChanged) {
            return
        }

        lastNotifiedPlaying = isPlaying
        lastNotifiedTitle = currentTitle
        lastNotifiedArtist = currentArtist
        lastNotifiedBitmap = currentBitmap

        val notification = buildNotification()
        if (!isForegroundActive) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                    )
                } else {
                    startForeground(NOTIFICATION_ID, notification)
                }
                isForegroundActive = true
            } catch (e: Exception) {
                val nm = getSystemService(NotificationManager::class.java)
                nm?.notify(NOTIFICATION_ID, notification)
            }
        } else {
            val nm = getSystemService(NotificationManager::class.java)
            nm?.notify(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> {
                isPlaying = true
                updatePlaybackState()
                updateNotification(force = true)
                val handled = MainActivity.executeRemoteMediaAction("PLAY")
                onMediaAction?.invoke("PLAY", null, handled)
            }
            ACTION_PAUSE -> {
                isPlaying = false
                updatePlaybackState()
                updateNotification(force = true)
                val handled = MainActivity.executeRemoteMediaAction("PAUSE")
                onMediaAction?.invoke("PAUSE", null, handled)
            }
            ACTION_TOGGLE_PLAY -> {
                isPlaying = !isPlaying
                val action = if (isPlaying) "PLAY" else "PAUSE"
                updatePlaybackState()
                updateNotification(force = true)
                val handled = MainActivity.executeRemoteMediaAction(action)
                onMediaAction?.invoke(action, null, handled)
            }
            ACTION_REWIND -> {
                currentPosition = (currentPosition - 10.0).coerceAtLeast(0.0)
                updatePlaybackState()
                val handled = MainActivity.executeRemoteMediaAction("REWIND")
                onMediaAction?.invoke("REWIND", null, handled)
            }
            ACTION_FAST_FORWARD -> {
                currentPosition = (currentPosition + 10.0).coerceAtMost(currentDuration)
                updatePlaybackState()
                val handled = MainActivity.executeRemoteMediaAction("FAST_FORWARD")
                onMediaAction?.invoke("FAST_FORWARD", null, handled)
            }
            ACTION_SKIP_NEXT -> {
                val handled = MainActivity.executeRemoteMediaAction("SKIP_NEXT")
                onMediaAction?.invoke("SKIP_NEXT", null, handled)
            }
            ACTION_SKIP_PREV -> {
                val handled = MainActivity.executeRemoteMediaAction("SKIP_PREV")
                onMediaAction?.invoke("SKIP_PREV", null, handled)
            }
            ACTION_STOP -> {
                val handled = MainActivity.executeRemoteMediaAction("STOP")
                onMediaAction?.invoke("STOP", null, handled)
                stopServiceSafely()
                return START_NOT_STICKY
            }
            ACTION_UPDATE -> {
                updatePlaybackState()
                updateNotification(force = false)
                fetchArtworkIfNeeded()
            }
        }

        if (!isForegroundActive) {
            updateNotification(force = true)
        }

        return START_NOT_STICKY
    }

    private fun fetchArtworkIfNeeded() {
        val urlStr = currentThumbnailUrl
        if (urlStr.isNotEmpty() && urlStr != lastLoadedThumbnailUrl) {
            lastLoadedThumbnailUrl = urlStr
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL(urlStr)
                    val connection = url.openConnection() as HttpURLConnection
                    connection.doInput = true
                    connection.connectTimeout = 6000
                    connection.readTimeout = 6000
                    connection.connect()
                    val input = connection.inputStream
                    val bitmap = BitmapFactory.decodeStream(input)
                    withContext(Dispatchers.Main) {
                        currentBitmap = bitmap
                        updatePlaybackState()
                        updateNotification(force = true)
                    }
                } catch (_: Exception) {}
            }
        }
    }

    private fun stopServiceSafely() {
        try {
            isForegroundActive = false
            lastNotifiedPlaying = null
            lastNotifiedTitle = ""
            lastNotifiedArtist = ""
            lastNotifiedBitmap = null
            if (isNoisyReceiverRegistered) {
                try {
                    unregisterReceiver(noisyReceiver)
                    isNoisyReceiverRegistered = false
                } catch (_: Exception) {}
            }
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm?.cancel(NOTIFICATION_ID)
            mediaSession?.isActive = false
            mediaSession?.release()
            mediaSession = null
        } catch (_: Exception) {}
        stopSelf()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        stopServiceSafely()
    }

    override fun onDestroy() {
        instance = null
        if (isNoisyReceiverRegistered) {
            try {
                unregisterReceiver(noisyReceiver)
                isNoisyReceiverRegistered = false
            } catch (_: Exception) {}
        }
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        if (wifiLock?.isHeld == true) {
            wifiLock?.release()
        }
        mediaSession?.release()
        super.onDestroy()
    }
}
