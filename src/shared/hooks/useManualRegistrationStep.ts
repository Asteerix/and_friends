import { useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export function useManualRegistrationStep() {
  const { session } = useSession();

  const saveStep = useCallback(
    async (step: string) => {
      if (!session?.user?.id || !step) return false;

      try {
        console.log(`📝 [useManualRegistrationStep] Saving registration step: ${step}`);

        const { error } = await supabase
          .from('profiles')
          .update({
            current_registration_step: step,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        if (error) {
          console.error('❌ [useManualRegistrationStep] Error updating step:', error);
          return false;
        } else {
          console.log('✅ [useManualRegistrationStep] Step saved successfully');
          return true;
        }
      } catch (error) {
        console.error('❌ [useManualRegistrationStep] Unexpected error:', error);
        return false;
      }
    },
    [session?.user?.id]
  );

  return { saveStep };
}
