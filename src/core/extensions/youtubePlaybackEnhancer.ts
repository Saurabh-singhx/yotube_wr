import { ExtensionManifest } from '../../types/extension';

export const youtubePlaybackEnhancer: ExtensionManifest = {
  id: 'youtube-playback-boost',
  name: 'Audio & Playback Pro',
  description: 'Unlock 0.25x - 3.5x playback speeds, volume booster up to 300%, and loop controls.',
  version: '1.8.0',
  author: 'YouTube_wr Core Team',
  icon: 'speedometer',
  category: 'playback',
  enabled: true,
  urlMatches: ['*://*.youtube.com/*', '*://m.youtube.com/*'],
  runAt: 'document_end',
  settings: [
    {
      id: 'defaultSpeed',
      label: 'Default Speed Multiplier',
      description: 'Playback speed applied automatically to videos',
      type: 'number',
      default: 1.0,
      min: 0.25,
      max: 3.5,
      step: 0.25,
      unit: 'x',
    },
    {
      id: 'volumeBoost',
      label: 'Volume Boost %',
      description: 'Boost audio level beyond 100% using Web Audio Gain',
      type: 'number',
      default: 100,
      min: 100,
      max: 300,
      step: 25,
      unit: '%',
    },
    {
      id: 'autoLoop',
      label: 'Loop Videos Automatically',
      description: 'Replay video automatically when finished',
      type: 'boolean',
      default: false,
    },
    {
      id: 'persistQuality',
      label: 'Force High Quality',
      description: 'Prefer highest available bitrate stream',
      type: 'boolean',
      default: true,
    },
  ],
  userSettings: {
    defaultSpeed: 1.0,
    volumeBoost: 100,
    autoLoop: false,
    persistQuality: true,
  },

  injectedJSEnd: (settings) => {
    const targetSpeed = settings.defaultSpeed || 1.0;
    const boostPercent = settings.volumeBoost || 100;
    const gainValue = boostPercent / 100;
    const autoLoop = !!settings.autoLoop;

    return `
      (function() {
        var currentSpeed = ${targetSpeed};
        var currentGain = ${gainValue};
        var loopEnabled = ${autoLoop};
        var audioCtx = null;
        var gainNode = null;
        var sourceNode = null;

        function applyVideoControls() {
          var video = document.querySelector('video');
          if (!video) return;

          // Apply playback rate
          if (video.playbackRate !== currentSpeed) {
            video.playbackRate = currentSpeed;
          }

          // Apply loop
          if (video.loop !== loopEnabled) {
            video.loop = loopEnabled;
          }

          // Apply Audio Gain Booster via Web Audio API
          if (currentGain > 1.0 && !gainNode) {
            try {
              var AudioContext = window.AudioContext || window.webkitAudioContext;
              if (AudioContext) {
                if (!audioCtx) audioCtx = new AudioContext();
                if (audioCtx.state === 'suspended') {
                  audioCtx.resume();
                }
                if (!sourceNode) {
                  sourceNode = audioCtx.createMediaElementSource(video);
                  gainNode = audioCtx.createGain();
                  sourceNode.connect(gainNode);
                  gainNode.connect(audioCtx.destination);
                }
              }
            } catch(e) {}
          }

          if (gainNode) {
            gainNode.gain.value = currentGain;
          }
        }

        // Listen for direct bridge messages from React Native to change speed/volume on the fly!
        window.addEventListener('message', function(event) {
          try {
            var msg = JSON.parse(event.data);
            if (msg.target === 'youtube-playback-boost') {
              if (msg.speed !== undefined) {
                currentSpeed = msg.speed;
                var video = document.querySelector('video');
                if (video) video.playbackRate = currentSpeed;
              }
              if (msg.volumeBoost !== undefined) {
                currentGain = msg.volumeBoost / 100;
                if (gainNode) gainNode.gain.value = currentGain;
              }
              if (msg.loop !== undefined) {
                loopEnabled = !!msg.loop;
                var video = document.querySelector('video');
                if (video) video.loop = loopEnabled;
              }
            }
          } catch(e) {}
        });

        // Watch for video changes
        setInterval(applyVideoControls, 500);
        document.addEventListener('play', function(e) {
          if (e.target && e.target.tagName === 'VIDEO') {
            applyVideoControls();
          }
        }, true);
      })();
    `;
  },
};
