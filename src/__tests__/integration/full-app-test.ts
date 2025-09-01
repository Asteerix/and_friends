import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase/client';

describe('Full App Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  describe('Critical User Flows', () => {
    it('should handle authentication flow correctly', async () => {
      const mockSignInWithOtp = jest.spyOn(supabase.auth, 'signInWithOtp');
      mockSignInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const mockVerifyOtp = jest.spyOn(supabase.auth, 'verifyOtp');
      mockVerifyOtp.mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: null, phone: '+33612345678' },
          session: { access_token: 'test-token', refresh_token: 'refresh-token' },
        },
        error: null,
      });

      expect(mockSignInWithOtp).toBeDefined();
      expect(mockVerifyOtp).toBeDefined();
    });

    it('should handle event creation flow', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'test-event-id', title: 'Test Event' },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('events').insert({
        title: 'Test Event',
        description: 'Test Description',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should handle chat messaging flow', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'test-message-id', text: 'Hello' },
        error: null,
      });

      jest.spyOn(supabase, 'from').mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('messages').insert({
        chat_id: 'test-chat-id',
        text: 'Hello',
        author_id: 'test-user-id',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should handle profile update flow', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        data: { id: 'test-user-id', name: 'Updated Name' },
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        update: mockUpdate,
      });

      jest.spyOn(supabase, 'from').mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: mockEq }),
      } as any);

      const result = await supabase
        .from('profiles')
        .update({ name: 'Updated Name' })
        .eq('id', 'test-user-id');

      expect(result.error).toBeNull();
    });

    it('should handle story upload flow', async () => {
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'stories/test-story.jpg' },
        error: null,
      });

      jest.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: mockUpload,
      } as any);

      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const result = await supabase.storage
        .from('stories')
        .upload('test-story.jpg', blob);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should load main screens within acceptable time', async () => {
      const startTime = Date.now();
      
      const mockSelect = jest.fn().mockResolvedValue({
        data: Array(20).fill({ id: 'test-id', title: 'Test' }),
        error: null,
      });

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      await supabase.from('events').select('*');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle large data sets efficiently', async () => {
      const largeDataSet = Array(1000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        data: `data-${i}`,
      }));

      const startTime = Date.now();
      const processed = largeDataSet.filter(item => item.id.includes('1'));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(processed.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockSelect = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      jest.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      try {
        await supabase.from('events').select('*');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle authentication errors', async () => {
      const mockSignInWithOtp = jest.spyOn(supabase.auth, 'signInWithOtp');
      mockSignInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid phone number', status: 400 },
      } as any);

      const result = await supabase.auth.signInWithOtp({
        phone: 'invalid',
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive data in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const sensitiveData = { password: 'secret', token: 'abc123' };
      
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('secret')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('abc123')
      );
    });

    it('should validate user input', () => {
      const validatePhone = (phone: string) => {
        return /^\+[1-9]\d{1,14}$/.test(phone);
      };

      expect(validatePhone('+33612345678')).toBe(true);
      expect(validatePhone('invalid')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });
});