-- First, let's rename the old reports table if it exists
ALTER TABLE IF EXISTS reports RENAME TO reports_old;

-- Create new unified reports table
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('user', 'event', 'message', 'story', 'memory')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate_content', 'spam', 'harassment', 'fake_profile', 'inappropriate_name', 'violence', 'hate_speech', 'adult_content', 'misinformation', 'copyright', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing data from old reports table
INSERT INTO reports (
  id,
  reporter_id,
  reported_type,
  reported_id,
  reason,
  details,
  status,
  resolved_by,
  resolved_at,
  resolution_notes,
  created_at
)
SELECT 
  id,
  reporter_id,
  CASE 
    WHEN reported_user_id IS NOT NULL THEN 'user'
    WHEN reported_event_id IS NOT NULL THEN 'event'
    WHEN reported_message_id IS NOT NULL THEN 'message'
    WHEN reported_story_id IS NOT NULL THEN 'story'
    WHEN reported_memory_id IS NOT NULL THEN 'memory'
  END as reported_type,
  COALESCE(reported_user_id, reported_event_id, reported_message_id, reported_story_id, reported_memory_id) as reported_id,
  reason,
  description as details,
  COALESCE(status, 'pending'),
  reviewed_by as resolved_by,
  reviewed_at as resolved_at,
  resolution as resolution_notes,
  created_at
FROM reports_old
WHERE COALESCE(reported_user_id, reported_event_id, reported_message_id, reported_story_id, reported_memory_id) IS NOT NULL;

-- Drop old table
DROP TABLE IF EXISTS reports_old;

-- Create indexes for performance
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_type, reported_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Create unique constraint to prevent duplicate reports
CREATE UNIQUE INDEX idx_unique_report ON reports(reporter_id, reported_type, reported_id);

-- Create report actions table for audit trail
CREATE TABLE IF NOT EXISTS report_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action_by UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'reviewed', 'resolved', 'dismissed', 'escalated', 'content_hidden', 'content_deleted', 'user_warned', 'user_suspended', 'user_banned')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for report actions
CREATE INDEX idx_report_actions_report ON report_actions(report_id);
CREATE INDEX idx_report_actions_created ON report_actions(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for reports table
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for report statistics
CREATE OR REPLACE VIEW report_statistics AS
SELECT 
  reported_type,
  status,
  COUNT(*) as count,
  COUNT(DISTINCT reporter_id) as unique_reporters,
  MIN(created_at) as oldest_report,
  MAX(created_at) as newest_report
FROM reports
GROUP BY reported_type, status;

-- Create function to check if content should be auto-hidden
CREATE OR REPLACE FUNCTION check_auto_hide_content()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
  threshold INTEGER := 3; -- Auto-hide after 3 reports
BEGIN
  -- Count pending reports for this content
  SELECT COUNT(*) INTO report_count
  FROM reports
  WHERE reported_type = NEW.reported_type
    AND reported_id = NEW.reported_id
    AND status = 'pending';
  
  -- If threshold reached, create an action record
  IF report_count >= threshold THEN
    INSERT INTO report_actions (report_id, action_by, action, notes)
    VALUES (NEW.id, NEW.reporter_id, 'content_hidden', 'Auto-hidden after reaching report threshold');
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-hiding content
CREATE TRIGGER auto_hide_reported_content AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION check_auto_hide_content();

-- Create RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_actions ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Admins can view all report actions
CREATE POLICY "Admins can view report actions" ON report_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Admins can create report actions
CREATE POLICY "Admins can create report actions" ON report_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Add helper function to get report count for content
CREATE OR REPLACE FUNCTION get_report_count(p_type TEXT, p_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM reports
  WHERE reported_type = p_type
    AND reported_id = p_id
    AND status = 'pending';
$$ LANGUAGE SQL STABLE;

-- Add helper function to check if content is reported by user
CREATE OR REPLACE FUNCTION is_reported_by_user(p_user_id UUID, p_type TEXT, p_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM reports
    WHERE reporter_id = p_user_id
      AND reported_type = p_type
      AND reported_id = p_id
  );
$$ LANGUAGE SQL STABLE;