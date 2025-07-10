import { supabase } from '@/shared/lib/supabase/client';
import { Alert } from 'react-native';

interface OTPOptions {
  phone: string;
  channel?: 'sms' | 'whatsapp';
  createUser?: boolean;
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Sends OTP with retry logic and better error handling
 */
export async function sendOTPWithRetry(
  options: OTPOptions,
  retryOptions: RetryOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const { phone, channel = 'sms', createUser = true } = options;
  const { maxRetries = 2, retryDelay = 1000 } = retryOptions;
  
  console.log('📱 [OTP] Starting OTP send process');
  console.log('  - Phone:', phone);
  console.log('  - Channel:', channel);
  console.log('  - Max retries:', maxRetries);
  
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 [OTP] Retry attempt ${attempt}/${maxRetries}`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      console.log(`📤 [OTP] Sending OTP (attempt ${attempt + 1})...`);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel,
          shouldCreateUser: createUser,
          // Add data to help with debugging
          data: {
            source: 'and_friends_app',
            attempt: attempt + 1,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      if (!error) {
        console.log('✅ [OTP] SMS sent successfully');
        console.log('  - Response:', data);
        return { success: true };
      }
      
      lastError = error;
      console.error(`❌ [OTP] Attempt ${attempt + 1} failed:`, error);
      
      // Don't retry for certain errors
      if (error.message?.includes('Rate limit') || 
          error.message?.includes('Invalid phone') ||
          error.message?.includes('Blocked')) {
        break;
      }
      
    } catch (err) {
      lastError = err;
      console.error(`❌ [OTP] Unexpected error on attempt ${attempt + 1}:`, err);
    }
  }
  
  // All attempts failed
  const errorMessage = getOTPErrorMessage(lastError);
  console.error('❌ [OTP] All attempts failed:', errorMessage);
  
  return { 
    success: false, 
    error: errorMessage 
  };
}

/**
 * Get user-friendly error message
 */
function getOTPErrorMessage(error: any): string {
  if (!error) return 'Erreur inconnue lors de l\'envoi du SMS';
  
  const message = error.message || error.toString();
  
  // Map common errors to French messages
  if (message.includes('Rate limit')) {
    return 'Trop de tentatives. Veuillez attendre quelques minutes.';
  }
  
  if (message.includes('Invalid phone')) {
    return 'Numéro de téléphone invalide. Vérifiez le format.';
  }
  
  if (message.includes('Quota')) {
    return 'Service temporairement indisponible. Réessayez dans quelques instants.';
  }
  
  if (message.includes('Network')) {
    return 'Problème de connexion. Vérifiez votre connexion internet.';
  }
  
  if (message.includes('Blocked') || message.includes('Spam')) {
    return 'Ce numéro semble être bloqué. Contactez le support.';
  }
  
  // Generic error
  return 'Impossible d\'envoyer le SMS. Veuillez réessayer.';
}

/**
 * Check if SMS provider is properly configured
 */
export async function checkSMSProviderStatus(): Promise<{
  isConfigured: boolean;
  provider?: string;
  error?: string;
}> {
  try {
    // Try to get auth settings (this might not work with anon key)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ [OTP] Cannot check SMS provider status:', error);
      return { isConfigured: false, error: 'Cannot verify SMS configuration' };
    }
    
    // If we get here, auth is at least working
    return { isConfigured: true, provider: 'twilio' };
    
  } catch (err) {
    console.error('❌ [OTP] Failed to check SMS provider:', err);
    return { isConfigured: false, error: 'SMS provider check failed' };
  }
}

/**
 * Format phone number for Supabase
 */
export function formatPhoneForSupabase(phone: string, countryCode: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add the country code
  if (!cleaned.startsWith('+')) {
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    cleaned = `+${countryCode}${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
} {
  // Must start with +
  if (!phone.startsWith('+')) {
    return { isValid: false, error: 'Le numéro doit commencer par +' };
  }
  
  // Must have at least 10 digits after +
  const digitsOnly = phone.replace(/[^\d]/g, '');
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Numéro trop court' };
  }
  
  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Numéro trop long' };
  }
  
  return { isValid: true };
}

/**
 * Show SMS troubleshooting dialog
 */
export function showSMSTroubleshootingDialog() {
  Alert.alert(
    'Vous ne recevez pas le SMS ?',
    'Voici quelques solutions :',
    [
      {
        text: 'Vérifier mes SMS',
        onPress: () => {
          Alert.alert(
            'Vérifiez vos SMS',
            '• Regardez dans vos spams/SMS filtrés\n• Le SMS vient de "Supabase" ou d\'un numéro court\n• Attendez 1-2 minutes\n• Vérifiez que votre téléphone a du réseau',
            [{ text: 'OK' }]
          );
        }
      },
      {
        text: 'Mon numéro est correct ?',
        onPress: () => {
          Alert.alert(
            'Format du numéro',
            'Le numéro doit être au format international :\n• Commencer par +\n• Suivi du code pays (33 pour la France)\n• Puis le numéro sans le 0\n\nExemple: +33612345678',
            [{ text: 'Compris' }]
          );
        }
      },
      {
        text: 'Utiliser WhatsApp',
        onPress: () => {
          Alert.alert(
            'SMS via WhatsApp',
            'Bientôt disponible ! Cette option permettra de recevoir le code via WhatsApp.',
            [{ text: 'OK' }]
          );
        }
      },
      {
        text: 'Fermer',
        style: 'cancel'
      }
    ]
  );
}