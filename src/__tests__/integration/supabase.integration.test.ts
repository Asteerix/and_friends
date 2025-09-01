import { supabase } from '@/shared/lib/supabase/client';

describe('Supabase Integration Tests', () => {
  beforeAll(async () => {
    // Ensure we're in test mode
    console.log('Running Supabase integration tests');
  });

  describe('Database Connection', () => {
    it('should connect to Supabase successfully', async () => {
      // Test basic connectivity by fetching a simple query
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should be able to sign up a test user', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'testPassword123!';
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      
      // Clean up - sign out
      if (data.user) {
        await supabase.auth.signOut();
      }
    }, 10000);

    it('should be able to sign in with valid credentials', async () => {
      // This assumes you have a test user set up
      const testEmail = 'test@example.com';
      const testPassword = 'testPassword123!';
      
      // First create the user if it doesn't exist
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
      
      // Then sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      // Note: This might fail if email confirmation is required
      if (error && error.message.includes('Email not confirmed')) {
        // Skip this test if email confirmation is required
        console.warn('Skipping sign-in test - email confirmation required');
        return;
      }
      
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      
      // Clean up
      await supabase.auth.signOut();
    }, 10000);
  });

  describe('Events Table', () => {
    let testUserId: string;
    
    beforeAll(async () => {
      // Create a test user for events testing
      const { data } = await supabase.auth.signUp({
        email: `events-test-${Date.now()}@example.com`,
        password: 'testPassword123!',
      });
      testUserId = data.user?.id || 'test-user-id';
    });
    
    afterAll(async () => {
      // Clean up test events
      await supabase
        .from('events')
        .delete()
        .like('title', 'Test Event%');
      
      await supabase.auth.signOut();
    });

    it('should be able to create an event', async () => {
      const testEvent = {
        title: `Test Event ${Date.now()}`,
        description: 'This is a test event',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: 'Test Location',
        created_by: testUserId,
        tags: ['test'],
        is_private: false,
        capacity: 10,
      };
      
      const { data, error } = await supabase
        .from('events')
        .insert(testEvent)
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe(testEvent.title);
      expect(data.created_by).toBe(testUserId);
    });

    it('should be able to fetch events', async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(5);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should be able to update an event', async () => {
      // First create an event
      const testEvent = {
        title: `Test Event for Update ${Date.now()}`,
        description: 'This will be updated',
        date: new Date(Date.now() + 86400000).toISOString(),
        location: 'Original Location',
        created_by: testUserId,
        tags: ['test'],
        is_private: false,
      };
      
      const { data: created, error: createError } = await supabase
        .from('events')
        .insert(testEvent)
        .select()
        .single();
      
      expect(createError).toBeNull();
      expect(created).toBeDefined();
      
      // Then update it
      const updatedData = {
        description: 'This has been updated',
        location: 'Updated Location',
      };
      
      const { data: updated, error: updateError } = await supabase
        .from('events')
        .update(updatedData)
        .eq('id', created.id)
        .select()
        .single();
      
      expect(updateError).toBeNull();
      expect(updated).toBeDefined();
      expect(updated.description).toBe(updatedData.description);
      expect(updated.location).toBe(updatedData.location);
    });
  });

  describe('Profiles Table', () => {
    it('should be able to read from profiles table', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, created_at')
        .limit(5);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should be able to create a real-time subscription', (done) => {
      let subscription: any;
      
      const setupSubscription = () => {
        subscription = supabase
          .channel('test-events')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'events' },
            (payload) => {
              expect(payload).toBeDefined();
              expect(payload.eventType).toBe('INSERT');
              
              // Clean up and complete test
              subscription.unsubscribe();
              done();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Insert a test event to trigger the subscription
              supabase.from('events').insert({
                title: `Real-time Test Event ${Date.now()}`,
                description: 'Testing real-time',
                date: new Date(Date.now() + 86400000).toISOString(),
                location: 'Test Location',
                created_by: 'test-user-id',
                tags: ['realtime-test'],
                is_private: false,
              });
            }
          });
      };
      
      setupSubscription();
      
      // Timeout after 15 seconds
      setTimeout(() => {
        if (subscription) {
          subscription.unsubscribe();
        }
        done.fail('Real-time subscription test timed out');
      }, 15000);
    }, 20000);
  });

  describe('Storage', () => {
    it('should be able to list storage buckets', async () => {
      const { data, error } = await supabase.storage.listBuckets();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should be able to upload a test file', async () => {
      const testFile = new Blob(['test content'], { type: 'text/plain' });
      const fileName = `test-file-${Date.now()}.txt`;
      
      const { data, error } = await supabase.storage
        .from('event-images') // Assuming this bucket exists
        .upload(`test/${fileName}`, testFile);
      
      if (error && error.message.includes('Bucket not found')) {
        console.warn('Storage test skipped - event-images bucket not found');
        return;
      }
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Clean up
      await supabase.storage
        .from('event-images')
        .remove([`test/${fileName}`]);
    });
  });
});