import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../useNetworkStatus';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('useNetworkStatus', () => {
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribe = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
    expect(result.current.connectionType).toBe('unknown');
  });

  it('should update state when network status changes', async () => {
    const mockListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockListener.mockImplementation(callback);
      return unsubscribe;
    });

    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      mockListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
    expect(result.current.connectionType).toBe('none');
  });

  it('should detect different connection types', async () => {
    const mockListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockListener.mockImplementation(callback);
      return unsubscribe;
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Test WiFi
    await act(async () => {
      mockListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });
    expect(result.current.connectionType).toBe('wifi');

    // Test Cellular
    await act(async () => {
      mockListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      });
    });
    expect(result.current.connectionType).toBe('cellular');

    // Test No connection
    await act(async () => {
      mockListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });
    expect(result.current.connectionType).toBe('none');
  });

  it('should handle network reconnection', async () => {
    const mockListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockListener.mockImplementation(callback);
      return unsubscribe;
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Disconnect
    await act(async () => {
      mockListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    expect(result.current.isConnected).toBe(false);

    // Reconnect
    await act(async () => {
      mockListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('should cleanup listener on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());

    expect(NetInfo.addEventListener).toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should handle internet reachability separately from connection', async () => {
    const mockListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockListener.mockImplementation(callback);
      return unsubscribe;
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Connected but no internet
    await act(async () => {
      mockListener({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      });
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(false);
  });

  it('should handle null values gracefully', async () => {
    const mockListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockListener.mockImplementation(callback);
      return unsubscribe;
    });

    const { result } = renderHook(() => useNetworkStatus());

    await act(async () => {
      mockListener({
        isConnected: null,
        isInternetReachable: null,
        type: null,
      });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
    expect(result.current.connectionType).toBe('unknown');
  });
});