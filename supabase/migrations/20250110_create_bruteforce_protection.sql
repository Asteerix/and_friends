-- Create table to track failed OTP verification attempts for bruteforce protection
CREATE TABLE IF NOT EXISTS otp_failed_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_id TEXT, -- To track attempts from same device
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for banned phone numbers
CREATE TABLE IF NOT EXISTS otp_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    banned_until TIMESTAMPTZ NOT NULL,
    reason TEXT DEFAULT 'Too many failed attempts',
    failed_attempts_count INTEGER NOT NULL DEFAULT 0,
    device_ids TEXT[], -- Array of device IDs that triggered the ban
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_failed_attempts_phone ON otp_failed_attempts(phone_number);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_time ON otp_failed_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_bans_phone ON otp_bans(phone_number);
CREATE INDEX IF NOT EXISTS idx_bans_until ON otp_bans(banned_until);

-- Enable RLS
ALTER TABLE otp_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_bans ENABLE ROW LEVEL SECURITY;

-- Policies for failed attempts
CREATE POLICY "Anyone can insert failed attempts" ON otp_failed_attempts
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Anyone can read failed attempts" ON otp_failed_attempts
    FOR SELECT 
    USING (true);

-- Policies for bans
CREATE POLICY "Anyone can check bans" ON otp_bans
    FOR SELECT 
    USING (true);

CREATE POLICY "System can manage bans" ON otp_bans
    FOR ALL 
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON otp_failed_attempts TO anon;
GRANT SELECT ON otp_bans TO anon;
GRANT ALL ON otp_failed_attempts TO authenticated;
GRANT ALL ON otp_bans TO authenticated;
GRANT ALL ON otp_failed_attempts TO service_role;
GRANT ALL ON otp_bans TO service_role;

-- Function to record failed OTP attempt and check for bruteforce
CREATE OR REPLACE FUNCTION record_failed_otp_attempt(
    phone_num TEXT,
    device_id_param TEXT DEFAULT NULL,
    ip_addr INET DEFAULT NULL,
    user_agt TEXT DEFAULT NULL,
    max_attempts INTEGER DEFAULT 5,
    window_minutes INTEGER DEFAULT 10,
    ban_duration_hours INTEGER DEFAULT 1
)
RETURNS TABLE (
    is_banned BOOLEAN,
    ban_reason TEXT,
    banned_until TIMESTAMPTZ,
    attempts_count INTEGER
) AS $$
DECLARE
    v_recent_attempts INTEGER;
    v_existing_ban RECORD;
BEGIN
    -- Check if already banned
    SELECT * INTO v_existing_ban
    FROM otp_bans
    WHERE phone_number = phone_num
    AND banned_until > NOW()
    ORDER BY banned_until DESC
    LIMIT 1;
    
    IF v_existing_ban.id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            true AS is_banned,
            v_existing_ban.reason AS ban_reason,
            v_existing_ban.banned_until AS banned_until,
            v_existing_ban.failed_attempts_count AS attempts_count;
        RETURN;
    END IF;
    
    -- Record the failed attempt
    INSERT INTO otp_failed_attempts (phone_number, device_id, ip_address, user_agent)
    VALUES (phone_num, device_id_param, ip_addr, user_agt);
    
    -- Count recent attempts
    SELECT COUNT(*) INTO v_recent_attempts
    FROM otp_failed_attempts
    WHERE phone_number = phone_num
    AND attempted_at > NOW() - INTERVAL '1 minute' * window_minutes;
    
    -- Check if should ban
    IF v_recent_attempts >= max_attempts THEN
        -- Get all device IDs that contributed to the ban
        INSERT INTO otp_bans (
            phone_number, 
            banned_until, 
            failed_attempts_count,
            device_ids,
            reason
        )
        VALUES (
            phone_num,
            NOW() + INTERVAL '1 hour' * ban_duration_hours,
            v_recent_attempts,
            ARRAY(
                SELECT DISTINCT device_id 
                FROM otp_failed_attempts 
                WHERE phone_number = phone_num 
                AND attempted_at > NOW() - INTERVAL '1 minute' * window_minutes
                AND device_id IS NOT NULL
            ),
            format('Too many failed attempts (%s in %s minutes)', v_recent_attempts, window_minutes)
        )
        ON CONFLICT (phone_number) 
        DO UPDATE SET
            banned_until = EXCLUDED.banned_until,
            banned_at = NOW(),
            failed_attempts_count = EXCLUDED.failed_attempts_count,
            device_ids = EXCLUDED.device_ids,
            reason = EXCLUDED.reason;
        
        RETURN QUERY
        SELECT 
            true AS is_banned,
            format('Too many failed attempts (%s in %s minutes)', v_recent_attempts, window_minutes) AS ban_reason,
            NOW() + INTERVAL '1 hour' * ban_duration_hours AS banned_until,
            v_recent_attempts AS attempts_count;
    ELSE
        RETURN QUERY
        SELECT 
            false AS is_banned,
            NULL::TEXT AS ban_reason,
            NULL::TIMESTAMPTZ AS banned_until,
            v_recent_attempts AS attempts_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if phone number or device is banned
CREATE OR REPLACE FUNCTION check_otp_ban_status(
    phone_num TEXT,
    device_id_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    is_banned BOOLEAN,
    ban_reason TEXT,
    banned_until TIMESTAMPTZ,
    time_remaining_seconds INTEGER
) AS $$
DECLARE
    v_ban RECORD;
BEGIN
    -- Check phone number ban
    SELECT * INTO v_ban
    FROM otp_bans
    WHERE phone_number = phone_num
    AND banned_until > NOW()
    ORDER BY banned_until DESC
    LIMIT 1;
    
    -- Also check if this device was involved in any ban
    IF v_ban.id IS NULL AND device_id_param IS NOT NULL THEN
        SELECT * INTO v_ban
        FROM otp_bans
        WHERE device_id_param = ANY(device_ids)
        AND banned_until > NOW()
        ORDER BY banned_until DESC
        LIMIT 1;
    END IF;
    
    IF v_ban.id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            true AS is_banned,
            v_ban.reason AS ban_reason,
            v_ban.banned_until AS banned_until,
            EXTRACT(EPOCH FROM (v_ban.banned_until - NOW()))::INTEGER AS time_remaining_seconds;
    ELSE
        RETURN QUERY
        SELECT 
            false AS is_banned,
            NULL::TEXT AS ban_reason,
            NULL::TIMESTAMPTZ AS banned_until,
            0 AS time_remaining_seconds;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for old records
CREATE OR REPLACE FUNCTION cleanup_old_otp_records()
RETURNS void AS $$
BEGIN
    -- Delete failed attempts older than 24 hours
    DELETE FROM otp_failed_attempts 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Delete expired bans older than 7 days
    DELETE FROM otp_bans 
    WHERE banned_until < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION record_failed_otp_attempt(TEXT, TEXT, INET, TEXT, INTEGER, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_otp_ban_status(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_otp_records() TO service_role;