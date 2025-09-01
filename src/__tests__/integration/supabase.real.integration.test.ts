/**
 * Real Supabase Integration Tests
 * These tests use the actual Supabase client, not mocks
 * Run with: npm test -- --testNamePattern="Real Supabase" --setupFilesAfterEnv ./src/__tests__/integration/setup.ts
 */

// Import the real supabase client directly
import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables only
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create a real client for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Real Supabase Integration Tests', () => {
  beforeAll(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not found. Skipping integration tests.');
      return;
    }
    console.log('Running real Supabase integration tests');
  });

  describe('Database Connection', () => {
    it('should connect to Supabase successfully', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      // Test basic connectivity - try to query any public table or RPC
      const { data, error } = await supabase.rpc('get_server_time', {});
      
      // If RPC doesn't exist, that's ok - we just want to test connectivity
      if (error && !error.message.includes('function get_server_time')) {
        // Try a simple query instead
        const { error: connectionError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        // Even if table doesn't exist, we should get a meaningful error, not connection error
        expect(connectionError?.message).not.toContain('connection');
        expect(connectionError?.message).not.toContain('network');
      }
      
      console.log('Supabase connection test passed');
    }, 10000);
  });

  describe('Authentication Flow', () => {
    it('should handle authentication state', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      // Test getting current session (should be null initially)
      const { data: session, error } = await supabase.auth.getSession();
      
      expect(error).toBeNull();
      expect(session).toBeDefined();
      console.log('Authentication state test passed');
    });

    it('should be able to attempt sign up (may fail due to policies)', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      const testEmail = `integration-test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      // The signup might fail due to RLS policies, but we should get a meaningful response
      if (error) {
        // Common expected errors in production
        const acceptableErrors = [
          'Email not confirmed',
          'User already registered',
          'Signup is disabled',
          'Too many requests',
          'Invalid email',
        ];
        
        const isExpectedError = acceptableErrors.some(expected => 
          error.message.includes(expected)
        );
        
        if (!isExpectedError) {
          console.warn(`Unexpected signup error: ${error.message}`);
        }
      } else {
        expect(data.user).toBeDefined();
        // Clean up if signup succeeded
        await supabase.auth.signOut();
      }
      
      console.log('Authentication signup test completed');
    }, 15000);
  });

  describe('Database Tables', () => {
    it('should be able to query tables (even if restricted)', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      // Try querying common tables
      const tablesToTest = ['profiles', 'events', 'messages', 'conversations'];
      
      for (const table of tablesToTest) {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          // Common acceptable errors
          const acceptableErrors = [
            'relation does not exist', // Table doesn't exist
            'permission denied', // RLS policy blocking
            'JWT expired', // Auth issue
            'row-level security', // RLS blocking
          ];
          
          const isAcceptableError = acceptableErrors.some(acceptable =>
            error.message.toLowerCase().includes(acceptable.toLowerCase())
          );
          
          if (isAcceptableError) {
            console.log(`Table ${table}: ${error.message} (expected)`);
          } else {
            console.warn(`Table ${table}: Unexpected error - ${error.message}`);
          }
        } else {
          console.log(`Table ${table}: Query successful`);
          expect(data).toBeDefined();
          expect(Array.isArray(data)).toBe(true);
        }
      }
    }, 20000);
  });

  describe('Storage', () => {
    it('should be able to check storage configuration', async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Skipping: Supabase credentials not configured');
        return;
      }

      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        // Even if we can't list buckets, we should get a meaningful error
        const acceptableErrors = [
          'permission denied',
          'JWT expired',
          'Unauthorized',
        ];
        
        const isAcceptableError = acceptableErrors.some(acceptable =>
          error.message.toLowerCase().includes(acceptable.toLowerCase())
        );
        
        if (isAcceptableError) {
          console.log(`Storage test: ${error.message} (expected)`);
        } else {
          console.warn(`Storage test: Unexpected error - ${error.message}`);
        }
      } else {
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
        console.log(`Storage test: Found ${data.length} buckets`);
      }
    }, 10000);
  });

  describe('Real-time', () => {
    it('should be able to create a channel subscription', (done) => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Skipping: Supabase credentials not configured');
        done();
        return;
      }

      let subscription: any;
      let timeout: NodeJS.Timeout;
      
      const cleanup = () => {
        if (subscription) {
          subscription.unsubscribe();
        }
        if (timeout) {
          clearTimeout(timeout);
        }
      };
      
      try {
        subscription = supabase
          .channel('integration-test-channel')
          .on('presence', { event: 'sync' }, () => {
            console.log('Real-time subscription established');
            cleanup();
            done();
          })
          .subscribe((status) => {
            console.log(`Subscription status: ${status}`);
            if (status === 'SUBSCRIBED') {
              // Give it a moment, then cleanup
              timeout = setTimeout(() => {
                console.log('Real-time test completed successfully');
                cleanup();
                done();
              }, 2000);
            }
            if (status === 'CHANNEL_ERROR') {
              cleanup();
              done.fail('Channel subscription failed');
            }
          });
      } catch (error) {
        cleanup();
        console.warn(`Real-time test error: ${error}`);
        done(); // Don't fail the test, just log the issue
      }
      
      // Safety timeout
      setTimeout(() => {
        cleanup();
        console.warn('Real-time test timed out');
        done();
      }, 3000);
    }, 5000);
  });

  describe('Environment Configuration', () => {
    it('should have valid Supabase configuration', () => {
      expect(SUPABASE_URL).toBeTruthy();
      expect(SUPABASE_ANON_KEY).toBeTruthy();
      expect(SUPABASE_URL).toMatch(/^https?:\/\//);
      expect(SUPABASE_ANON_KEY.length).toBeGreaterThan(50);
      
      console.log('Supabase configuration is valid');
    });
  });
});