-- Table: events
CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    date timestamptz NOT NULL,
    location text,
    image_url text,
    tags text[],
    is_private boolean DEFAULT false,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table: chats
CREATE TABLE IF NOT EXISTS chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    is_group boolean DEFAULT false,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Table: chat_participants
CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    is_admin boolean DEFAULT false,
    PRIMARY KEY (chat_id, user_id)
);

-- Table: event_participants
CREATE TABLE IF NOT EXISTS event_participants (
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    status text DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    PRIMARY KEY (event_id, user_id)
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
    author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    type text NOT NULL DEFAULT 'text',
    text text,
    meta jsonb,
    created_at timestamptz DEFAULT now()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    data jsonb,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Table: friendships
CREATE TABLE IF NOT EXISTS friendships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- Fonctions pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour events
CREATE POLICY "Public events are viewable by everyone" ON events
    FOR SELECT USING (NOT is_private OR created_by = auth.uid());

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE USING (auth.uid() = created_by);

-- Politiques RLS pour chats
CREATE POLICY "Users can view chats they participate in" ON chats
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM chat_participants WHERE chat_id = chats.id
        ) OR auth.uid() = created_by
    );

CREATE POLICY "Users can create chats" ON chats
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update chats they created" ON chats
    FOR UPDATE USING (auth.uid() = created_by);

-- Politiques RLS pour chat_participants
CREATE POLICY "Users can view chat participants" ON chat_participants
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM chat_participants cp WHERE cp.chat_id = chat_participants.chat_id
        )
    );

CREATE POLICY "Users can join chats" ON chat_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave chats" ON chat_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour event_participants
CREATE POLICY "Users can view event participants" ON event_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON event_participants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave events" ON event_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour messages
CREATE POLICY "Users can view messages in their chats" ON messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM chat_participants WHERE chat_id = messages.chat_id
        )
    );

CREATE POLICY "Users can send messages to their chats" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        auth.uid() IN (
            SELECT user_id FROM chat_participants WHERE chat_id = messages.chat_id
        )
    );

-- Politiques RLS pour notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Politiques RLS pour friendships
CREATE POLICY "Users can view their friendships" ON friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships" ON friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their friendships" ON friendships
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON friendships TO authenticated;

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_chats_event_id ON chats(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);