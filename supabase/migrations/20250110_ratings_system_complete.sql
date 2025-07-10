-- ============================================
-- SYSTÈME DE RATINGS COMPLET
-- ============================================

-- 1. Supprimer les objets existants
-- ============================================
DROP FUNCTION IF EXISTS public.get_user_rating_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_given_ratings(UUID, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_received_ratings(UUID, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_rating(UUID, UUID, UUID, INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.delete_rating(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_rate_user(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_event_participant_ratings(UUID) CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;

-- 2. Créer la table ratings
-- ============================================
CREATE TABLE public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id, event_id),
    CHECK (from_user_id != to_user_id)
);

-- 3. Créer les indexes
-- ============================================
CREATE INDEX idx_ratings_from_user ON public.ratings(from_user_id);
CREATE INDEX idx_ratings_to_user ON public.ratings(to_user_id);
CREATE INDEX idx_ratings_event ON public.ratings(event_id);
CREATE INDEX idx_ratings_created ON public.ratings(created_at DESC);

-- 4. Enable RLS
-- ============================================
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS
-- ============================================
-- Les utilisateurs peuvent voir leurs propres ratings donnés
CREATE POLICY "Users can view own given ratings" ON public.ratings
    FOR SELECT USING (auth.uid() = from_user_id);

-- Les utilisateurs peuvent voir leurs propres ratings reçus
CREATE POLICY "Users can view own received ratings" ON public.ratings
    FOR SELECT USING (auth.uid() = to_user_id);

-- Les utilisateurs peuvent voir les ratings entre amis
CREATE POLICY "Users can view friends ratings" ON public.ratings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.friendships
            WHERE status = 'accepted'
            AND (
                (user_id = auth.uid() AND friend_id IN (from_user_id, to_user_id)) OR
                (friend_id = auth.uid() AND user_id IN (from_user_id, to_user_id))
            )
        )
    );

-- Les utilisateurs peuvent créer des ratings
CREATE POLICY "Users can create ratings" ON public.ratings
    FOR INSERT WITH CHECK (
        auth.uid() = from_user_id 
        AND from_user_id != to_user_id
        AND (
            event_id IS NULL OR EXISTS (
                SELECT 1 FROM public.event_participants ep1
                JOIN public.event_participants ep2 ON ep1.event_id = ep2.event_id
                WHERE ep1.user_id = from_user_id 
                AND ep2.user_id = to_user_id
                AND ep1.event_id = ratings.event_id
                AND ep1.status = 'going'
                AND ep2.status = 'going'
            )
        )
    );

-- Les utilisateurs peuvent mettre à jour leurs propres ratings
CREATE POLICY "Users can update own ratings" ON public.ratings
    FOR UPDATE USING (auth.uid() = from_user_id)
    WITH CHECK (auth.uid() = from_user_id);

-- Les utilisateurs peuvent supprimer leurs propres ratings
CREATE POLICY "Users can delete own ratings" ON public.ratings
    FOR DELETE USING (auth.uid() = from_user_id);

-- 6. Fonction pour obtenir les statistiques de rating d'un utilisateur
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_rating_stats(p_user_id UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_ratings INT,
    rating_distribution JSONB,
    recent_ratings JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH rating_stats AS (
        SELECT 
            r.to_user_id,
            AVG(r.rating)::NUMERIC as avg_rating,
            COUNT(*)::INT as total_count
        FROM public.ratings r
        WHERE r.to_user_id = p_user_id
        GROUP BY r.to_user_id
    ),
    distribution AS (
        SELECT 
            jsonb_object_agg(
                rating_value::TEXT,
                COALESCE(rating_count, 0)
            ) as dist
        FROM (
            SELECT generate_series(1, 5) as rating_value
        ) s
        LEFT JOIN (
            SELECT rating, COUNT(*) as rating_count
            FROM public.ratings
            WHERE to_user_id = p_user_id
            GROUP BY rating
        ) r ON s.rating_value = r.rating
    ),
    recent AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'rating', r.rating,
                'comment', r.comment,
                'created_at', r.created_at,
                'from_user', jsonb_build_object(
                    'id', p.id,
                    'username', p.username,
                    'full_name', p.full_name,
                    'avatar_url', p.avatar_url
                ),
                'event', CASE 
                    WHEN e.id IS NOT NULL THEN jsonb_build_object(
                        'id', e.id,
                        'title', e.title
                    )
                    ELSE NULL
                END
            ) ORDER BY r.created_at DESC
        ) as recent_list
        FROM public.ratings r
        LEFT JOIN public.profiles p ON p.id = r.from_user_id
        LEFT JOIN public.events e ON e.id = r.event_id
        WHERE r.to_user_id = p_user_id
        LIMIT 10
    )
    SELECT 
        COALESCE(rs.avg_rating, 0) as average_rating,
        COALESCE(rs.total_count, 0) as total_ratings,
        COALESCE(d.dist, '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb) as rating_distribution,
        COALESCE(rec.recent_list, '[]'::jsonb) as recent_ratings
    FROM (SELECT 1) dummy
    LEFT JOIN rating_stats rs ON true
    LEFT JOIN distribution d ON true
    LEFT JOIN recent rec ON true;
END;
$$;

-- 7. Fonction pour obtenir les ratings donnés par un utilisateur
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_given_ratings(
    p_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    to_user_id UUID,
    to_user JSONB,
    event_id UUID,
    event JSONB,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.to_user_id,
        jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'full_name', p.full_name,
            'avatar_url', p.avatar_url,
            'bio', p.bio
        ) as to_user,
        r.event_id,
        CASE 
            WHEN e.id IS NOT NULL THEN jsonb_build_object(
                'id', e.id,
                'title', e.title,
                'start_date', e.date,
                'image_url', e.image_url
            )
            ELSE NULL
        END as event,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at
    FROM public.ratings r
    JOIN public.profiles p ON p.id = r.to_user_id
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE r.from_user_id = p_user_id
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 8. Fonction pour obtenir les ratings reçus par un utilisateur
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_received_ratings(
    p_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    from_user JSONB,
    event_id UUID,
    event JSONB,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.from_user_id,
        jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'full_name', p.full_name,
            'avatar_url', p.avatar_url,
            'bio', p.bio
        ) as from_user,
        r.event_id,
        CASE 
            WHEN e.id IS NOT NULL THEN jsonb_build_object(
                'id', e.id,
                'title', e.title,
                'start_date', e.date,
                'image_url', e.image_url
            )
            ELSE NULL
        END as event,
        r.rating,
        r.comment,
        r.created_at
    FROM public.ratings r
    JOIN public.profiles p ON p.id = r.from_user_id
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE r.to_user_id = p_user_id
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 9. Fonction pour créer ou mettre à jour un rating
-- ============================================
CREATE OR REPLACE FUNCTION public.upsert_rating(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_event_id UUID,
    p_rating INT,
    p_comment TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    from_user_id UUID,
    to_user_id UUID,
    event_id UUID,
    rating INT,
    comment TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_new BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_is_new BOOLEAN := TRUE;
BEGIN
    -- Vérifier si le rating existe déjà
    SELECT r.id INTO v_existing_id
    FROM public.ratings r
    WHERE r.from_user_id = p_from_user_id
    AND r.to_user_id = p_to_user_id
    AND (r.event_id = p_event_id OR (r.event_id IS NULL AND p_event_id IS NULL));

    IF v_existing_id IS NOT NULL THEN
        -- Mettre à jour le rating existant
        v_is_new := FALSE;
        UPDATE public.ratings r
        SET 
            rating = p_rating,
            comment = p_comment,
            updated_at = NOW()
        WHERE r.id = v_existing_id;
    ELSE
        -- Insérer un nouveau rating
        INSERT INTO public.ratings (from_user_id, to_user_id, event_id, rating, comment)
        VALUES (p_from_user_id, p_to_user_id, p_event_id, p_rating, p_comment)
        RETURNING ratings.id INTO v_existing_id;
    END IF;

    -- Retourner le rating
    RETURN QUERY
    SELECT 
        r.id,
        r.from_user_id,
        r.to_user_id,
        r.event_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        v_is_new
    FROM public.ratings r
    WHERE r.id = v_existing_id;
END;
$$;

-- 10. Fonction pour supprimer un rating
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_rating(p_rating_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted BOOLEAN := FALSE;
BEGIN
    DELETE FROM public.ratings
    WHERE id = p_rating_id
    AND from_user_id = auth.uid();
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT > 0;
    RETURN v_deleted;
END;
$$;

-- 11. Fonction pour vérifier si un utilisateur peut noter un autre
-- ============================================
CREATE OR REPLACE FUNCTION public.can_rate_user(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_event_id UUID DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ne peut pas se noter soi-même
    IF p_from_user_id = p_to_user_id THEN
        RETURN FALSE;
    END IF;

    -- Si un événement est spécifié, vérifier que les deux ont participé
    IF p_event_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.event_participants ep1
            JOIN public.event_participants ep2 ON ep1.event_id = ep2.event_id
            WHERE ep1.event_id = p_event_id
            AND ep1.user_id = p_from_user_id
            AND ep2.user_id = p_to_user_id
            AND ep1.status = 'going'
            AND ep2.status = 'going'
        );
    END IF;

    -- Sinon, vérifier s'ils sont amis
    RETURN EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted'
        AND (
            (user_id = p_from_user_id AND friend_id = p_to_user_id) OR
            (friend_id = p_from_user_id AND user_id = p_to_user_id)
        )
    );
END;
$$;

-- 12. Fonction pour obtenir les ratings des participants d'un événement
-- ============================================
CREATE OR REPLACE FUNCTION public.get_event_participant_ratings(p_event_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    average_rating NUMERIC,
    total_ratings INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.full_name,
        p.avatar_url,
        COALESCE(AVG(r.rating), 0)::NUMERIC as average_rating,
        COALESCE(COUNT(r.id), 0)::INT as total_ratings
    FROM public.event_participants ep
    JOIN public.profiles p ON p.id = ep.user_id
    LEFT JOIN public.ratings r ON r.to_user_id = p.id
    WHERE ep.event_id = p_event_id
    AND ep.status = 'going'
    GROUP BY p.id, p.username, p.full_name, p.avatar_url
    ORDER BY average_rating DESC, total_ratings DESC;
END;
$$;

-- 13. Accorder les permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.ratings TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rating_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_given_ratings(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_received_ratings(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_rating(UUID, UUID, UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_rating(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_rate_user(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_participant_ratings(UUID) TO authenticated;

-- 14. Commentaires pour la documentation
-- ============================================
COMMENT ON TABLE public.ratings IS 'Table pour stocker les évaluations entre utilisateurs';
COMMENT ON COLUMN public.ratings.from_user_id IS 'ID de l''utilisateur qui donne la note';
COMMENT ON COLUMN public.ratings.to_user_id IS 'ID de l''utilisateur qui reçoit la note';
COMMENT ON COLUMN public.ratings.event_id IS 'ID de l''événement associé (optionnel)';
COMMENT ON COLUMN public.ratings.rating IS 'Note de 1 à 5 étoiles';
COMMENT ON COLUMN public.ratings.comment IS 'Commentaire optionnel';

COMMENT ON FUNCTION public.get_user_rating_stats(UUID) IS 'Obtenir les statistiques de rating d''un utilisateur';
COMMENT ON FUNCTION public.get_user_given_ratings(UUID, INT, INT) IS 'Obtenir les ratings donnés par un utilisateur';
COMMENT ON FUNCTION public.get_user_received_ratings(UUID, INT, INT) IS 'Obtenir les ratings reçus par un utilisateur';
COMMENT ON FUNCTION public.upsert_rating(UUID, UUID, UUID, INT, TEXT) IS 'Créer ou mettre à jour un rating';
COMMENT ON FUNCTION public.delete_rating(UUID) IS 'Supprimer un rating';
COMMENT ON FUNCTION public.can_rate_user(UUID, UUID, UUID) IS 'Vérifier si un utilisateur peut en noter un autre';
COMMENT ON FUNCTION public.get_event_participant_ratings(UUID) IS 'Obtenir les ratings des participants d''un événement';

-- FIN DE LA MIGRATION