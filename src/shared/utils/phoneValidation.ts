// Phone number validation utilities for international numbers

interface PhoneNumberPattern {
  countryCode: string;
  callingCode: string;
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  exampleFormat: string;
}

// Comprehensive phone number patterns for major countries
export const PHONE_PATTERNS: Record<string, PhoneNumberPattern> = {
  // North America (NANP - North American Numbering Plan)
  US: {
    countryCode: 'US',
    callingCode: '1',
    pattern: /^[2-9]\d{2}[2-9]\d{6}$/,
    minLength: 10,
    maxLength: 10,
    exampleFormat: '(201) 555-0123',
  },
  CA: {
    countryCode: 'CA',
    callingCode: '1',
    pattern: /^[2-9]\d{2}[2-9]\d{6}$/,
    minLength: 10,
    maxLength: 10,
    exampleFormat: '(416) 555-0123',
  },

  // Europe
  FR: {
    countryCode: 'FR',
    callingCode: '33',
    pattern: /^[67]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    exampleFormat: '6 12 34 56 78',
  },
  GB: {
    countryCode: 'GB',
    callingCode: '44',
    pattern: /^7[0-9]\d{8}$/,
    minLength: 10,
    maxLength: 10,
    exampleFormat: '7400 123456',
  },
  DE: {
    countryCode: 'DE',
    callingCode: '49',
    pattern: /^1[5-7]\d{8,9}$/,
    minLength: 10,
    maxLength: 11,
    exampleFormat: '151 12345678',
  },
  ES: {
    countryCode: 'ES',
    callingCode: '34',
    pattern: /^[67]\d{8}$/,
    minLength: 9,
    maxLength: 9,
    exampleFormat: '612 34 56 78',
  },
  IT: {
    countryCode: 'IT',
    callingCode: '39',
    pattern: /^3\d{8,9}$/,
    minLength: 9,
    maxLength: 10,
    exampleFormat: '312 345 6789',
  },
  NL: {
    countryCode: 'NL',
    callingCode: '31',
    pattern: /^6\d{8}$/,
    minLength: 9,
    maxLength: 9,
    exampleFormat: '6 12345678',
  },
  CH: {
    countryCode: 'CH',
    callingCode: '41',
    pattern: /^7[6-9]\d{7}$/,
    minLength: 9,
    maxLength: 9,
    exampleFormat: '79 123 45 67',
  },

  // Americas
  BR: {
    countryCode: 'BR',
    callingCode: '55',
    pattern: /^\d{2}9\d{8}$/,
    minLength: 11,
    maxLength: 11,
    exampleFormat: '(11) 98765-4321',
  },
  MX: {
    countryCode: 'MX',
    callingCode: '52',
    pattern: /^\d{10}$/,
    minLength: 10,
    maxLength: 10,
    exampleFormat: '55 1234 5678',
  },

  // Asia
  JP: {
    countryCode: 'JP',
    callingCode: '81',
    pattern: /^[7-9]0\d{8}$/,
    minLength: 10,
    maxLength: 10,
    exampleFormat: '90-1234-5678',
  },
  CN: {
    countryCode: 'CN',
    callingCode: '86',
    pattern: /^1[3-9]\d{9}$/,
    minLength: 11,
    maxLength: 11,
    exampleFormat: '138 0000 0000',
  },
  IN: {
    countryCode: 'IN',
    callingCode: '91',
    pattern: /^[6-9]\d{9}$/,
    minLength: 10,
    maxLength: 10,
    exampleFormat: '98765 43210',
  },

  // Oceania
  AU: {
    countryCode: 'AU',
    callingCode: '61',
    pattern: /^4\d{8}$/,
    minLength: 9,
    maxLength: 9,
    exampleFormat: '412 345 678',
  },
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  formattedNumber?: string;
  cleanNumber?: string;
}

/**
 * Validates a phone number for a specific country
 * @param phoneNumber - The phone number to validate (without country code)
 * @param countryCode - The ISO country code (e.g., 'FR', 'US')
 * @returns Validation result with formatted number if valid
 */
