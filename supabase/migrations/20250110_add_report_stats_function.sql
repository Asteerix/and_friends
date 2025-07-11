-- Create function to get report statistics
CREATE OR REPLACE FUNCTION get_report_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_reports', COUNT(*)::INTEGER,
    'pending_reports', COUNT(*) FILTER (WHERE status = 'pending')::INTEGER,
    'reviewing_reports', COUNT(*) FILTER (WHERE status = 'reviewing')::INTEGER,
    'resolved_reports', COUNT(*) FILTER (WHERE status = 'resolved')::INTEGER,
    'dismissed_reports', COUNT(*) FILTER (WHERE status = 'dismissed')::INTEGER,
    'reports_by_type', (
      SELECT json_object_agg(reported_type, count)
      FROM (
        SELECT reported_type, COUNT(*)::INTEGER as count
        FROM reports
        GROUP BY reported_type
      ) t
    ),
    'reports_by_reason', (
      SELECT json_object_agg(reason, count)
      FROM (
        SELECT reason, COUNT(*)::INTEGER as count
        FROM reports
        GROUP BY reason
      ) t
    ),
    'recent_reports', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::INTEGER
  ) INTO result
  FROM reports;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_report_stats() TO authenticated;