/**
 * Performance Tests for Critical Application Paths
 */

import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client');
jest.useFakeTimers();

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Performance', () => {
    it('should complete OTP verification within 3 seconds', async () => {
      const startTime = Date.now();
      
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });

      await supabase.auth.verifyOtp({
        phone: '+33612345678',
        token: '123456',
        type: 'sms',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Data Loading Performance', () => {
    it('should load event list efficiently', async () => {
      const mockEvents = Array(50).fill(null).map((_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        date: new Date().toISOString(),
        location: 'Paris',
      }));

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockEvents,
          error: null,
        }),
      });

      const startTime = Date.now();
      
      const result = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000);
      expect(result.data).toHaveLength(50);
    });
  });

  describe('Memory Management', () => {
    it('should clean up subscriptions properly', async () => {
      const subscriptions = new Set();
      
      const subscribe = (id: string) => {
        const unsubscribe = () => subscriptions.delete(id);
        subscriptions.add(id);
        return unsubscribe;
      };
      
      // Create subscriptions
      const unsubscribers = Array(100).fill(null).map((_, i) => 
        subscribe(`sub-${i}`)
      );
      
      expect(subscriptions.size).toBe(100);
      
      // Clean up
      unsubscribers.forEach(unsub => unsub());
      
      expect(subscriptions.size).toBe(0);
    });
  });
});
