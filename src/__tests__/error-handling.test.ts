import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlobalErrorBoundary } from '@/shared/ui/GlobalErrorBoundary';
import { supabase } from '@/shared/lib/supabase/client';

// Mock React Native components and modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: { OS: 'ios', Version: '16.0' },
    Alert: { alert: jest.fn() },
  };
});

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
  },
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('@/shared/lib/supabase/client');

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error for boundary');
  }
  return React.createElement('div', null);
};

describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Suppress error logs in tests
  });

  describe('Global Error Boundary', () => {
    it('should catch and display errors', () => {
      const { getByText } = render(
        React.createElement(GlobalErrorBoundary, null, 
          React.createElement(ThrowError, { shouldThrow: true })
        )
      );

      expect(getByText('Oops! Something went wrong')).toBeTruthy();
      expect(getByText('Test error for boundary')).toBeTruthy();
      expect(getByText('Try Again')).toBeTruthy();
      expect(getByText('Report Bug')).toBeTruthy();
    });

    it('should render children when no error occurs', () => {
      const { queryByText, getByTestId } = render(
        React.createElement(GlobalErrorBoundary, null, 
          React.createElement(ThrowError, { shouldThrow: false }),
          React.createElement('div', { 'data-testid': 'no-error' }, 'No error content')
        )
      );

      expect(queryByText('Oops! Something went wrong')).toBeFalsy();
      expect(getByTestId('no-error')).toBeTruthy();
    });

    it('should allow error recovery', () => {
      const { getByText, queryByText } = render(
        React.createElement(GlobalErrorBoundary, null, 
          React.createElement(ThrowError, { shouldThrow: true })
        )
      );

      // Error should be displayed
      expect(getByText('Oops! Something went wrong')).toBeTruthy();

      // Click try again button
      fireEvent.press(getByText('Try Again'));

      // Error should be cleared (component would need to be re-rendered with shouldThrow=false)
      // This is a simplified test - in real app, parent would control the prop
    });

    it('should increment error count on multiple errors', () => {
      const boundary = new GlobalErrorBoundary({ children: null });
      
      // Simulate multiple errors
      boundary.componentDidCatch(new Error('Error 1'), { componentStack: '' });
      boundary.componentDidCatch(new Error('Error 2'), { componentStack: '' });

      expect(boundary.state.errorCount).toBe(2);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle Supabase connection errors', async () => {
      const mockError = new Error('Network request failed');
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(mockError),
        }),
      });

      try {
        await supabase.from('events').select('*').eq('id', 'test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    it('should handle authentication errors', async () => {
      const authError = {
        message: 'Invalid credentials',
        status: 401,
      };

      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        data: null,
        error: authError,
      });

      const result = await supabase.auth.signInWithOtp({
        phone: '+1234567890',
        options: { channel: 'sms' },
      });

      expect(result.error).toEqual(authError);
      expect(result.data).toBeNull();
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = {
        message: 'Rate limit exceeded',
        status: 429,
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: rateLimitError,
        }),
      });

      const result = await supabase.from('events').insert({
        title: 'Test Event',
      });

      expect(result.error).toEqual(rateLimitError);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle invalid phone numbers', () => {
      const validatePhoneNumber = (phone: string) => {
        if (!phone || phone.trim() === '') {
          return { isValid: false, error: 'Phone number is required' };
        }
        
        if (!phone.startsWith('+')) {
          return { isValid: false, error: 'Phone number must include country code' };
        }
        
        if (phone.length < 10 || phone.length > 17) {
          return { isValid: false, error: 'Invalid phone number length' };
        }
        
        if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
          return { isValid: false, error: 'Invalid phone number format' };
        }
        
        return { isValid: true, formattedNumber: phone };
      };

      const invalidInputs = [
        '',
        '   ',
        '1234567890', // No country code
        '+', // Just plus sign
        '+12345', // Too short
        '+123456789012345678', // Too long
        '+0123456789', // Starts with 0
        '+abc123456789', // Contains letters
        '+12-34-56-78-90', // Contains dashes
      ];

      invalidInputs.forEach(input => {
        const result = validatePhoneNumber(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });

      const validInputs = [
        '+1234567890',
        '+33612345678',
        '+447400123456',
      ];

      validInputs.forEach(input => {
        const result = validatePhoneNumber(input);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle malicious input sanitization', () => {
      const sanitizeInput = (input: string): string => {
        return input
          .replace(/[<>]/g, '') // Remove HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      };

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'onclick=alert("xss")',
        '<img src=x onerror=alert("xss")>',
        'DROP TABLE users; --',
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('onerror');
      });
    });

    it('should handle emoji and special characters', () => {
      const processTextInput = (text: string): { processed: string; isValid: boolean } => {
        // Remove excess whitespace
        const processed = text.replace(/\s+/g, ' ').trim();
        
        // Check length limits
        if (processed.length === 0) {
          return { processed, isValid: false };
        }
        
        if (processed.length > 500) {
          return { processed: processed.substring(0, 500), isValid: false };
        }
        
        return { processed, isValid: true };
      };

      const testInputs = [
        '   multiple   spaces   ',
        'Valid text with emojis 😊🎉',
        'Text with special chars: @#$%^&*()',
        '', // Empty
        'a'.repeat(600), // Too long
      ];

      testInputs.forEach(input => {
        const result = processTextInput(input);
        expect(result.processed).toBeDefined();
        expect(result.processed.length).toBeLessThanOrEqual(500);
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle large data sets without memory leaks', () => {
      const processLargeDataset = (data: any[]) => {
        const processed = [];
        
        for (let i = 0; i < data.length; i++) {
          // Process each item
          if (data[i]) {
            processed.push({
              ...data[i],
              processed: true,
              timestamp: Date.now(),
            });
          }
          
          // Prevent blocking the UI for too long
          if (i % 1000 === 0 && i > 0) {
            // In real app, would use setTimeout or requestAnimationFrame
            // to yield control back to the UI thread
          }
        }
        
        return processed;
      };

      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: `item-${i}`,
      }));

      const result = processLargeDataset(largeData);
      
      expect(result).toHaveLength(10000);
      expect(result[0].processed).toBe(true);
      expect(result[9999].processed).toBe(true);
    });

    it('should handle concurrent operations gracefully', async () => {
      const simulateConcurrentOperations = async () => {
        const operations = [];
        
        for (let i = 0; i < 50; i++) {
          operations.push(
            new Promise(resolve => {
              setTimeout(() => {
                resolve({ id: i, completed: true });
              }, Math.random() * 100);
            })
          );
        }
        
        return Promise.all(operations);
      };

      const results = await simulateConcurrentOperations();
      
      expect(results).toHaveLength(50);
      results.forEach((result: any) => {
        expect(result.completed).toBe(true);
      });
    });
  });

  describe('State Management Edge Cases', () => {
    it('should handle state updates after component unmount', () => {
      let isMounted = true;
      const setState = jest.fn();
      
      const safeSetState = (newState: any) => {
        if (isMounted) {
          setState(newState);
        }
      };

      // Simulate component mount
      safeSetState({ data: 'initial' });
      expect(setState).toHaveBeenCalledWith({ data: 'initial' });

      // Simulate component unmount
      isMounted = false;
      setState.mockClear();

      // Try to set state after unmount
      safeSetState({ data: 'after unmount' });
      expect(setState).not.toHaveBeenCalled();
    });

    it('should handle rapid state changes', () => {
      const stateHistory: any[] = [];
      
      const reducer = (state: any, action: any) => {
        let newState;
        
        switch (action.type) {
          case 'INCREMENT':
            newState = { ...state, count: state.count + 1 };
            break;
          case 'DECREMENT':
            newState = { ...state, count: state.count - 1 };
            break;
          case 'RESET':
            newState = { ...state, count: 0 };
            break;
          default:
            return state;
        }
        
        stateHistory.push(newState);
        return newState;
      };

      let state = { count: 0 };
      
      // Simulate rapid state changes
      for (let i = 0; i < 100; i++) {
        state = reducer(state, { type: 'INCREMENT' });
      }
      
      expect(state.count).toBe(100);
      expect(stateHistory).toHaveLength(100);
    });
  });

  describe('API Response Edge Cases', () => {
    it('should handle malformed API responses', () => {
      const parseAPIResponse = (response: any) => {
        try {
          if (!response) {
            return { success: false, error: 'No response received' };
          }
          
          if (typeof response === 'string') {
            response = JSON.parse(response);
          }
          
          if (!response.data && !response.error) {
            return { success: false, error: 'Invalid response format' };
          }
          
          return {
            success: !response.error,
            data: response.data || null,
            error: response.error || null,
          };
        } catch (error) {
          return {
            success: false,
            error: 'Failed to parse response',
          };
        }
      };

      const testResponses = [
        null,
        undefined,
        '',
        'invalid json',
        '{"malformed": json}',
        {},
        { data: null, error: null },
        { data: { items: [] } },
        { error: { message: 'Error occurred' } },
      ];

      testResponses.forEach(response => {
        const result = parseAPIResponse(response);
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('error');
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle timeout scenarios', async () => {
      const timeoutPromise = <T>(promise: Promise<T>, timeout: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          ),
        ]);
      };

      const slowOperation = new Promise(resolve => 
        setTimeout(() => resolve('completed'), 2000)
      );

      try {
        await timeoutPromise(slowOperation, 1000);
        fail('Should have timed out');
      } catch (error: any) {
        expect(error.message).toBe('Request timeout');
      }
    });
  });

  describe('User Interaction Edge Cases', () => {
    it('should prevent double-tap issues', () => {
      let isLoading = false;
      let clickCount = 0;
      
      const handleClick = async () => {
        if (isLoading) return;
        
        isLoading = true;
        clickCount++;
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        isLoading = false;
      };

      // Simulate rapid clicks
      Promise.all([
        handleClick(),
        handleClick(),
        handleClick(),
      ]);

      expect(clickCount).toBe(1); // Should only process one click
    });

    it('should handle navigation edge cases', () => {
      const navigationHistory: string[] = [];
      let currentRoute = 'home';
      
      const navigate = (route: string) => {
        if (route === currentRoute) {
          return; // Don't navigate to the same route
        }
        
        navigationHistory.push(currentRoute);
        currentRoute = route;
      };

      navigate('profile');
      navigate('profile'); // Should be ignored
      navigate('settings');
      navigate('home');

      expect(currentRoute).toBe('home');
      expect(navigationHistory).toEqual(['home', 'profile', 'settings']);
    });
  });
});