-- Corriger les fonctions RPC pour le système d'amitié
-- Ces fonctions utilisent la structure existante avec user_id et friend_id

-- Fonction pour obtenir les amis d'un utilisateur
CREATE OR REPLACE FUNCTION get_friends(user_uuid UUID)
RETURNS TABLE(
    friend_id UUID,
    username TEXT,
    avatar_url TEXT,
    status friendship_status,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN f.user_id = user_uuid THEN f.friend_id
            ELSE f.user_id
        END as friend_id,
        p.username,
        p.avatar_url,
        f.status,
        f.created_at
    FROM friendships f
    JOIN profiles p ON p.id = CASE 
        WHEN f.user_id = user_uuid THEN f.friend_id
        ELSE f.user_id
    END
    WHERE (f.user_id = user_uuid OR f.friend_id = user_uuid)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les demandes d'amitié reçues
CREATE OR REPLACE FUNCTION get_friend_requests(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    requester_id UUID,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    mutual_friends_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.user_id as requester_id,
        p.username,
        p.avatar_url,
        f.created_at,
        0 as mutual_friends_count -- TODO: Implémenter le comptage des amis mutuels
    FROM friendships f
    JOIN profiles p ON p.id = f.user_id
    WHERE f.friend_id = user_uuid
    AND f.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rechercher des utilisateurs
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, current_user_id UUID)
RETURNS TABLE(
    id UUID,
    username TEXT,
    avatar_url TEXT,
    mutual_friends_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.avatar_url,
        0 as mutual_friends_count -- TODO: Implémenter le comptage des amis mutuels
    FROM profiles p
    WHERE p.id != current_user_id
    AND (
        p.username ILIKE '%' || search_query || '%'
        OR p.email ILIKE '%' || search_query || '%'
    )
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le statut d'amitié entre deux utilisateurs
CREATE OR REPLACE FUNCTION get_friend_status(user1_id UUID, user2_id UUID)
RETURNS friendship_status AS $$
DECLARE
    result friendship_status;
BEGIN
    SELECT status INTO result
    FROM friendships
    WHERE (user_id = user1_id AND friend_id = user2_id)
    OR (user_id = user2_id AND friend_id = user1_id)
    LIMIT 1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter les politiques RLS si elles n'existent pas
DO $$
BEGIN
    -- Politique pour friendships
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'friendships' 
        AND policyname = 'Users can view friendships they are part of'
    ) THEN
        CREATE POLICY "Users can view friendships they are part of" ON friendships
            FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'friendships' 
        AND policyname = 'Users can insert friendships'
    ) THEN
        CREATE POLICY "Users can insert friendships" ON friendships
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'friendships' 
        AND policyname = 'Users can update friendships they are part of'
    ) THEN
        CREATE POLICY "Users can update friendships they are part of" ON friendships
            FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
    END IF;
END $$;