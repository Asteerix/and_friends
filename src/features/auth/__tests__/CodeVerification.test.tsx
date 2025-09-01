import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CodeVerificationScreen from '../screens/CodeVerificationScreen';
import { supabase } from '@/shared/lib/supabase/client';
import { recordFailedOTPAttempt } from '@/shared/utils/bruteforceProtection';

jest.mock('@/shared/lib/supabase/client');
jest.mock('@/shared/utils/bruteforceProtection');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      phoneNumber: '+33612345678',
    },
  }),
}));

describe('CodeVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render code verification screen with 6 input fields', () => {
    const { getAllByTestId } = render(<CodeVerificationScreen />);
    const codeInputs = getAllByTestId(/code-input-/);
    expect(codeInputs).toHaveLength(6);
  });

  it('should auto-focus next input when digit is entered', async () => {
    const { getAllByTestId } = render(<CodeVerificationScreen />);
    const codeInputs = getAllByTestId(/code-input-/);
    
    await act(async () => {
      fireEvent.changeText(codeInputs[0], '1');
    });
    
    await waitFor(() => {
      expect(codeInputs[1].props.autoFocus).toBeTruthy();
    });
  });

  it('should verify OTP code when all 6 digits are entered', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: {
        session: { access_token: 'token123' },
        user: { id: 'user123', phone: '+33612345678' },
      },
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'profile123', onboarding_completed: false },
        error: null,
      }),
    });

    const navigation = { navigate: jest.fn() };
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue(navigation);

    const { getAllByTestId } = render(<CodeVerificationScreen />);
    const codeInputs = getAllByTestId(/code-input-/);
    
    const otpCode = '123456';
    for (let i = 0; i < otpCode.length; i++) {
      await act(async () => {
        fireEvent.changeText(codeInputs[i], otpCode[i]);
      });
    }

    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
        token: '123456',
        type: 'sms',
      });
    });

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('name-input');
    });
  });

  it('should handle invalid OTP code', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Code invalide' },
    });

    (recordFailedOTPAttempt as jest.Mock).mockResolvedValue({
      isBanned: false,
      remainingAttempts: 2,
    });

    const { getAllByTestId, findByText } = render(<CodeVerificationScreen />);
    const codeInputs = getAllByTestId(/code-input-/);
    
    const otpCode = '999999';
    for (let i = 0; i < otpCode.length; i++) {
      await act(async () => {
        fireEvent.changeText(codeInputs[i], otpCode[i]);
      });
    }

    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalled();
    });

    const errorMessage = await findByText(/Code invalide/);
    expect(errorMessage).toBeTruthy();
    expect(recordFailedOTPAttempt).toHaveBeenCalled();
  });

  it('should handle ban after too many failed attempts', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Code invalide' },
    });

    (recordFailedOTPAttempt as jest.Mock).mockResolvedValue({
      isBanned: true,
      banDuration: 3600,
    });

    const navigation = { navigate: jest.fn() };
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue(navigation);

    const { getAllByTestId } = render(<CodeVerificationScreen />);
    const codeInputs = getAllByTestId(/code-input-/);
    
    const otpCode = '999999';
    for (let i = 0; i < otpCode.length; i++) {
      await act(async () => {
        fireEvent.changeText(codeInputs[i], otpCode[i]);
      });
    }

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('banned', {
        banDuration: 3600,
      });
    });
  });

  it('should handle resend OTP functionality', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { getByText } = render(<CodeVerificationScreen />);
    
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      const resendButton = getByText(/Renvoyer le code/);
      expect(resendButton).toBeTruthy();
    });

    const resendButton = getByText(/Renvoyer le code/);
    fireEvent.press(resendButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
      });
    });
  });

  it('should show countdown timer for resend button', () => {
    const { getByText } = render(<CodeVerificationScreen />);
    
    expect(getByText(/Renvoyer le code dans/)).toBeTruthy();
    
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(getByText(/20s/)).toBeTruthy();
  });

  it('should handle paste functionality for OTP code', async () => {
    const clipboardMock = {
      getString: jest.fn().mockResolvedValue('123456'),
    };
    jest.spyOn(require('react-native'), 'Clipboard', 'get').mockReturnValue(clipboardMock);

    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: {
        session: { access_token: 'token123' },
        user: { id: 'user123' },
      },
      error: null,
    });

    const { getByTestId } = render(<CodeVerificationScreen />);
    const pasteButton = getByTestId('paste-button');
    
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: '+33612345678',
        token: '123456',
        type: 'sms',
      });
    });
  });
});