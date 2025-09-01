/**
 * Tests for Supabase integration
 */

import { supabase } from '@/shared/lib/supabase/client';

describe('Supabase Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should sign in with OTP', async () => {
      const mockSignIn = supabase.auth.signInWithOtp as jest.Mock;
      mockSignIn.mockResolvedValue({ error: null, data: {} });

      const result = await supabase.auth.signInWithOtp({
        phone: '+33623456789',
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        phone: '+33623456789',
      });
      expect(result.error).toBeNull();
    });

    it('should verify OTP', async () => {
      const mockVerify = supabase.auth.verifyOtp as jest.Mock;
      mockVerify.mockResolvedValue({
        error: null,
        data: { user: { id: '123' } },
      });

      const result = await supabase.auth.verifyOtp({
        phone: '+33623456789',
        token: '123456',
        type: 'sms',
      });

      expect(mockVerify).toHaveBeenCalledWith({
        phone: '+33623456789',
        token: '123456',
        type: 'sms',
      });
      expect(result.data.user).toBeDefined();
    });

    it('should get current session', async () => {
      const mockGetSession = supabase.auth.getSession as jest.Mock;
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      });

      const result = await supabase.auth.getSession();

      expect(mockGetSession).toHaveBeenCalled();
      expect(result.data.session).toBeDefined();
    });
  });

  describe('Database', () => {
    it('should select from table', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: '1' }, error: null });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: mockSelect,
        single: mockSingle,
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      });

      const query = supabase.from('users').select('*');
      const result = await query.single();

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result.data).toBeDefined();
    });

    it('should insert data', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: '1' }, error: null });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: mockInsert,
        single: mockSingle,
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      });

      const userData = { name: 'Test User', email: 'test@example.com' };
      const query = supabase.from('users').insert(userData);
      const result = await query.single();

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalledWith(userData);
      expect(result.data).toBeDefined();
    });
  });

  describe('Storage', () => {
    it('should upload file', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null });

      const mockStorageFrom = supabase.storage.from as jest.Mock;
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      });

      const file = new Uint8Array([1, 2, 3]);
      const bucket = supabase.storage.from('avatars');
      const result = await bucket.upload('test.jpg', file);

      expect(mockStorageFrom).toHaveBeenCalledWith('avatars');
      expect(mockUpload).toHaveBeenCalledWith('test.jpg', file);
      expect(result.data?.path).toBe('test.jpg');
    });

    it('should get public URL', () => {
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      });

      const mockStorageFrom = supabase.storage.from as jest.Mock;
      mockStorageFrom.mockReturnValue({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: mockGetPublicUrl,
      });

      const bucket = supabase.storage.from('avatars');
      const result = bucket.getPublicUrl('test.jpg');

      expect(mockGetPublicUrl).toHaveBeenCalledWith('test.jpg');
      expect(result.data.publicUrl).toBe('https://example.com/test.jpg');
    });
  });

  describe('Realtime', () => {
    it('should create channel and subscribe', () => {
      const mockSubscribe = jest.fn();
      const mockOn = jest.fn().mockReturnThis();

      const mockChannel = supabase.realtime.channel as jest.Mock;
      mockChannel.mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: jest.fn(),
      });

      const channel = supabase.realtime.channel('test-channel');
      channel.on('postgres_changes', { event: '*', schema: 'public' }, () => {});
      channel.subscribe();

      expect(mockChannel).toHaveBeenCalledWith('test-channel');
      expect(mockOn).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });
});
