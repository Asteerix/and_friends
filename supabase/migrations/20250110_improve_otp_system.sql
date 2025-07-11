-- Amélioration du système OTP avec des fonctionnalités avancées

-- Table pour tracker les coûts OTP et optimiser l'utilisation
CREATE TABLE IF NOT EXISTS otp_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    provider TEXT DEFAULT 'twilio',
    cost_estimate DECIMAL(10,4) DEFAULT 0.02, -- Coût estimé par SMS
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    network_type TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour détecter les numéros jetables/suspects
CREATE TABLE IF NOT EXISTS suspicious_phone_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL UNIQUE,
    pattern_type TEXT NOT NULL, -- 'prefix', 'regex', 'provider'
    risk_score INTEGER NOT NULL DEFAULT 50, -- 0-100
    description TEXT,
    country_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer des patterns de numéros suspects connus
INSERT INTO suspicious_phone_patterns (pattern, pattern_type, risk_score, description, country_code)
VALUES 
    ('+3370', 'prefix', 80, 'Online SMS France', 'FR'),
    ('+3377', 'prefix', 80, 'Virtual Number France', 'FR'),
    ('+1267', 'prefix', 70, 'TextNow US', 'US'),
    ('+1332', 'prefix', 70, 'Talkatone US', 'US'),
    ('+44791', 'prefix', 75, 'Virtual UK', 'GB')
ON CONFLICT (pattern) DO NOTHING;

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_cost_tracking_phone ON otp_cost_tracking(phone_number);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_sent_at ON otp_cost_tracking(sent_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_patterns_active ON suspicious_phone_patterns(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE otp_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_phone_patterns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage cost tracking" ON otp_cost_tracking
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read suspicious patterns" ON suspicious_phone_patterns
    FOR SELECT USING (is_active = true);

-- Fonction améliorée pour vérifier le rate limit avec analyse de risque
CREATE OR REPLACE FUNCTION check_otp_rate_limit_advanced(
    phone_num TEXT,
    check_suspicious BOOLEAN DEFAULT true
)
RETURNS TABLE (
    can_request BOOLEAN,
    next_allowed_at TIMESTAMPTZ,
    time_remaining_seconds INTEGER,
    risk_score INTEGER,
    risk_reason TEXT,
    daily_count INTEGER,
    hourly_count INTEGER,
    estimated_cost DECIMAL
) AS $$
DECLARE
    v_risk_score INTEGER := 0;
    v_risk_reason TEXT;
    v_daily_count INTEGER;
    v_hourly_count INTEGER;
    v_estimated_cost DECIMAL;
    v_rate_limit RECORD;
BEGIN
    -- Check basic rate limit first
    SELECT * INTO v_rate_limit
    FROM check_otp_rate_limit(phone_num);
    
    -- Count daily and hourly requests
    SELECT 
        COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '24 hours'),
        COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '1 hour')
    INTO v_daily_count, v_hourly_count
    FROM otp_cost_tracking
    WHERE phone_number = phone_num
    AND success = true;
    
    -- Calculate estimated cost (last 30 days)
    SELECT COALESCE(SUM(cost_estimate), 0)
    INTO v_estimated_cost
    FROM otp_cost_tracking
    WHERE phone_number = phone_num
    AND sent_at > NOW() - INTERVAL '30 days';
    
    -- Check for suspicious patterns if enabled
    IF check_suspicious THEN
        -- Check prefix patterns
        SELECT MAX(sp.risk_score), STRING_AGG(sp.description, ', ')
        INTO v_risk_score, v_risk_reason
        FROM suspicious_phone_patterns sp
        WHERE sp.is_active = true
        AND sp.pattern_type = 'prefix'
        AND phone_num LIKE sp.pattern || '%';
        
        -- Additional risk factors
        IF v_daily_count > 10 THEN
            v_risk_score := GREATEST(v_risk_score, 60);
            v_risk_reason := COALESCE(v_risk_reason || ', ', '') || 'High daily usage';
        END IF;
        
        IF v_hourly_count > 3 THEN
            v_risk_score := GREATEST(v_risk_score, 40);
            v_risk_reason := COALESCE(v_risk_reason || ', ', '') || 'High hourly usage';
        END IF;
    END IF;
    
    -- Override can_request if risk is too high
    IF v_risk_score >= 80 THEN
        v_rate_limit.can_request := false;
        v_risk_reason := COALESCE(v_risk_reason, 'High risk number');
    END IF;
    
    RETURN QUERY
    SELECT 
        v_rate_limit.can_request,
        v_rate_limit.next_allowed_at,
        v_rate_limit.time_remaining_seconds,
        COALESCE(v_risk_score, 0),
        v_risk_reason,
        v_daily_count,
        v_hourly_count,
        v_estimated_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer l'envoi OTP avec tracking des coûts
