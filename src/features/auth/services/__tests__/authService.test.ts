import { supabase } from '@/shared/lib/supabase/client';

const authService = {
  async signInWithPhone(phoneNumber: string) {
    return supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });
  },

  async verifyOtp(phoneNumber: string, otp: string) {
    return supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms',
    });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getSession() {
    return supabase.auth.getSession();
  },

  async updateProfile(userId: string, data: any) {
    return supabase
      .from('profiles')
      .update(data)
      .eq('id', userId);
  },
};

jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithPhone', () => {
    it('should call signInWithOtp with correct phone number', async () => {
      const phoneNumber = '+33612345678';
      const mockResponse = { data: { user: null }, error: null };
      
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await authService.signInWithPhone(phoneNumber);
      
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: phoneNumber,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle error during sign in', async () => {
      const phoneNumber = '+33612345678';
      const mockError = { error: { message: 'Network error' }, data: null };
      
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue(mockError);
      
      const result = await authService.signInWithPhone(phoneNumber);
      
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const phoneNumber = '+33612345678';
      const otp = '123456';
      const mockResponse = {
        data: { user: { id: 'user-123' }, session: {} },
        error: null,
      };
      
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await authService.verifyOtp(phoneNumber, otp);
      
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: phoneNumber,
        token: otp,
        type: 'sms',
      });
      expect(result.data).toBeDefined();
    });

    it('should handle invalid OTP', async () => {
      const phoneNumber = '+33612345678';
      const otp = 'invalid';
      const mockError = {
        data: null,
        error: { message: 'Invalid OTP' },
      };
      
      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue(mockError);
      
      const result = await authService.verifyOtp(phoneNumber, otp);
      
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Invalid OTP');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const mockResponse = { error: null };
      
      (supabase.auth.signOut as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await authService.signOut();
      
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should get active session', async () => {
      const mockSession = {
        data: {
          session: {
            user: { id: 'user-123' },
            access_token: 'token',
          },
        },
        error: null,
      };
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue(mockSession);
      
      const result = await authService.getSession();
      
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result.data.session).toBeDefined();
    });

    it('should handle no session', async () => {
      const mockResponse = {
        data: { session: null },
        error: null,
      };
      
      (supabase.auth.getSession as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await authService.getSession();
      
      expect(result.data.session).toBeNull();
    });
  });
});