export function validatePhoneNumber(phoneNumber: string, countryCode: string): ValidationResult {
  // Handle null, undefined, or empty inputs
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required',
    };
  }

  const pattern = PHONE_PATTERNS[countryCode];

  if (!pattern) {
    return {
      isValid: false,
      error: `Validation not available for country code: ${countryCode}`,
    };
  }

  // Remove all non-digit characters for validation
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Handle empty number after cleaning
  if (!cleanNumber) {
    return {
      isValid: false,
      error: 'Phone number contains no digits',
    };
  }

  // Remove leading 0 if present (common in many countries)
  const numberWithoutLeadingZero = cleanNumber.replace(/^0/, '');

  // Check length
  if (numberWithoutLeadingZero.length < pattern.minLength) {
    return {
      isValid: false,
      error: `Phone number too short. Expected ${pattern.minLength} digits, got ${numberWithoutLeadingZero.length}`,
    };
  }

  if (numberWithoutLeadingZero.length > pattern.maxLength) {
    return {
      isValid: false,
      error: `Phone number too long. Expected max ${pattern.maxLength} digits, got ${numberWithoutLeadingZero.length}`,
    };
  }

  // Test against pattern
  if (!pattern.pattern.test(numberWithoutLeadingZero)) {
    return {
      isValid: false,
      error: `Invalid phone number format. Example: ${pattern.exampleFormat}`,
    };
  }

  // Return valid result with formatted number
  const fullNumber = `+${pattern.callingCode}${numberWithoutLeadingZero}`;

  return {
    isValid: true,
    formattedNumber: fullNumber,
    cleanNumber: numberWithoutLeadingZero,
  };
}

/**
 * Formats a phone number for display
 * @param phoneNumber - The phone number to format
 * @param countryCode - The ISO country code
 * @returns Formatted phone number string
 */
export function formatPhoneNumberForDisplay(phoneNumber: string, countryCode: string): string {
  const clean = phoneNumber.replace(/\D/g, '').replace(/^0/, '');

  switch (countryCode) {
    case 'US':
    case 'CA':
      // Format: (XXX) XXX-XXXX
      if (clean.length === 10) {
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
      }
      break;
    case 'FR':
      // Format: X XX XX XX XX
      if (clean.length === 9) {
        return `${clean[0]} ${clean.slice(1, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 9)}`;
      }
      break;
    case 'GB':
      // Format: XXXX XXXXXX
      if (clean.length === 10) {
        return `${clean.slice(0, 4)} ${clean.slice(4)}`;
      }
      break;
    case 'BR':
      // Format: (XX) XXXXX-XXXX
      if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
      }
      break;
    default:
      // Default: space every 3-4 digits
      return clean.match(/.{1,4}/g)?.join(' ') || clean;
  }

  return clean;
}

/**
 * Checks if a phone number can request a new OTP based on rate limiting
 * @param phoneNumber - The full phone number with country code
 * @returns Promise with rate limit check result
 */
export async function checkOTPRateLimit(phoneNumber: string): Promise<{
  canRequest: boolean;
  nextAllowedAt?: Date;
  timeRemainingSeconds?: number;
  message?: string;
}> {
  try {
    const { supabase } = await import('../lib/supabase/client');

    const { data, error } = await supabase.rpc('check_otp_rate_limit', { phone_num: phoneNumber });

    if (error) {
      console.error('Error checking OTP rate limit:', error);
      // On error, allow the request (fail open)
      return { canRequest: true };
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        canRequest: result.can_request,
        nextAllowedAt: result.next_allowed_at ? new Date(result.next_allowed_at) : undefined,
        timeRemainingSeconds: result.time_remaining_seconds || 0,
        message: result.can_request
          ? undefined
          : `Please wait ${Math.ceil((result.time_remaining_seconds || 0) / 60)} minutes before requesting another code`,
      };
    }

    // No rate limit found, allow request
    return { canRequest: true };
  } catch (error) {
    console.error('Error in checkOTPRateLimit:', error);
    // On error, allow the request (fail open)
    return { canRequest: true };
  }
}

/**
 * Records an OTP request for rate limiting
 * @param phoneNumber - The full phone number with country code
 * @returns Promise with the result of recording the request
 */
export async function recordOTPRequest(phoneNumber: string): Promise<{
  success: boolean;
  message: string;
  nextAllowedAt?: Date;
}> {
  try {
    const { supabase } = await import('../lib/supabase/client');

    const { data, error } = await supabase.rpc('record_otp_request', {
      phone_num: phoneNumber,
      ip_addr: null, // Would need to get from request headers in production
      user_agt: null, // Would need to get from request headers in production
    });

    if (error) {
      console.error('Error recording OTP request:', error);
      // On error, still allow the OTP to be sent
      return {
        success: true,
        message: 'OTP request processed',
      };
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        nextAllowedAt: result.next_allowed_at ? new Date(result.next_allowed_at) : undefined,
      };
    }

    return {
      success: true,
      message: 'OTP request processed',
    };
  } catch (error) {
    console.error('Error in recordOTPRequest:', error);
    // On error, still allow the OTP to be sent
    return {
      success: true,
      message: 'OTP request processed',
    };
  }
}
