-- &Friends Row Level Security Policies
-- Comprehensive RLS setup for all tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE blocker_id = auth.uid() AND blocked_id = id
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Events table policies
CREATE POLICY "Anyone can view public events"
  ON public.events FOR SELECT
  USING (
    privacy = 'public' 
    OR organizer_id = auth.uid()
    OR auth.uid() = ANY(co_organizers)
    OR EXISTS (
      SELECT 1 FROM public.event_attendees
      WHERE event_id = events.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND organizer_id = auth.uid()
  );

CREATE POLICY "Event organizers can update their events"
  ON public.events FOR UPDATE
  USING (
    organizer_id = auth.uid() 
    OR auth.uid() = ANY(co_organizers)
  );

CREATE POLICY "Event organizers can delete their events"
  ON public.events FOR DELETE
  USING (organizer_id = auth.uid());

-- Event attendees policies
CREATE POLICY "Event attendees can view attendee list"
  ON public.event_attendees FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_attendees.event_id
      AND (
        privacy = 'public'
        OR organizer_id = auth.uid()
        OR auth.uid() = ANY(co_organizers)
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.event_attendees ea2
      WHERE ea2.event_id = event_attendees.event_id
      AND ea2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can RSVP to events"
  ON public.event_attendees FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR invited_by = auth.uid()
  );

CREATE POLICY "Users can update their RSVP"
  ON public.event_attendees FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can remove their RSVP"
  ON public.event_attendees FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_attendees.event_id
      AND organizer_id = auth.uid()
    )
  );

-- Conversations policies
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

CREATE POLICY "Conversation admins can update"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Conversation participants policies
CREATE POLICY "Participants can view members"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Participants can leave conversations"
  ON public.conversation_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
      AND cp2.role = 'owner'
    )
  );

-- Messages policies
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Stories policies
CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  USING (
    expires_at > NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE blocker_id = auth.uid() AND blocked_id = stories.user_id
    )
  );

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Follows policies
CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (
    follower_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE blocker_id = following_id AND blocked_id = follower_id
    )
  );

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (follower_id = auth.uid());

-- Blocks policies
CREATE POLICY "Users can view their blocks"
  ON public.blocks FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can block others"
  ON public.blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock"
  ON public.blocks FOR DELETE
  USING (blocker_id = auth.uid());

-- Reports policies
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their reports"
  ON public.reports FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR (auth.uid() IN (
      SELECT id FROM public.users WHERE verified = true
    ))
  );

-- Event analytics policies
CREATE POLICY "Organizers can view analytics"
  ON public.event_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE id = event_analytics.event_id
      AND (organizer_id = auth.uid() OR auth.uid() = ANY(co_organizers))
    )
  );

-- Polls policies
CREATE POLICY "Message viewers can see polls"
  ON public.polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = polls.message_id
      AND cp.user_id = auth.uid()
    )
  );

-- Poll votes policies
CREATE POLICY "Participants can vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.messages m ON m.id = p.message_id
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE p.id = poll_votes.poll_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view poll results"
  ON public.poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.messages m ON m.id = p.message_id
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE p.id = poll_votes.poll_id
      AND cp.user_id = auth.uid()
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.polls WHERE id = poll_votes.poll_id AND anonymous = true
      )
      OR user_id = auth.uid()
    )
  );