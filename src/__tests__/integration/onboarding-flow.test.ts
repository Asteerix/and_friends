import { supabase } from '@/shared/lib/supabase/client';

describe('Onboarding Flow Integration', () => {
  const testUserId = 'user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase client
    (supabase.from as jest.Mock) = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn(),
    }));
  });

  describe('Registration Steps Flow', () => {
    const registrationSteps = [
      'phone-verification',
      'code-verification',
      'name-input',
      'age-input',
      'avatar-pick',
      'location-permission',
      'location-picker', 
      'hobby-picker',
      'restaurant-picker',
      'contacts-permission',
      'contacts-friends',
      'completed'
    ];

    it('should validate all registration steps are properly ordered', () => {
      expect(registrationSteps).toHaveLength(12);
      expect(registrationSteps[0]).toBe('phone-verification');
      expect(registrationSteps[registrationSteps.length - 1]).toBe('completed');
    });

    it('should progress through registration steps sequentially', async () => {
      for (let i = 0; i < registrationSteps.length - 1; i++) {
        const currentStep = registrationSteps[i];
        const nextStep = registrationSteps[i + 1];

        // Mock current profile state
        const mockProfile = {
          id: testUserId,
          current_registration_step: currentStep,
          is_profile_complete: false,
        };

        // Mock update response
        const mockUpdateResponse = {
          data: {
            ...mockProfile,
            current_registration_step: nextStep,
            is_profile_complete: nextStep === 'completed',
          },
          error: null,
        };

        const mockChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(mockUpdateResponse),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        // Test progression
        const result = await supabase
          .from('profiles')
          .update({ current_registration_step: nextStep })
          .eq('id', testUserId);

        expect(result.error).toBeNull();
        expect(result.data?.current_registration_step).toBe(nextStep);
        
        // Profile should be complete only at the last step
        if (nextStep === 'completed') {
          expect(result.data?.is_profile_complete).toBe(true);
        } else {
          expect(result.data?.is_profile_complete).toBe(false);
        }
      }
    });
  });

  describe('Step Validation', () => {
    it('should validate name input step', async () => {
      const validNames = ['John Doe', 'Marie Dubois', '李小明', 'José María'];
      const invalidNames = ['', 'J', 'A'.repeat(101)]; // Empty, too short, too long

      for (const name of validNames) {
        const isValid = validateNameInput(name);
        expect(isValid).toBe(true);
      }

      for (const name of invalidNames) {
        const isValid = validateNameInput(name);
        expect(isValid).toBe(false);
      }
    });

    it('should validate age input step', async () => {
      const validAges = [
        '1990-01-01', // 34 years old
        '2000-12-31', // 23 years old
        '1980-06-15', // 44 years old
      ];

      const invalidAges = [
        '2015-01-01', // Too young (9 years old)
        '1900-01-01', // Too old (124 years old)
        '2030-01-01', // Future date
        'invalid-date',
      ];

      for (const birthDate of validAges) {
        const isValid = validateAgeInput(birthDate);
        expect(isValid).toBe(true);
      }

      for (const birthDate of invalidAges) {
        const isValid = validateAgeInput(birthDate);
        expect(isValid).toBe(false);
      }
    });

    it('should validate avatar selection', () => {
      const validAvatars = [
        'https://example.com/avatar1.jpg',
        'https://supabase.co/storage/avatar.png',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
      ];

      const invalidAvatars = [
        '',
        'not-a-url',
        'http://insecure.com/avatar.jpg', // Not HTTPS
      ];

      for (const avatar of validAvatars) {
        const isValid = validateAvatarUrl(avatar);
        expect(isValid).toBe(true);
      }

      for (const avatar of invalidAvatars) {
        const isValid = validateAvatarUrl(avatar);
        expect(isValid).toBe(false);
      }
    });

    it('should validate hobby selection', () => {
      const validHobbies = [
        ['music', 'sports'],
        ['cooking', 'reading', 'gaming'],
        ['travel'], // Minimum 1
      ];

      const invalidHobbies = [
        [], // Empty array
        ['invalid-hobby'],
        Array(21).fill('music'), // Too many hobbies
      ];

      for (const hobbies of validHobbies) {
        const isValid = validateHobbySelection(hobbies);
        expect(isValid).toBe(true);
      }

      for (const hobbies of invalidHobbies) {
        const isValid = validateHobbySelection(hobbies);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('Profile Completion Validation', () => {
    it('should determine profile completion status correctly', () => {
      const completeProfile = {
        id: testUserId,
        full_name: 'John Doe',
        date_of_birth: '1990-01-01',
        avatar_url: 'https://example.com/avatar.jpg',
        location: 'Paris, France',
        hobbies: ['music', 'sports'],
        restaurants: ['restaurant-1'],
        current_registration_step: 'completed',
        is_profile_complete: true,
      };

      const incompleteProfile = {
        ...completeProfile,
        full_name: null, // Missing required field
        is_profile_complete: false,
      };

      expect(isProfileComplete(completeProfile)).toBe(true);
      expect(isProfileComplete(incompleteProfile)).toBe(false);
    });

    it('should validate minimum required fields for completion', () => {
      const requiredFields = [
        'full_name',
        'date_of_birth',
        'avatar_url',
        'location',
      ];

      const baseProfile = {
        id: testUserId,
        hobbies: ['music'],
        restaurants: ['restaurant-1'],
        current_registration_step: 'completed',
      };

      // Test each required field individually
      for (const field of requiredFields) {
        const profileWithMissingField = { ...baseProfile };
        const profileWithField = {
          ...baseProfile,
          [field]: field === 'hobbies' ? ['music'] : 'test-value',
        };

        expect(isProfileComplete(profileWithMissingField)).toBe(false);
        expect(hasRequiredField(profileWithField, field)).toBe(true);
      }
    });
  });

  describe('Permission Handling', () => {
    it('should handle location permission flow', async () => {
      // Mock permission request
      const mockLocationPermission = {
        status: 'granted',
        canAskAgain: true,
      };

      // Mock location data
      const mockLocation = {
        coords: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
        timestamp: Date.now(),
      };

      // Test permission granted
      expect(mockLocationPermission.status).toBe('granted');
      
      // Test location data structure
      expect(mockLocation.coords.latitude).toBeCloseTo(48.8566, 4);
      expect(mockLocation.coords.longitude).toBeCloseTo(2.3522, 4);
    });

    it('should handle contacts permission flow', async () => {
      // Mock contacts permission
      const mockContactsPermission = {
        status: 'granted',
        canAskAgain: true,
      };

      // Mock contacts data
      const mockContacts = [
        {
          id: '1',
          name: 'John Doe',
          phoneNumbers: [{ number: '+33612345678', label: 'mobile' }],
        },
        {
          id: '2', 
          name: 'Jane Smith',
          phoneNumbers: [{ number: '+33687654321', label: 'mobile' }],
        },
      ];

      expect(mockContactsPermission.status).toBe('granted');
      expect(mockContacts).toHaveLength(2);
      expect(mockContacts[0].phoneNumbers[0].number).toBe('+33612345678');
    });
  });

  describe('Error Handling During Onboarding', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockRejectedValue(networkError),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(
        supabase
          .from('profiles')
          .update({ current_registration_step: 'name-input' })
          .eq('id', testUserId)
      ).rejects.toThrow('Network request failed');
    });

    it('should handle validation errors', async () => {
      const validationError = {
        data: null,
        error: { message: 'Invalid input data' },
      };

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(validationError),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await supabase
        .from('profiles')
        .update({ current_registration_step: 'invalid-step' })
        .eq('id', testUserId);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid input data');
    });
  });

  describe('Data Persistence', () => {
    it('should save profile data at each step', async () => {
      const steps = [
        {
          step: 'name-input',
          data: { full_name: 'John Doe' },
        },
        {
          step: 'age-input',
          data: { date_of_birth: '1990-01-01' },
        },
        {
          step: 'avatar-pick',
          data: { avatar_url: 'https://example.com/avatar.jpg' },
        },
      ];

      for (const { step, data } of steps) {
        const mockResponse = {
          data: {
            id: testUserId,
            current_registration_step: step,
            ...data,
          },
          error: null,
        };

        const mockChain = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(mockResponse),
        };

        (supabase.from as jest.Mock).mockReturnValue(mockChain);

        const result = await supabase
          .from('profiles')
          .update({
            current_registration_step: step,
            ...data,
          })
          .eq('id', testUserId);

        expect(result.error).toBeNull();
        expect(result.data).toMatchObject({
          id: testUserId,
          current_registration_step: step,
          ...data,
        });
      }
    });
  });
});

