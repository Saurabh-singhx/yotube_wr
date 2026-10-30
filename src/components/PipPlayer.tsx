import React from 'react';
import { View, StyleSheet, Text, Pressable, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface PipPlayerProps {
  videoId: string;
  onClose: () => void;
  onExpand: () => void;
}

export const PipPlayer: React.FC<PipPlayerProps> = ({
  videoId,
  onClose,
  onExpand,
}) => {
  const { palette } = useTheme();

  const handleExpand = () => {
    triggerHaptic();
    onExpand();
  };

  const handleClose = () => {
    triggerHaptic();
    onClose();
  };

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&enablejsapi=1`;

  return (
    <View
      style={[
        styles.pipContainer,
        {
          backgroundColor: palette.surface,
          borderColor: palette.surfaceBorder,
          shadowColor: palette.shadowDark,
        },
      ]}
    >
      {/* Header Bar */}
      <View
        style={[
          styles.headerRow,
          {
            backgroundColor: palette.surfacePressed,
            borderBottomColor: palette.surfaceBorder,
          },
        ]}
      >
        <View style={styles.titleGroup}>
          <View style={styles.liveIndicator} />
          <Text style={[styles.titleText, { color: palette.textPrimary }]}>
            PiP Video
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleExpand}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="expand-outline" size={14} color={palette.textPrimary} />
          </Pressable>

          <Pressable
            onPress={handleClose}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={15} color={palette.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Mini Video WebView */}
      <View style={styles.videoWrapper}>
        <WebView
          source={{ uri: embedUrl }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={false}
          androidLayerType="hardware"
          style={styles.webView}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 95 : 85,
    right: 14,
    width: 224,
    height: 148,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 24,
    borderBottomWidth: 1,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    padding: 2,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
});
