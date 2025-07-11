// Advanced phone number validation and disposable number detection

interface DisposablePattern {
  prefix: string;
  country: string;
  provider: string;
}

// Known disposable/virtual number patterns
const DISPOSABLE_PATTERNS: DisposablePattern[] = [
  // France
  { prefix: '+3370', country: 'FR', provider: 'Online SMS' },
  { prefix: '+3377', country: 'FR', provider: 'Virtual Number' },
  { prefix: '+3378', country: 'FR', provider: 'Temp SMS' },
  
  // USA
  { prefix: '+1267', country: 'US', provider: 'TextNow' },
  { prefix: '+1332', country: 'US', provider: 'Talkatone' },
  { prefix: '+1469', country: 'US', provider: 'Google Voice' },
  { prefix: '+1567', country: 'US', provider: 'TextFree' },
  
  // UK
  { prefix: '+44791', country: 'GB', provider: 'Virtual UK' },
  { prefix: '+44784', country: 'GB', provider: 'Temp UK' },
];

// Suspicious number patterns
const SUSPICIOUS_PATTERNS = [
  /(\d)\1{4,}/, // Repeated digits (11111, 22222, etc.)
  /^(\+\d{1,3})?0{5,}/, // Many zeros
  /^(\+\d{1,3})?123456/, // Sequential numbers
  /^(\+\d{1,3})?111111/, // All ones
  /^(\+\d{1,3})?999999/, // All nines
];

export interface PhoneValidationResult {
  isValid: boolean;
  isSuspicious: boolean;
  isDisposable: boolean;
  riskScore: number; // 0-100, higher = more risky
  reason?: string;
  suggestions?: string[];
}

/**
 * Enhanced phone number validation with fraud detection
 */
export class PhoneNumberValidator {
  /**
   * Comprehensive phone validation
   */
  static validate(phoneNumber: string, countryCode: string): PhoneValidationResult {
    const result: PhoneValidationResult = {
      isValid: true,
      isSuspicious: false,
      isDisposable: false,
      riskScore: 0,
      suggestions: []
    };
    
    // Basic format validation
    if (!phoneNumber || phoneNumber.length < 6) {
      result.isValid = false;
      result.reason = 'Numéro trop court';
      return result;
    }
    
    // Check for disposable numbers
    const disposableCheck = this.checkDisposable(phoneNumber);
    if (disposableCheck.isDisposable) {
      result.isDisposable = true;
      result.riskScore += 50;
      result.reason = disposableCheck.reason;
      result.suggestions?.push('Utilisez votre numéro personnel');
    }
    
    // Check for suspicious patterns
    const suspiciousCheck = this.checkSuspicious(phoneNumber);
    if (suspiciousCheck.isSuspicious) {
      result.isSuspicious = true;
      result.riskScore += 30;
      result.reason = suspiciousCheck.reason;
    }
    
    // Check number sequence
    if (this.hasSequentialDigits(phoneNumber)) {
      result.isSuspicious = true;
      result.riskScore += 20;
      result.suggestions?.push('Évitez les numéros séquentiels');
    }
    
    // Country-specific validation
    const countryCheck = this.validateCountrySpecific(phoneNumber, countryCode);
    if (!countryCheck.isValid) {
      result.isValid = false;
      result.reason = countryCheck.reason;
      result.riskScore += 10;
    }
    
    // Calculate final risk score
    result.riskScore = Math.min(100, result.riskScore);
    
    // High risk numbers should be treated as invalid
    if (result.riskScore >= 70) {
      result.isValid = false;
      result.reason = result.reason || 'Numéro à risque élevé';
    }
    
    return result;
  }
  
  /**
   * Check if number is from disposable service
   */
  private static checkDisposable(phoneNumber: string): {
    isDisposable: boolean;
    reason?: string;
  } {
    const normalized = phoneNumber.replace(/\s/g, '');
    
    for (const pattern of DISPOSABLE_PATTERNS) {
      if (normalized.startsWith(pattern.prefix)) {
        return {
          isDisposable: true,
          reason: `Numéro virtuel détecté (${pattern.provider})`
        };
      }
    }
    
    return { isDisposable: false };
  }
  
  /**
   * Check for suspicious patterns
   */
  private static checkSuspicious(phoneNumber: string): {
    isSuspicious: boolean;
    reason?: string;
  } {
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          isSuspicious: true,
          reason: 'Format de numéro suspect'
        };
      }
    }
    
    return { isSuspicious: false };
  }
  
  /**
   * Check for sequential digits
   */
  private static hasSequentialDigits(phoneNumber: string): boolean {
    const digits = phoneNumber.replace(/[^\d]/g, '');
    
    // Check for ascending sequence (123456)
    let ascending = 0;
    let descending = 0;
    
    for (let i = 1; i < digits.length; i++) {
      const curr = parseInt(digits[i]);
      const prev = parseInt(digits[i - 1]);
      
      if (curr === prev + 1) {
        ascending++;
        if (ascending >= 4) return true;
      } else {
        ascending = 0;
      }
      
      if (curr === prev - 1) {
        descending++;
        if (descending >= 4) return true;
      } else {
        descending = 0;
      }
    }
    
    return false;
  }
  
  /**
   * Country-specific validation rules
   */
  private static validateCountrySpecific(phoneNumber: string, countryCode: string): {
    isValid: boolean;
    reason?: string;
  } {
    const normalized = phoneNumber.replace(/[^\d]/g, '').replace(/^0/, '');
    
    switch (countryCode) {
      case 'FR':
        // French mobile numbers start with 6 or 7
        if (!normalized.match(/^[67]\d{8}$/)) {
          return {
            isValid: false,
            reason: 'Format invalide pour un numéro français'
          };
        }
        break;
        
      case 'US':
      case 'CA':
        // NANP format validation
        if (!normalized.match(/^[2-9]\d{2}[2-9]\d{6}$/)) {
          return {
            isValid: false,
            reason: 'Format invalide pour un numéro nord-américain'
          };
        }
        break;
        
      case 'GB':
        // UK mobile numbers
        if (!normalized.match(/^7[0-9]\d{8}$/)) {
          return {
            isValid: false,
            reason: 'Format invalide pour un numéro britannique'
          };
        }
        break;
    }
    
    return { isValid: true };
  }
  
  /**
   * Generate risk assessment message
   */
  static getRiskMessage(result: PhoneValidationResult): string | null {
    if (result.riskScore < 30) return null;
    
    if (result.isDisposable) {
      return 'Ce numéro semble être temporaire. Utilisez votre numéro personnel pour continuer.';
    }
    
    if (result.isSuspicious) {
      return 'Ce numéro présente des caractéristiques inhabituelles.';
    }
    
    if (result.riskScore >= 70) {
      return 'Ce numéro ne peut pas être utilisé pour la vérification.';
    }
    
    return null;
  }
}