CREATE OR REPLACE FUNCTION record_otp_sent_with_cost(
    phone_num TEXT,
    network_type_param TEXT DEFAULT NULL,
    retry_count_param INTEGER DEFAULT 0,
    success_param BOOLEAN DEFAULT true,
    error_msg TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_tracking_id UUID;
BEGIN
    -- Insert cost tracking record
    INSERT INTO otp_cost_tracking (
        phone_number,
        network_type,
        retry_count,
        success,
        error_message
    )
    VALUES (
        phone_num,
        network_type_param,
        retry_count_param,
        success_param,
        error_msg
    )
    RETURNING id INTO v_tracking_id;
    
    -- Also record in the rate limit table if successful
    IF success_param THEN
        PERFORM record_otp_request(phone_num);
    END IF;
    
    RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir des statistiques OTP
CREATE OR REPLACE FUNCTION get_otp_statistics(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_sent INTEGER,
    total_cost DECIMAL,
    success_rate DECIMAL,
    avg_retry_count DECIMAL,
    unique_phones INTEGER,
    top_error TEXT,
    peak_hour INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_sent,
        SUM(cost_estimate) AS total_cost,
        (COUNT(*) FILTER (WHERE success = true) * 100.0 / NULLIF(COUNT(*), 0))::DECIMAL(5,2) AS success_rate,
        AVG(retry_count)::DECIMAL(5,2) AS avg_retry_count,
        COUNT(DISTINCT phone_number)::INTEGER AS unique_phones,
        MODE() WITHIN GROUP (ORDER BY error_message) AS top_error,
        EXTRACT(HOUR FROM MODE() WITHIN GROUP (ORDER BY sent_at))::INTEGER AS peak_hour
    FROM otp_cost_tracking
    WHERE sent_at > NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction de nettoyage optimisée
CREATE OR REPLACE FUNCTION cleanup_otp_data()
RETURNS void AS $$
BEGIN
    -- Delete old rate limits
    DELETE FROM otp_rate_limits 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Delete old failed attempts
    DELETE FROM otp_failed_attempts 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Delete old cost tracking (keep 90 days for analysis)
    DELETE FROM otp_cost_tracking 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Archive statistics before deletion
    INSERT INTO otp_statistics_archive (period_start, period_end, stats)
    SELECT 
        NOW() - INTERVAL '90 days',
        NOW() - INTERVAL '60 days',
        jsonb_build_object(
            'total_sent', COUNT(*),
            'total_cost', SUM(cost_estimate),
            'unique_phones', COUNT(DISTINCT phone_number)
        )
    FROM otp_cost_tracking
    WHERE created_at BETWEEN (NOW() - INTERVAL '90 days') AND (NOW() - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table pour archiver les statistiques
CREATE TABLE IF NOT EXISTS otp_statistics_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    stats JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_otp_rate_limit_advanced(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_otp_sent_with_cost(TEXT, TEXT, INTEGER, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_otp_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_otp_data() TO service_role;

-- Create a scheduled job to run cleanup daily (if using pg_cron)
-- SELECT cron.schedule('cleanup-otp-data', '0 3 * * *', 'SELECT cleanup_otp_data();');