import { supabase } from '@/shared/lib/supabase/client';

// Test function to create sample notifications
export async function createTestNotifications(userId: string) {
  const testNotifications = [
    {
      user_id: userId,
      type: 'event_invite',
      title: 'New Event Invitation',
      body: 'John Doe invited you to Movie Night this Friday!',
      data: { event_name: 'Movie Night' },
      related_id: null, // Would be a real event ID in production
      related_type: 'event' as const
    },
    {
      user_id: userId,
      type: 'new_message',
      title: 'New Message',
      body: 'Sarah sent you a message in the party chat',
      data: { chat_name: 'Party Planning' },
      related_id: null, // Would be a real chat ID
      related_type: 'chat' as const
    },
    {
      user_id: userId,
      type: 'friend_request',
      title: 'Friend Request',
      body: 'Mike sent you a friend request',
      data: {},
      related_id: null, // Would be the follower's ID
      related_type: 'user' as const
    },
    {
      user_id: userId,
      type: 'rsvp_update',
      title: 'RSVP Update',
      body: '5 more people are attending your Birthday Party!',
      data: { attendee_count: 5 },
      related_id: null, // Would be the event ID
      related_type: 'event' as const
    },
  ];

  const results = [];
  
  for (const notification of testNotifications) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notification])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating test notification:', error);
        results.push({ success: false, error });
      } else {
        console.log('Created test notification:', data);
        results.push({ success: true, data });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      results.push({ success: false, error: err });
    }
  }
  
  return results;
}

// Function to verify notifications table exists and has correct structure
export async function verifyNotificationsTable() {
  try {
    // Test select query
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing notifications table:', error);
      return { success: false, error };
    }
    
    console.log('Notifications table is accessible');
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error verifying table:', err);
    return { success: false, error: err };
  }
}

// Function to test real-time subscription
export function testRealtimeSubscription(userId: string, onNotification: (payload: unknown) => void) {
  const subscription = supabase
    .channel(`test-notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Received real-time notification:', payload);
        onNotification(payload);
      }
    )
    .subscribe();
  
  return () => {
    void subscription.unsubscribe();
  };
}