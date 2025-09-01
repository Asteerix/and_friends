import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';
import { validatePhoneNumber, checkOTPRateLimit, recordOTPRequest } from '@/shared/utils/phoneValidation';
import { supabase } from '@/shared/lib/supabase/client';

jest.mock('@/shared/utils/phoneValidation');
jest.mock('@/shared/lib/supabase/client');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('PhoneVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render phone verification screen correctly', () => {
    const { getByText, getByPlaceholderText } = render(<PhoneVerificationScreen />);
    
    expect(getByText('Vérifiez votre numéro')).toBeTruthy();
    expect(getByPlaceholderText('06 12 34 56 78')).toBeTruthy();
  });

  it('should validate French phone number format', async () => {
    (validatePhoneNumber as jest.Mock).mockReturnValue({
      isValid: true,
      formattedNumber: '+33612345678',
      cleanNumber: '33612345678',
      error: null,
    });

    const { getByPlaceholderText, getByText } = render(<PhoneVerificationScreen />);
    const phoneInput = getByPlaceholderText('06 12 34 56 78');
    const submitButton = getByText('Continuer');

    fireEvent.changeText(phoneInput, '0612345678');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(validatePhoneNumber).toHaveBeenCalledWith('0612345678', 'FR');
    });
  });

  it('should show error for invalid phone number', async () => {
    (validatePhoneNumber as jest.Mock).mockReturnValue({
      isValid: false,
      formattedNumber: '',
      cleanNumber: '',
      error: 'Numéro invalide',
    });

    const { getByPlaceholderText, getByText, findByText } = render(<PhoneVerificationScreen />);
    const phoneInput = getByPlaceholderText('06 12 34 56 78');
    const submitButton = getByText('Continuer');

    fireEvent.changeText(phoneInput, '123');
    fireEvent.press(submitButton);

    const errorMessage = await findByText('Numéro invalide');
    expect(errorMessage).toBeTruthy();
  });

  it('should handle rate limiting for OTP requests', async () => {
    (validatePhoneNumber as jest.Mock).mockReturnValue({
      isValid: true,
      formattedNumber: '+33612345678',
      cleanNumber: '33612345678',
      error: null,
    });
    
    (checkOTPRateLimit as jest.Mock).mockResolvedValue({
      canRequest: false,
      remainingTime: 30,
    });

    const { getByPlaceholderText, getByText, findByText } = render(<PhoneVerificationScreen />);
    const phoneInput = getByPlaceholderText('06 12 34 56 78');
    const submitButton = getByText('Continuer');

    fireEvent.changeText(phoneInput, '0612345678');
    fireEvent.press(submitButton);

    const rateLimitMessage = await findByText(/Veuillez patienter/);
    expect(rateLimitMessage).toBeTruthy();
  });

  it('should successfully send OTP when all validations pass', async () => {
    (validatePhoneNumber as jest.Mock).mockReturnValue({
      isValid: true,
      formattedNumber: '+33612345678',
      cleanNumber: '33612345678',
      error: null,
    });
    
    (checkOTPRateLimit as jest.Mock).mockResolvedValue({
      canRequest: true,
    });
    
    (recordOTPRequest as jest.Mock).mockResolvedValue({
      success: true,
      message: 'OTP envoyé',
    });
    
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    const navigation = { navigate: jest.fn() };
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue(navigation);

    const { getByPlaceholderText, getByText } = render(<PhoneVerificationScreen />);
    const phoneInput = getByPlaceholderText('06 12 34 56 78');
    const submitButton = getByText('Continuer');

    fireEvent.changeText(phoneInput, '0612345678');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
      });
      expect(navigation.navigate).toHaveBeenCalledWith('code-verification', {
        phoneNumber: '+33612345678',
      });
    });
  });

  it('should handle Supabase errors gracefully', async () => {
    (validatePhoneNumber as jest.Mock).mockReturnValue({
      isValid: true,
      formattedNumber: '+33612345678',
      cleanNumber: '33612345678',
      error: null,
    });
    
    (checkOTPRateLimit as jest.Mock).mockResolvedValue({
      canRequest: true,
    });
    
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Service temporairement indisponible' },
    });

    const { getByPlaceholderText, getByText, findByText } = render(<PhoneVerificationScreen />);
    const phoneInput = getByPlaceholderText('06 12 34 56 78');
    const submitButton = getByText('Continuer');

    fireEvent.changeText(phoneInput, '0612345678');
    fireEvent.press(submitButton);

    const errorMessage = await findByText('Service temporairement indisponible');
    expect(errorMessage).toBeTruthy();
  });
});