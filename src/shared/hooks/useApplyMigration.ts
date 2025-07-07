import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase/client';

export function useApplyNameChangeMigration() {
  useEffect(() => {
    const applyMigration = async () => {
      try {
        // Check if columns exist
        const { data: columns } = await supabase
          .from('profiles')
          .select('last_name_change, last_username_change')
          .limit(1);
        
        // If no error, columns exist
        if (columns) {
          console.log('Name change columns already exist');
          return;
        }
      } catch (error) {
        // Columns don't exist, try to create them
        console.log('Attempting to add name change tracking columns...');
        
        try {
          // This would need to be done via Supabase dashboard or CLI
          // For now, we'll handle missing columns gracefully in the app
          console.log('Please run the migration: supabase/migrations/20250107_add_name_change_tracking.sql');
        } catch (err) {
          console.error('Migration error:', err);
        }
      }
    };

    applyMigration();
  }, []);
}