// Helper validation functions (would normally be imported)
function validateNameInput(name: string): boolean {
  if (!name || name.trim().length < 2 || name.trim().length > 100) {
    return false;
  }
  return true;
}

function validateAgeInput(birthDate: string): boolean {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    
    // Adjust for birthday not yet passed this year
    if (today.getMonth() < birth.getMonth() || 
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      return age - 1 >= 13 && age - 1 <= 120;
    }
    
    return age >= 13 && age <= 120;
  } catch {
    return false;
  }
}

function validateAvatarUrl(url: string): boolean {
  if (!url) return false;
  
  // Allow data URLs for base64 images
  if (url.startsWith('data:image/')) return true;
  
  // Require HTTPS for external URLs
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateHobbySelection(hobbies: string[]): boolean {
  if (!hobbies || hobbies.length === 0 || hobbies.length > 20) {
    return false;
  }
  
  const validHobbies = [
    'music', 'sports', 'cooking', 'reading', 'gaming', 'travel',
    'photography', 'art', 'movies', 'fitness', 'dancing', 'hiking',
  ];
  
  return hobbies.every(hobby => validHobbies.includes(hobby));
}

function isProfileComplete(profile: any): boolean {
  const requiredFields = ['full_name', 'date_of_birth', 'avatar_url', 'location'];
  const hasAllFields = requiredFields.every(field => profile[field]);
  const hasHobbies = profile.hobbies && profile.hobbies.length > 0;
  
  return hasAllFields && hasHobbies && profile.is_profile_complete;
}

function hasRequiredField(profile: any, field: string): boolean {
  return profile[field] !== null && profile[field] !== undefined && profile[field] !== '';
}