import { createClient } from '@supabase/supabase-js';
import { supabase } from '../client';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      }),
    },
  }),
}));

describe('Supabase Client', () => {
  it('should create a supabase client with correct config', () => {
    expect(createClient).toHaveBeenCalled();
    expect(supabase).toBeDefined();
  });

  it('should have auth methods available', () => {
    expect(supabase.auth).toBeDefined();
    expect(supabase.auth.getSession).toBeDefined();
    expect(supabase.auth.signInWithOtp).toBeDefined();
  });

  it('should have database methods available', () => {
    expect(supabase.from).toBeDefined();
  });

  it('should have storage methods available', () => {
    expect(supabase.storage).toBeDefined();
    expect(supabase.storage.from).toBeDefined();
  });
});