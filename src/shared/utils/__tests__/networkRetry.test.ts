import NetInfo from '@react-native-community/netinfo';
import { NetworkRetry, networkRetry, withNetworkRetry, createRetryableFunction } from '../networkRetry';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('NetworkRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkNetwork', () => {
    it('should return network state', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const state = await NetworkRetry.checkNetwork();

      expect(state).toEqual({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    it('should handle null network values', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
        type: 'unknown',
      } as any);

      const state = await NetworkRetry.checkNetwork();

      expect(state).toEqual({
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      });
    });
  });

  describe('waitForNetwork', () => {
    it('should return true when network is available', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const resultPromise = NetworkRetry.waitForNetwork(5000);
      jest.runAllTimers();
      const result = await resultPromise;

      expect(result).toBe(true);
    });

    it('should return false when timeout is reached', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as any);

      const resultPromise = NetworkRetry.waitForNetwork(2000);
      jest.advanceTimersByTime(2100);
      const result = await resultPromise;

      expect(result).toBe(false);
    });

    it('should wait and retry until network becomes available', async () => {
      mockNetInfo.fetch
        .mockResolvedValueOnce({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        } as any)
        .mockResolvedValueOnce({
          isConnected: true,
          isInternetReachable: false,
          type: 'cellular',
        } as any)
        .mockResolvedValueOnce({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
        } as any);

      const resultPromise = NetworkRetry.waitForNetwork(10000);
      
      // Advance timers to simulate waiting
      jest.advanceTimersByTime(2000);
      
      const result = await resultPromise;
      expect(result).toBe(true);
      expect(mockNetInfo.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('withRetry', () => {
    it('should execute function successfully on first attempt', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await NetworkRetry.withRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();
      const resultPromise = NetworkRetry.withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100,
        onRetry,
      });

      // Advance timers for the delay
      jest.advanceTimersByTime(100);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should not retry non-retryable errors', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const error = new Error('Invalid data');
      (error as any).status = 400;
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(NetworkRetry.withRetry(mockFn)).rejects.toThrow('Invalid data');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should wait for network if not connected', async () => {
      mockNetInfo.fetch
        .mockResolvedValueOnce({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        } as any)
        .mockResolvedValueOnce({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        } as any);

      const mockFn = jest.fn().mockResolvedValue('success');
      const resultPromise = NetworkRetry.withRetry(mockFn);

      // Advance timers for network wait
      jest.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(result).toBe('success');
    });

    it('should handle timeout', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const mockFn = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const resultPromise = NetworkRetry.withRetry(mockFn, { timeout: 1000 });
      
      // Advance timers for timeout
      jest.advanceTimersByTime(1000);
      
      await expect(resultPromise).rejects.toThrow('Request timeout');
    });
  });

  describe('networkRetry utility function', () => {
    it('should return success result', async () => {
      const mockFn = jest.fn().mockResolvedValue('data');
      const result = await networkRetry(mockFn);

      expect(result).toEqual({
        data: 'data',
        attempts: 1,
        success: true,
      });
    });

    it('should return error result after max retries', async () => {
      const error = new Error('Network error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      const resultPromise = networkRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100,
        onRetry,
      });

      // Advance timers for retries
      jest.advanceTimersByTime(300);

      const result = await resultPromise;

      expect(result).toEqual({
        error,
        attempts: 3,
        success: false,
      });
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should not retry when shouldRetry returns false', async () => {
      const error = new Error('Validation error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(false);

      const result = await networkRetry(mockFn, {
        maxRetries: 3,
        shouldRetry,
      });

      expect(result).toEqual({
        error,
        attempts: 1,
        success: false,
      });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(error);
    });
  });

  describe('withNetworkRetry', () => {
    it('should return data on success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await withNetworkRetry(mockFn);

      expect(result).toBe('success');
    });

    it('should throw error on failure', async () => {
      const error = new Error('Network error');
      const mockFn = jest.fn().mockRejectedValue(error);

      const resultPromise = withNetworkRetry(mockFn, { maxRetries: 1, initialDelay: 100 });
      
      // Advance timers for retry delay
      jest.advanceTimersByTime(100);
      
      await expect(resultPromise).rejects.toThrow('Network error');
    });
  });

  describe('createRetryableFunction', () => {
    it('should create a retryable function with default options', async () => {
      const originalFn = jest.fn().mockResolvedValue('result');
      const retryableFn = createRetryableFunction(originalFn, { maxRetries: 5 });

      const result = await retryableFn();

      expect(result).toBe('result');
      expect(originalFn).toHaveBeenCalledTimes(1);
    });

    it('should allow overriding options', async () => {
      const originalFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('result');

      const retryableFn = createRetryableFunction(originalFn, { maxRetries: 1 });

      const resultPromise = retryableFn({ maxRetries: 2, initialDelay: 50 });
      
      // Advance timers for retry delay
      jest.advanceTimersByTime(50);
      
      const result = await resultPromise;

      expect(result).toBe('result');
      expect(originalFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('error classification', () => {
    const testCases = [
      { error: new Error('Network error'), shouldRetry: true },
      { error: new Error('fetch failed'), shouldRetry: true },
      { error: new Error('timeout occurred'), shouldRetry: true },
      { error: { message: 'Server error', status: 500 }, shouldRetry: true },
      { error: { message: 'Too many requests', status: 429 }, shouldRetry: true },
      { error: { message: 'Bad request', status: 400 }, shouldRetry: false },
      { error: new Error('Invalid format'), shouldRetry: false },
      { error: new Error('Validation failed'), shouldRetry: false },
    ];

    testCases.forEach(({ error, shouldRetry: expectedShouldRetry }) => {
      it(`should ${expectedShouldRetry ? 'retry' : 'not retry'} for error: ${error.message}`, async () => {
        const mockFn = jest.fn().mockRejectedValue(error);

        const resultPromise = networkRetry(mockFn, { maxRetries: 2, initialDelay: 50 });
        
        if (expectedShouldRetry) {
          jest.advanceTimersByTime(150); // Allow for retries
        }
        
        const result = await resultPromise;

        const expectedAttempts = expectedShouldRetry ? 3 : 1;
        expect(result.attempts).toBe(expectedAttempts);
        expect(mockFn).toHaveBeenCalledTimes(expectedAttempts);
      });
    });
  });
});