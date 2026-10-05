// Jest setup for Expo and React Native
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props) => React.createElement('Ionicons', props),
    MaterialIcons: (props) => React.createElement('MaterialIcons', props),
    FontAwesome: (props) => React.createElement('FontAwesome', props),
    Feather: (props) => React.createElement('Feather', props),
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props) => React.createElement(View, { ...props, testID: props.testID || 'mock-webview' }),
  };
});

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: {
    DEFAULT: 0,
    ALL: 1,
    PORTRAIT: 2,
    PORTRAIT_UP: 3,
    PORTRAIT_DOWN: 4,
    LANDSCAPE: 5,
    LANDSCAPE_LEFT: 6,
    LANDSCAPE_RIGHT: 7,
    OTHER: 8,
  },
  lockAsync: jest.fn().mockResolvedValue(undefined),
  unlockAsync: jest.fn().mockResolvedValue(undefined),
  getOrientationAsync: jest.fn().mockResolvedValue(1),
  addOrientationChangeListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeOrientationChangeListener: jest.fn(),
}));

const { NativeModules } = require('react-native');
NativeModules.MediaSessionModule = {
  addListener: jest.fn(),
  removeListeners: jest.fn(),
  updatePlayback: jest.fn(),
  stopPlayback: jest.fn(),
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
};
