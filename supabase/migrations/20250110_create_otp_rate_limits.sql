-- Create table to track OTP requests and enforce rate limiting
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_allowed_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_phone ON otp_rate_limits(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_next_allowed ON otp_rate_limits(next_allowed_at);

-- Enable RLS
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy to allow insert for anyone (public access for OTP requests)
CREATE POLICY "Anyone can insert OTP rate limit entries" ON otp_rate_limits
    FOR INSERT 
    WITH CHECK (true);

-- Policy to allow select for checking rate limits (public access)
CREATE POLICY "Anyone can check OTP rate limits" ON otp_rate_limits
    FOR SELECT 
    USING (true);

-- Policy to allow system to delete old entries (cleanup)
CREATE POLICY "System can delete old OTP rate limit entries" ON otp_rate_limits
    FOR DELETE 
    USING (created_at < NOW() - INTERVAL '24 hours');

-- Grant permissions
GRANT SELECT, INSERT ON otp_rate_limits TO anon;
GRANT SELECT, INSERT, DELETE ON otp_rate_limits TO authenticated;
GRANT ALL ON otp_rate_limits TO service_role;

-- Function to check if phone number can request OTP
CREATE OR REPLACE FUNCTION check_otp_rate_limit(phone_num TEXT)
RETURNS TABLE (
    can_request BOOLEAN,
    next_allowed_at TIMESTAMPTZ,
    time_remaining_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN MAX(orl.next_allowed_at) IS NULL THEN true
            WHEN MAX(orl.next_allowed_at) <= NOW() THEN true
            ELSE false
        END AS can_request,
        MAX(orl.next_allowed_at) AS next_allowed_at,
        CASE 
            WHEN MAX(orl.next_allowed_at) IS NULL THEN 0
            WHEN MAX(orl.next_allowed_at) <= NOW() THEN 0
            ELSE EXTRACT(EPOCH FROM (MAX(orl.next_allowed_at) - NOW()))::INTEGER
        END AS time_remaining_seconds
    FROM otp_rate_limits orl
    WHERE orl.phone_number = phone_num
    AND orl.next_allowed_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record OTP request
CREATE OR REPLACE FUNCTION record_otp_request(
    phone_num TEXT,
    ip_addr INET DEFAULT NULL,
    user_agt TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    next_allowed_at TIMESTAMPTZ
) AS $$
DECLARE
    v_can_request BOOLEAN;
    v_next_allowed TIMESTAMPTZ;
    v_time_remaining INTEGER;
BEGIN
    -- Check current rate limit
    SELECT * INTO v_can_request, v_next_allowed, v_time_remaining
    FROM check_otp_rate_limit(phone_num);
    
    IF NOT v_can_request THEN
        RETURN QUERY
        SELECT 
            false AS success,
            format('Please wait %s minutes before requesting another code', 
                   CEIL(v_time_remaining / 60.0)::TEXT) AS message,
            v_next_allowed AS next_allowed_at;
        RETURN;
    END IF;
    
    -- Record the new request
    INSERT INTO otp_rate_limits (phone_number, ip_address, user_agent)
    VALUES (phone_num, ip_addr, user_agt);
    
    RETURN QUERY
    SELECT 
        true AS success,
        'OTP request recorded' AS message,
        NOW() + INTERVAL '5 minutes' AS next_allowed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_otp_rate_limit(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_otp_request(TEXT, INET, TEXT) TO anon, authenticated;

-- Create a cleanup job (to be run periodically)
-- This removes entries older than 24 hours to keep the table clean
CREATE OR REPLACE FUNCTION cleanup_old_otp_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_rate_limits 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;