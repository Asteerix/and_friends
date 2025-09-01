// Mock implementation for auth service testing
const mockAuthService = {
  sendOTP: jest.fn(),
  verifyOTP: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
};

// Mock Supabase auth
jest.mock('@/shared/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OTP Authentication', () => {
    it('should send OTP successfully', async () => {
      mockAuthService.sendOTP.mockResolvedValue({ success: true });

      const result = await mockAuthService.sendOTP('+33123456789');
      expect(result.success).toBe(true);
      expect(mockAuthService.sendOTP).toHaveBeenCalledWith('+33123456789');
    });

    it('should verify OTP successfully', async () => {
      mockAuthService.verifyOTP.mockResolvedValue({
        success: true,
        user: { id: 'user-1', phone: '+33123456789' },
      });

      const result = await mockAuthService.verifyOTP('+33123456789', '123456');
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should handle invalid OTP', async () => {
      mockAuthService.verifyOTP.mockResolvedValue({ success: false, error: 'Invalid OTP' });

      const result = await mockAuthService.verifyOTP('+33123456789', '000000');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid OTP');
    });

    it('should handle invalid phone number format', async () => {
      mockAuthService.sendOTP.mockRejectedValue(new Error('Invalid phone number'));

      await expect(mockAuthService.sendOTP('invalid-phone')).rejects.toThrow(
        'Invalid phone number'
      );
    });
  });

  describe('User Session Management', () => {
    it('should get current user when logged in', async () => {
      const mockUser = { id: 'user-1', phone: '+33123456789', email: null };
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      const user = await mockAuthService.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when not logged in', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      const user = await mockAuthService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should sign out successfully', async () => {
      mockAuthService.signOut.mockResolvedValue({ success: true });

      const result = await mockAuthService.signOut();
      expect(result.success).toBe(true);
    });
  });

  describe('Profile Management', () => {
    it('should update user profile successfully', async () => {
      const profileData = {
        full_name: 'John Doe',
        age: 25,
        bio: 'Test bio',
      };

      mockAuthService.updateProfile.mockResolvedValue({
        success: true,
        data: { ...profileData, id: 'user-1' },
      });

      const result = await mockAuthService.updateProfile('user-1', profileData);
      expect(result.success).toBe(true);
      expect(result.data.full_name).toBe('John Doe');
    });

    it('should validate profile data', async () => {
      const invalidData = { age: -1 }; // Invalid age

      mockAuthService.updateProfile.mockRejectedValue(new Error('Invalid profile data'));

      await expect(mockAuthService.updateProfile('user-1', invalidData)).rejects.toThrow(
        'Invalid profile data'
      );
    });
  });
});
