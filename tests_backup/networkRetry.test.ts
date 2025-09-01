import { NetworkRetry } from '../networkRetry';

// Mock network status for testing
const mockNetworkState = {
  isConnected: true,
  isInternetReachable: true
};

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve(mockNetworkState))
}));

describe('NetworkRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset network state
    mockNetworkState.isConnected = true;
    mockNetworkState.isInternetReachable = true;
  });

  describe('checkNetwork', () => {
    test('should return connected state when online', async () => {
      const result = await NetworkRetry.checkNetwork();
      expect(result.isConnected).toBe(true);
      expect(result.isInternetReachable).toBe(true);
    });

    test('should return disconnected state when offline', async () => {
      mockNetworkState.isConnected = false;
      mockNetworkState.isInternetReachable = false;
      
      const result = await NetworkRetry.checkNetwork();
      expect(result.isConnected).toBe(false);
      expect(result.isInternetReachable).toBe(false);
    });
  });

  describe('withRetry', () => {
    test('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await NetworkRetry.withRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return Promise.resolve('success');
      });
      
      const result = await NetworkRetry.withRetry(mockOperation, {
        maxRetries: 3,
        initialDelay: 10
      });
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should fail after exhausting all retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(
        NetworkRetry.withRetry(mockOperation, {
          maxRetries: 2,
          initialDelay: 10
        })
      ).rejects.toThrow('Persistent error');
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should respect custom retry options', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Always fails'));
      const startTime = Date.now();
      
      try {
        await NetworkRetry.withRetry(mockOperation, {
          maxRetries: 1,
          initialDelay: 100,
          maxDelay: 200
        });
      } catch (error) {
        // Expected to fail
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(100); // Should have waited at least the initial delay
      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    test('should not retry certain types of errors', async () => {
      const unauthorizedError = new Error('Unauthorized');
      (unauthorizedError as any).status = 401;
      
      const mockOperation = jest.fn().mockRejectedValue(unauthorizedError);
      
      await expect(
        NetworkRetry.withRetry(mockOperation)
      ).rejects.toThrow('Unauthorized');
      
      // Should not retry 4xx errors
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('exponential backoff', () => {
    test('should use exponential backoff for delays', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      const delayTimes: number[] = [];
      
      // Mock setTimeout to capture delay times
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delayTimes.push(delay);
        return originalSetTimeout(callback, 1); // Speed up test
      }) as any;
      
      try {
        await NetworkRetry.withRetry(mockOperation, {
          maxRetries: 3,
          initialDelay: 100,
          backoffMultiplier: 2
        });
      } catch (error) {
        // Expected to fail
      }
      
      global.setTimeout = originalSetTimeout;
      
      // Check exponential backoff: 100, 200, 400
      expect(delayTimes[0]).toBe(100);
      expect(delayTimes[1]).toBe(200);
      expect(delayTimes[2]).toBe(400);
    });
  });

  describe('network-aware retry', () => {
    test('should check network before retrying', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // Simulate going offline during retry
      let retryCount = 0;
      const originalCheckNetwork = NetworkRetry.checkNetwork;
      NetworkRetry.checkNetwork = jest.fn().mockImplementation(() => {
        retryCount++;
        return Promise.resolve({
          isConnected: retryCount === 1, // Connected first time, disconnected after
          isInternetReachable: retryCount === 1
        });
      });
      
      try {
        await NetworkRetry.withRetry(mockOperation, {
          maxRetries: 2,
          initialDelay: 10
        });
      } catch (error) {
        // Expected to fail
      }
      
      NetworkRetry.checkNetwork = originalCheckNetwork;
      expect(NetworkRetry.checkNetwork).toHaveBeenCalled();
    });
  });
});