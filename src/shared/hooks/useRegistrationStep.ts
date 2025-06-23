import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export function useRegistrationStep(step: string) {
  const { session } = useSession();

  useEffect(() => {
    if (!session?.user?.id || !step) return;

    const updateStep = async () => {
      try {
        console.log(`📝 [useRegistrationStep] Updating registration step to: ${step}`);
        
        const { error } = await supabase
          .from('profiles')
          .update({ 
            current_registration_step: step,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);

        if (error) {
          console.error('❌ [useRegistrationStep] Error updating step:', error);
        } else {
          console.log('✅ [useRegistrationStep] Step updated successfully');
        }
      } catch (error) {
        console.error('❌ [useRegistrationStep] Unexpected error:', error);
      }
    };

    updateStep();
  }, [session?.user?.id, step]);
}