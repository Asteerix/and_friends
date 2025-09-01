import { renderHook, act } from '@testing-library/react-native';
import { useSecureSupabase } from '@/shared/hooks/useSecureSupabase';
import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));

describe('useSecureSupabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle authentication operations', async () => {
    const { result } = renderHook(() => useSecureSupabase());
    
    expect(result.current.supabase).toBeDefined();
    expect(result.current.supabase.auth).toBeDefined();
  });

  it('should handle database queries with retry', async () => {
    const mockData = { id: 1, name: 'Test User' };
    const mockFrom = supabase.from as jest.Mock;
    
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData, error: null })
    });

    const { result } = renderHook(() => useSecureSupabase());
    
    const query = result.current.supabase.from('users').select('*').eq('id', 1).single();
    const response = await query;
    
    expect(response.data).toEqual(mockData);
    expect(response.error).toBeNull();
  });

  it('should handle network errors with retry', async () => {
    const mockError = new Error('Network error');
    const mockFrom = supabase.from as jest.Mock;
    
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: { id: 1 }, error: null })
    });

    const { result } = renderHook(() => useSecureSupabase());
    
    const query = result.current.supabase.from('users').select('*').eq('id', 1).single();
    
    await act(async () => {
      const response = await query;
      expect(response.data).toBeDefined();
    });
  });

  it('should handle session expiration', async () => {
    const mockAuth = supabase.auth as any;
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session expired' }
    });

    const { result } = renderHook(() => useSecureSupabase());
    
    await act(async () => {
      const session = await result.current.supabase.auth.getSession();
      expect(session.data.session).toBeNull();
      expect(session.error).toBeDefined();
    });
  });
});