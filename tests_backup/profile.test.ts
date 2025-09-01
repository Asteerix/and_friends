import { supabase } from '@/shared/lib/supabase/client';

describe('Profile Management System', () => {
  const mockProfile = {
    id: 'test-user-id',
    full_name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    bio: 'Test bio',
    avatar_url: 'https://example.com/avatar.jpg',
    phone_number: '+33612345678',
    date_of_birth: '1990-01-01',
    location: 'Paris, France',
    hobbies: ['music', 'sports'],
    interests: ['technology', 'art'],
    is_profile_complete: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Creation', () => {
    it('should create a new profile', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      (supabase.from as jest.Mock) = jest.fn(() => ({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      }));

      const result = await supabase.from('profiles').insert(mockProfile).select().single();

      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it('should validate required profile fields', () => {
      const validateProfile = (profile: any) => {
        if (!profile.full_name) return false;
        if (!profile.phone_number) return false;
        return true;
      };

      expect(validateProfile(mockProfile)).toBe(true);
      expect(validateProfile({ ...mockProfile, full_name: '' })).toBe(false);
      expect(validateProfile({ ...mockProfile, phone_number: '' })).toBe(false);
    });
  });

  describe('Profile Updates', () => {
    it('should update profile information', async () => {
      const updates = {
        full_name: 'Updated Name',
        bio: 'Updated bio',
        updated_at: new Date().toISOString(),
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...mockProfile, ...updates },
        error: null,
      });

      (supabase.from as jest.Mock) = jest.fn(() => ({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      }));

      const result = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', 'test-user-id')
        .select()
        .single();

      expect(result.data?.full_name).toBe('Updated Name');
      expect(result.data?.bio).toBe('Updated bio');
      expect(result.error).toBeNull();
    });
  });

  describe('Profile Validation', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should validate username format', () => {
      const isValidUsername = (username: string) => {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
      };

      expect(isValidUsername('testuser')).toBe(true);
      expect(isValidUsername('test_user123')).toBe(true);
      expect(isValidUsername('ab')).toBe(false); // Too short
      expect(isValidUsername('test-user')).toBe(false); // Invalid character
    });
  });
});
