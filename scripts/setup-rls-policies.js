#!/usr/bin/env node

/**
 * Supabase RLS Policies Setup Script
 * 
 * This script provides SQL for setting up Row Level Security policies.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateRLSPolicies() {
  log('🛡️  Supabase RLS Policies Setup', 'bold');
  log('===============================', 'bold');
  log('');
  log('⚠️  Important: These policies must be applied manually in Supabase Dashboard', 'yellow');
  log('Go to SQL Editor and execute each section below:', 'yellow');
  log('');

  const policies = [
    {
      title: '1. Enable RLS on all tables',
      sql: `
-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      title: '2. Profiles table policies',
      sql: `
-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON profiles FOR DELETE 
USING (auth.uid() = id);
      `
    },
    {
      title: '3. Events table policies',
      sql: `
-- Events: Anyone can view public events, creators can manage their own
CREATE POLICY "Anyone can view public events" ON events FOR SELECT USING (
  visibility = 'public' OR created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM event_participants 
    WHERE event_id = events.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create events" ON events FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Event creators can update their events" ON events FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Event creators can delete their events" ON events FOR DELETE 
USING (auth.uid() = created_by);
      `
    },
    {
      title: '4. Event participants table policies',
      sql: `
-- Event participants: Users can join/leave events
CREATE POLICY "Users can view event participants" ON event_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND 
    (visibility = 'public' OR created_by = auth.uid() OR 
     EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = events.id AND ep.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can join events" ON event_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" ON event_participants FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON event_participants FOR UPDATE 
USING (auth.uid() = user_id);
      `
    },
    {
      title: '5. Chats table policies',
      sql: `
-- Chats: Only participants can access chat information
CREATE POLICY "Chat participants can view chats" ON chats FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = chats.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats" ON chats FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Chat creators can update chats" ON chats FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Chat creators can delete chats" ON chats FOR DELETE 
USING (auth.uid() = created_by);
      `
    },
    {
      title: '6. Chat participants table policies',
      sql: `
-- Chat participants: Users can manage their own participation
CREATE POLICY "Chat participants can view participants" ON chat_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp2 
    WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join chats" ON chat_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave chats" ON chat_participants FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON chat_participants FOR UPDATE 
USING (auth.uid() = user_id);
      `
    },
    {
      title: '7. Messages table policies',
      sql: `
-- Messages: Only chat participants can read, users can send to chats they're in
CREATE POLICY "Chat participants can view messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to chats they're in" ON messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = messages.chat_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Message senders can update their messages" ON messages FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Message senders can delete their messages" ON messages FOR DELETE 
USING (auth.uid() = sender_id);
      `
    },
    {
      title: '8. Stories table policies',
      sql: `
-- Stories: Users can manage their own stories, view friends' stories
CREATE POLICY "Users can view their own stories" ON stories FOR SELECT USING (
  author_id = auth.uid()
);

CREATE POLICY "Users can view friends stories" ON stories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM friendships 
    WHERE ((user_id = auth.uid() AND friend_id = stories.author_id) OR
           (friend_id = auth.uid() AND user_id = stories.author_id)) 
    AND status = 'accepted'
  )
);

CREATE POLICY "Users can create their own stories" ON stories FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own stories" ON stories FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own stories" ON stories FOR DELETE 
USING (auth.uid() = author_id);
      `
    },
    {
      title: '9. Notifications table policies',
      sql: `
-- Notifications: Users can only access their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE 
USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can create notifications" ON notifications FOR INSERT 
WITH CHECK (true);
      `
    },
    {
      title: '10. Friendships table policies',
      sql: `
-- Friendships: Users can manage their own friendships
CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

CREATE POLICY "Users can create friendship requests" ON friendships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can respond to friendship requests" ON friendships FOR UPDATE 
USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships" ON friendships FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);
      `
    }
  ];

  for (const policy of policies) {
    log(`${policy.title}`, 'blue');
    log(`${'-'.repeat(policy.title.length)}`, 'blue');
    log(policy.sql.trim(), 'cyan');
    log('');
  }

  log('📝 How to apply these policies:', 'bold');
  log('1. Go to your Supabase Dashboard', 'yellow');
  log('2. Navigate to SQL Editor', 'yellow');
  log('3. Copy and execute each policy section above', 'yellow');
  log('4. Run validation: npm run validate-supabase', 'yellow');
  log('');
  
  log('⚡ Quick setup: Copy all policies above into one SQL query and run it', 'green');
  log('');
}

// Run the generator
generateRLSPolicies();