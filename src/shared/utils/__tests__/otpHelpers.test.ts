import { 
  sendOTPWithRetry, 
  checkSMSProviderStatus, 
  formatPhoneForSupabase, 
  validatePhoneNumber, 
  showSMSTroubleshootingDialog 
} from '../otpHelpers';
import { supabase } from '@/shared/lib/supabase/client';
import { OTPCache } from '../otpCache';
import { NetworkRetry } from '../networkRetry';
import { PhoneNumberValidator } from '../phoneNumberValidation';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('../otpCache');
jest.mock('../networkRetry');
jest.mock('../phoneNumberValidation');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockOTPCache = OTPCache as jest.Mocked<typeof OTPCache>;
const mockNetworkRetry = NetworkRetry as jest.Mocked<typeof NetworkRetry>;
const mockPhoneValidator = PhoneNumberValidator as jest.Mocked<typeof PhoneNumberValidator>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

describe('otpHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockOTPCache.hasRecentOTP.mockResolvedValue({
      hasRecent: false,
      canResend: true,
      timeRemaining: 0,
    });
    
    mockOTPCache.recordOTPSent.mockResolvedValue();
    
    mockNetworkRetry.checkNetwork.mockResolvedValue({
      type: 'cellular',
      isConnected: true,
      strength: 'strong',
    });
    
    mockNetworkRetry.withRetry.mockImplementation(async (fn) => {
      return await fn();
    });
    
    mockSupabase.auth.signInWithOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
  });

  describe('sendOTPWithRetry', () => {
    const validPhone = '+33612345678';

    it('should successfully send OTP', async () => {
      const result = await sendOTPWithRetry({ phone: validPhone });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.cached).toBeUndefined();
      
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: validPhone,
        options: {
          channel: 'sms',
          shouldCreateUser: true,
          data: {
            source: 'and_friends_app',
            timestamp: expect.any(String),
            network_type: 'cellular',
          },
        },
      });
      
      expect(mockOTPCache.recordOTPSent).toHaveBeenCalledWith(validPhone);
    });

    it('should return cached result when recent OTP exists', async () => {
      mockOTPCache.hasRecentOTP.mockResolvedValue({
        hasRecent: true,
        canResend: false,
        timeRemaining: 45,
      });

      const result = await sendOTPWithRetry({ phone: validPhone });

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.error).toBe('Code déjà envoyé. Expire dans 45s');
      expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('should use WhatsApp channel when specified', async () => {
      const result = await sendOTPWithRetry({ 
        phone: validPhone, 
        channel: 'whatsapp' 
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: validPhone,
        options: {
          channel: 'whatsapp',
          shouldCreateUser: true,
          data: expect.any(Object),
        },
      });
    });

    it('should handle Supabase errors gracefully', async () => {
      const error = { message: 'Rate limit exceeded' };
      mockSupabase.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error,
      });

      mockNetworkRetry.withRetry.mockRejectedValue(error);

      const result = await sendOTPWithRetry({ phone: validPhone });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trop de tentatives. Veuillez attendre quelques minutes.');
    });

    it('should retry on network failures', async () => {
      let attemptCount = 0;
      mockNetworkRetry.withRetry.mockImplementation(async (fn, options) => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network timeout');
        }
        return await fn();
      });

      const result = await sendOTPWithRetry({ 
        phone: validPhone 
      }, { 
        maxRetries: 3 
      });

      expect(result.success).toBe(true);
      expect(mockNetworkRetry.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: expect.any(Function),
        }
      );
    });

    it('should handle various error types with appropriate messages', async () => {
      const errorTests = [
        { error: 'Invalid phone number format', expected: 'Numéro de téléphone invalide. Vérifiez le format.' },
        { error: 'Quota exceeded', expected: 'Service temporairement indisponible. Réessayez dans quelques instants.' },
        { error: 'Network error', expected: 'Problème de connexion. Vérifiez votre connexion internet.' },
        { error: 'Blocked for spam', expected: 'Ce numéro semble être bloqué. Contactez le support.' },
        { error: 'Unknown error', expected: 'Impossible d\'envoyer le SMS. Veuillez réessayer.' },
      ];

      for (const { error, expected } of errorTests) {
        mockNetworkRetry.withRetry.mockRejectedValue(new Error(error));

        const result = await sendOTPWithRetry({ phone: validPhone });

        expect(result.success).toBe(false);
        expect(result.error).toBe(expected);
      }
    });

    it('should handle empty or null errors', async () => {
      mockNetworkRetry.withRetry.mockRejectedValue(null);

      const result = await sendOTPWithRetry({ phone: validPhone });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erreur inconnue lors de l\'envoi du SMS');
    });

    it('should include network type in metadata', async () => {
      mockNetworkRetry.checkNetwork.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        strength: 'excellent',
      });

      await sendOTPWithRetry({ phone: validPhone });

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: validPhone,
        options: {
          channel: 'sms',
          shouldCreateUser: true,
          data: {
            source: 'and_friends_app',
            timestamp: expect.any(String),
            network_type: 'wifi',
          },
        },
      });
    });

    it('should handle createUser option correctly', async () => {
      await sendOTPWithRetry({ 
        phone: validPhone, 
        createUser: false 
      });

      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: validPhone,
        options: {
          channel: 'sms',
          shouldCreateUser: false,
          data: expect.any(Object),
        },
      });
    });

    it('should respect custom retry options', async () => {
      mockNetworkRetry.withRetry.mockRejectedValue(new Error('Network error'));

      await sendOTPWithRetry({ phone: validPhone }, {
        maxRetries: 5,
        retryDelay: 2000,
      });

      expect(mockNetworkRetry.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxRetries: 5,
          initialDelay: 2000,
          onRetry: expect.any(Function),
        }
      );
    });
  });

  describe('checkSMSProviderStatus', () => {
    it('should return configured status when auth is working', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await checkSMSProviderStatus();

      expect(result.isConfigured).toBe(true);
      expect(result.provider).toBe('twilio');
      expect(result.error).toBeUndefined();
    });

    it('should return unconfigured when auth fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth error' },
      });

      const result = await checkSMSProviderStatus();

      expect(result.isConfigured).toBe(false);
      expect(result.error).toBe('Cannot verify SMS configuration');
    });

    it('should handle exceptions gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network failure'));

      const result = await checkSMSProviderStatus();

      expect(result.isConfigured).toBe(false);
      expect(result.error).toBe('SMS provider check failed');
    });
  });

  describe('formatPhoneForSupabase', () => {
    it('should format French phone number correctly', () => {
      const testCases = [
        { input: '0612345678', country: '33', expected: '+33612345678' },
        { input: '06 12 34 56 78', country: '33', expected: '+33612345678' },
        { input: '06-12-34-56-78', country: '33', expected: '+33612345678' },
        { input: '06.12.34.56.78', country: '33', expected: '+33612345678' },
      ];

      testCases.forEach(({ input, country, expected }) => {
        const result = formatPhoneForSupabase(input, country);
        expect(result).toBe(expected);
      });
    });

    it('should handle numbers already with country codes', () => {
      const alreadyFormatted = '+33612345678';
      const result = formatPhoneForSupabase(alreadyFormatted, '33');
      
      expect(result).toBe(alreadyFormatted);
    });

    it('should remove leading zeros', () => {
      const number = '0033612345678';
      const result = formatPhoneForSupabase(number, '33');
      
      expect(result).toBe('+3333612345678'); // Will add country code to cleaned number
    });

    it('should handle various country codes', () => {
      const testCases = [
        { input: '4155552671', country: '1', expected: '+14155552671' },
        { input: '7400123456', country: '44', expected: '+447400123456' },
        { input: '151234567', country: '49', expected: '+49151234567' },
      ];

      testCases.forEach(({ input, country, expected }) => {
        const result = formatPhoneForSupabase(input, country);
        expect(result).toBe(expected);
      });
    });

    it('should handle empty inputs gracefully', () => {
      const result = formatPhoneForSupabase('', '33');
      expect(result).toBe('+33');
    });

    it('should remove special characters', () => {
      const messyNumber = '+(33) 6-12.34/56*78';
      const result = formatPhoneForSupabase(messyNumber, '33');
      expect(result).toBe('+33612345678');
    });
  });

  describe('validatePhoneNumber', () => {
    beforeEach(() => {
      mockPhoneValidator.validate.mockReturnValue({
        isValid: true,
        isSuspicious: false,
        isDisposable: false,
        riskScore: 0,
      });
      
      mockPhoneValidator.getRiskMessage.mockReturnValue(null);
    });

    it('should validate correct international numbers', () => {
      const validNumbers = [
        '+33612345678',
        '+14155552671',
        '+447400123456',
      ];

      validNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject numbers without country code', () => {
      const numbersWithoutPlus = [
        '33612345678',
        '14155552671',
        '0612345678',
      ];

      numbersWithoutPlus.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Le numéro doit commencer par +');
      });
    });

    it('should reject numbers that are too short', () => {
      const shortNumbers = [
        '+33123',
        '+1555',
        '+44789',
      ];

      shortNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Numéro trop court');
      });
    });

    it('should reject numbers that are too long', () => {
      const longNumbers = [
        '+331234567890123456', // Too many digits
        '+14155552671123456789',
      ];

      longNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Numéro trop long');
      });
    });

    it('should use advanced validation when country code provided', () => {
      const phone = '+33612345678';
      const countryCode = 'FR';

      validatePhoneNumber(phone, countryCode);

      expect(mockPhoneValidator.validate).toHaveBeenCalledWith(phone, countryCode);
      expect(mockPhoneValidator.getRiskMessage).toHaveBeenCalled();
    });

    it('should return validation error from PhoneNumberValidator', () => {
      mockPhoneValidator.validate.mockReturnValue({
        isValid: false,
        isSuspicious: false,
        isDisposable: false,
        riskScore: 0,
        reason: 'Format invalide',
      });

      const result = validatePhoneNumber('+33512345678', 'FR');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Format invalide');
    });

    it('should return risk warning when present', () => {
      mockPhoneValidator.getRiskMessage.mockReturnValue('Numéro suspect');

      const result = validatePhoneNumber('+33612345678', 'FR');

      expect(result.isValid).toBe(true);
      expect(result.riskWarning).toBe('Numéro suspect');
    });

    it('should handle numbers with formatting', () => {
      const formattedNumbers = [
        '+33 6 12 34 56 78',
        '+33-6-12-34-56-78',
        '+33 (6) 12-34-56-78',
      ];

      formattedNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(true);
      });
    });

    it('should count digits correctly ignoring formatting', () => {
      const number = '+33 (6) 12-34-56-78'; // 10 digits after country code
      const result = validatePhoneNumber(number);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle edge case lengths (exactly 10 and 15 digits)', () => {
      const tenDigits = '+1234567890'; // Exactly 10 digits
      const fifteenDigits = '+123456789012345'; // Exactly 15 digits
      
      expect(validatePhoneNumber(tenDigits).isValid).toBe(true);
      expect(validatePhoneNumber(fifteenDigits).isValid).toBe(true);
    });
  });

  describe('showSMSTroubleshootingDialog', () => {
    it('should show main troubleshooting dialog', () => {
      showSMSTroubleshootingDialog();

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Vous ne recevez pas le SMS ?',
        'Voici quelques solutions :',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Vérifier mes SMS' }),
          expect.objectContaining({ text: 'Mon numéro est correct ?' }),
          expect.objectContaining({ text: 'Utiliser WhatsApp' }),
          expect.objectContaining({ text: 'Fermer', style: 'cancel' }),
        ])
      );
    });

    it('should show SMS verification dialog when first option pressed', () => {
      mockAlert.alert.mockImplementation((title, message, buttons) => {
        // Simulate pressing the first button
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      });

      showSMSTroubleshootingDialog();

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Vérifiez vos SMS',
        '• Regardez dans vos spams/SMS filtrés\n• Le SMS vient de "Supabase" ou d\'un numéro court\n• Attendez 1-2 minutes\n• Vérifiez que votre téléphone a du réseau',
        [{ text: 'OK' }]
      );
    });

    it('should show number format dialog when second option pressed', () => {
      let capturedOnPress: (() => void) | undefined;

      mockAlert.alert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1] && buttons[1].onPress) {
          capturedOnPress = buttons[1].onPress;
        }
      });

      showSMSTroubleshootingDialog();
      
      // Call the captured onPress function
      if (capturedOnPress) {
        capturedOnPress();
      }

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Format du numéro',
        expect.stringContaining('Le numéro doit être au format international'),
        [{ text: 'Compris' }]
      );
    });

    it('should show WhatsApp dialog when third option pressed', () => {
      let capturedOnPress: (() => void) | undefined;

      mockAlert.alert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[2] && buttons[2].onPress) {
          capturedOnPress = buttons[2].onPress;
        }
      });

      showSMSTroubleshootingDialog();
      
      if (capturedOnPress) {
        capturedOnPress();
      }

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'SMS via WhatsApp',
        'Bientôt disponible ! Cette option permettra de recevoir le code via WhatsApp.',
        [{ text: 'OK' }]
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle OTP cache errors gracefully', async () => {
      mockOTPCache.hasRecentOTP.mockRejectedValue(new Error('Cache error'));

      const result = await sendOTPWithRetry({ phone: '+33612345678' });

      // Should continue despite cache error
      expect(result.success).toBe(true);
    });

    it('should handle network check failures', async () => {
      mockNetworkRetry.checkNetwork.mockRejectedValue(new Error('Network check failed'));

      const result = await sendOTPWithRetry({ phone: '+33612345678' });

      // Should still work, just without network type in metadata
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
        options: expect.objectContaining({
          data: expect.objectContaining({
            source: 'and_friends_app',
            timestamp: expect.any(String),
            // network_type might be missing or undefined
          }),
        }),
      });
    });

    it('should handle malformed error objects', async () => {
      const malformedErrors = [
        { notAMessage: 'wrong property' },
        null,
        undefined,
        'string error',
        123,
      ];

      for (const error of malformedErrors) {
        mockNetworkRetry.withRetry.mockRejectedValue(error);

        const result = await sendOTPWithRetry({ phone: '+33612345678' });

        expect(result.success).toBe(false);
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle concurrent OTP requests', async () => {
      const phone = '+33612345678';
      
      const promises = Array.from({ length: 5 }, () => 
        sendOTPWithRetry({ phone })
      );

      const results = await Promise.all(promises);

      // All should complete without errors
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle very long phone numbers in formatting', () => {
      const veryLongNumber = '0612345678901234567890123456789';
      const result = formatPhoneForSupabase(veryLongNumber, '33');
      
      expect(result).toContain('+33');
      expect(result.length).toBeGreaterThan(3);
    });

    it('should handle special characters in phone numbers', () => {
      const specialNumbers = [
        '+33(6)12-34-56-78',
        '+33 6.12.34.56.78',
        '+33/6\\12*34#56&78',
      ];

      specialNumbers.forEach(number => {
        const result = formatPhoneForSupabase(number, '33');
        // Should remove special characters
        expect(result).toMatch(/^\+\d+$/);
      });
    });

    it('should validate minimum phone number requirements', () => {
      const bareMinimum = '+1234567890'; // Exactly 10 digits
      const result = validatePhoneNumber(bareMinimum);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle Unicode characters in phone numbers', () => {
      const unicodeNumbers = [
        '+33612345678\u200B', // Zero-width space
        '\u202A+33612345678\u202C', // Directional marks
      ];

      unicodeNumbers.forEach(number => {
        const result = formatPhoneForSupabase(number, '33');
        expect(result).toMatch(/^\+\d+$/);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle full OTP flow with validation and caching', async () => {
      const phone = '0612345678';
      const countryCode = '33';
      
      // Format the phone number
      const formattedPhone = formatPhoneForSupabase(phone, countryCode);
      expect(formattedPhone).toBe('+33612345678');
      
      // Validate the formatted number
      const validation = validatePhoneNumber(formattedPhone, 'FR');
      expect(validation.isValid).toBe(true);
      
      // Send OTP
      const result = await sendOTPWithRetry({ phone: formattedPhone });
      expect(result.success).toBe(true);
    });

    it('should handle error recovery flow', async () => {
      const phone = '+33612345678';
      
      // First attempt fails
      mockNetworkRetry.withRetry.mockRejectedValueOnce(new Error('Rate limit'));
      
      let result = await sendOTPWithRetry({ phone });
      expect(result.success).toBe(false);
      expect(result.error).toContain('tentatives');
      
      // Second attempt after rate limit passes
      mockNetworkRetry.withRetry.mockResolvedValueOnce({ data: {}, error: null });
      
      result = await sendOTPWithRetry({ phone });
      expect(result.success).toBe(true);
    });

    it('should handle cache expiration correctly', async () => {
      const phone = '+33612345678';
      
      // First call - cache miss
      mockOTPCache.hasRecentOTP.mockResolvedValueOnce({
        hasRecent: false,
        canResend: true,
        timeRemaining: 0,
      });
      
      let result = await sendOTPWithRetry({ phone });
      expect(result.success).toBe(true);
      expect(result.cached).toBeUndefined();
      
      // Second call - cache hit
      mockOTPCache.hasRecentOTP.mockResolvedValueOnce({
        hasRecent: true,
        canResend: false,
        timeRemaining: 30,
      });
      
      result = await sendOTPWithRetry({ phone });
      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
    });
  });
});