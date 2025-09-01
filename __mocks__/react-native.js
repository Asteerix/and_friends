const React = require('react');

const mockNativeModules = {
  UIManager: {},
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  RNCNetInfo: {
    getCurrentState: jest.fn(() => Promise.resolve({})),
    addListener: jest.fn(() => jest.fn()),
  },
};

const mockPlatform = {
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
  Version: '14.0',
};

const mockDimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockActivityIndicator = jest.fn(() => null);
const mockTouchableOpacity = jest.fn(({ children, onPress, testID, ...props }) => 
  React.createElement('TouchableOpacity', { onPress, 'data-testid': testID, ...props }, children)
);
const mockView = jest.fn(({ children, testID, ...props }) => 
  React.createElement('View', { 'data-testid': testID, ...props }, children)
);
const mockText = jest.fn(({ children, testID, ...props }) => 
  React.createElement('Text', { 'data-testid': testID, ...props }, children)
);
const mockTextInput = jest.fn((props) => 
  React.createElement('TextInput', { 'data-testid': props.testID, ...props })
);
const mockScrollView = jest.fn(({ children, testID, ...props }) => 
  React.createElement('ScrollView', { 'data-testid': testID, ...props }, children)
);
const mockFlatList = jest.fn((props) => 
  React.createElement('FlatList', { 'data-testid': props.testID, ...props })
);
const mockImage = jest.fn((props) => 
  React.createElement('Image', { 'data-testid': props.testID, ...props })
);

// Mock Alert
const mockAlert = {
  alert: jest.fn((title, message, buttons) => {
    if (buttons && buttons.length > 0 && buttons[0].onPress) {
      buttons[0].onPress();
    }
  }),
};

module.exports = {
  ...mockNativeModules,
  Platform: mockPlatform,
  Dimensions: mockDimensions,
  Alert: mockAlert,
  ActivityIndicator: mockActivityIndicator,
  TouchableOpacity: mockTouchableOpacity,
  View: mockView,
  Text: mockText,
  TextInput: mockTextInput,
  ScrollView: mockScrollView,
  FlatList: mockFlatList,
  Image: mockImage,
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
  },
  Animated: {
    View: mockView,
    Text: mockText,
    ScrollView: mockScrollView,
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      interpolate: jest.fn(),
      __getValue: jest.fn(() => 0),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    decay: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    loop: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    event: jest.fn(),
    createAnimatedComponent: jest.fn((component) => component),
  },
};