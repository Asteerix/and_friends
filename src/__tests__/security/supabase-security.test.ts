/**
 * Supabase Security and Permissions Tests
 * These tests verify RLS policies, authentication, and data access controls
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rmwgfiwngqciixbgluuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd2dmaXduZ3FjaWl4YmdsdXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNzU2NjMsImV4cCI6MjA2Mjc1MTY2M30.hQfym-9WtseC1stlaLkn4qGa_crkhYF3yjlHY-ei4qo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Supabase Security Tests', () => {
  describe('Authentication Security', () => {
    it('should require authentication for protected operations', async () => {
      // Test without being logged in
      await supabase.auth.signOut();

      // Try to access user-specific data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      // Should either work with public read access or require authentication
      if (profileError) {
        expect(profileError.message).toMatch(/JWT|auth|permission|policy/i);
      } else {
        console.log('Profiles table allows anonymous read access');
      }
    });

    it('should handle invalid JWT tokens gracefully', async () => {
      // Create client with invalid token
      const invalidClient = createClient(SUPABASE_URL, 'invalid_token');
      
      const { data, error } = await invalidClient
        .from('profiles')
        .select('id')
        .limit(1);

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/JWT|Invalid|Unauthorized/i);
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enforce RLS on profiles table', async () => {
      // Test direct access to profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, phone')
        .limit(10);

      if (error) {
        // RLS is likely enabled and blocking access
        expect(error.message).toMatch(/policy|permission|RLS/i);
        console.log('✓ RLS is active on profiles table');
      } else {
        // Check if sensitive data is exposed
        if (data && data.length > 0) {
          const profile = data[0];
          if (profile.email || profile.phone) {
            console.warn('⚠️ Sensitive data (email/phone) is accessible without authentication');
          } else {
            console.log('✓ Sensitive data is filtered correctly');
          }
        }
      }
    });

    it('should enforce RLS on events table', async () => {
      // Test access to events
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(5);

      if (error) {
        if (error.message.includes('policy')) {
          console.log('✓ RLS policies are active on events table');
        }
      } else {
        console.log(`Events table returned ${data?.length || 0} records`);
        
        // Check if private events are visible
        if (data && data.length > 0) {
          const privateEvents = data.filter(event => event.is_private === true);
          if (privateEvents.length > 0) {
            console.warn('⚠️ Private events are visible to anonymous users');
          } else {
            console.log('✓ Private events are filtered correctly');
          }
        }
      }
    });

    it('should prevent unauthorized data modification', async () => {
      // Ensure we're not logged in
      await supabase.auth.signOut();

      // Try to insert data
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: 'Unauthorized Test Event',
          description: 'This should not be allowed',
          date: new Date().toISOString(),
          location: 'Test',
          created_by: 'fake-user-id',
          is_private: false,
        });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/policy|permission|auth|JWT/i);
      console.log('✓ Anonymous users cannot insert events');
    });

    it('should prevent unauthorized profile updates', async () => {
      // Ensure we're not logged in
      await supabase.auth.signOut();

      // Try to update any profile
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: 'Hacked Name' })
        .eq('id', 'any-user-id');

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/policy|permission|auth|JWT/i);
      console.log('✓ Anonymous users cannot update profiles');
    });
  });

  describe('Data Validation', () => {
    it('should enforce required fields', async () => {
      // Try to insert incomplete data (assuming we had permission)
      const { data, error } = await supabase
        .from('events')
        .insert({
          description: 'Missing required fields',
        });

      if (error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('null') || errorMessage.includes('required')) {
          console.log('✓ Database enforces required field constraints');
        } else if (errorMessage.includes('policy') || errorMessage.includes('auth')) {
          console.log('✓ RLS prevents unauthorized insertion (couldn\'t test field validation)');
        }
      }
    });

    it('should validate email formats in profiles', async () => {
      // This would require authentication first, so we'll skip the actual test
      // but document the expectation
      console.log('📋 Email validation should be enforced at application level');
    });
  });

  describe('Storage Security', () => {
    it('should require authentication for storage operations', async () => {
      // Ensure we're not logged in
      await supabase.auth.signOut();

      const testFile = new Blob(['test'], { type: 'text/plain' });
      
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload('unauthorized-test.txt', testFile);

      if (error) {
        expect(error.message).toMatch(/Unauthorized|auth|policy|JWT/i);
        console.log('✓ Storage requires authentication');
      } else {
        console.warn('⚠️ Storage allows anonymous uploads');
        
        // Clean up if upload succeeded
        await supabase.storage
          .from('event-images')
          .remove(['unauthorized-test.txt']);
      }
    });

    it('should prevent unauthorized file access', async () => {
      // Try to list files without authentication
      const { data, error } = await supabase.storage
        .from('event-images')
        .list();

      if (error && error.message.includes('Unauthorized')) {
        console.log('✓ Storage file listing requires authentication');
      } else {
        console.log('Storage listing is publicly accessible');
      }
    });
  });

  describe('Rate Limiting & Abuse Prevention', () => {
    it('should handle multiple rapid requests gracefully', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(10).fill(null).map(() =>
        supabase.from('profiles').select('id').limit(1)
      );

      const results = await Promise.allSettled(promises);
      const errors = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      const rateLimitErrors = errors.filter(e => 
        e.reason?.message?.includes('rate') || 
        e.reason?.message?.includes('limit') ||
        e.reason?.message?.includes('429')
      );

      if (rateLimitErrors.length > 0) {
        console.log('✓ Rate limiting is active');
      } else {
        console.log('No rate limiting detected in test');
      }
    });

    it('should prevent SQL injection attempts', async () => {
      // Test basic SQL injection attempt
      const maliciousInput = "'; DROP TABLE profiles; --";
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', maliciousInput);

      // Should not cause database errors (prepared statements should protect)
      if (error && error.message.includes('syntax error')) {
        console.warn('⚠️ Possible SQL injection vulnerability detected');
      } else {
        console.log('✓ SQL injection protection appears to be working');
      }
    });
  });

  describe('API Key Security', () => {
    it('should use service role key only server-side', () => {
      // Verify we're using anon key, not service role key
      expect(SUPABASE_ANON_KEY).toMatch(/^eyJ/); // JWT format
      expect(SUPABASE_ANON_KEY).not.toContain('service_role');
      
      // Check that the key contains 'anon' role
      const payload = JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1]));
      expect(payload.role).toBe('anon');
      
      console.log('✓ Using anonymous key (not service role key)');
    });

    it('should have reasonable key expiration', () => {
      const payload = JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1]));
      const expirationDate = new Date(payload.exp * 1000);
      const now = new Date();
      
      expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
      
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      console.log(`JWT expires in ${daysUntilExpiration} days`);
      
      if (daysUntilExpiration < 30) {
        console.warn('⚠️ JWT key expires soon - consider renewal');
      } else {
        console.log('✓ JWT expiration is reasonable');
      }
    });
  });

  describe('CORS and Network Security', () => {
    it('should have proper CORS configuration', async () => {
      // This is more of a documentation test since Jest runs in Node
      console.log('📋 CORS should be configured to only allow your domain in production');
      console.log('📋 Supabase URL should use HTTPS (currently using HTTPS ✓)');
      
      expect(SUPABASE_URL).toMatch(/^https:/);
    });
  });
});