# Supabase Security Audit & Database Schema Documentation

## Overview
This document provides a comprehensive audit of all Supabase tables, columns, security policies, and recommendations for the And Friends application.

## Tables and Columns

### 1. **profiles**
Main user profile table containing personal information.

**Columns:**
- `id` (UUID, PK) - References auth.users(id)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `current_registration_step` (TEXT) - Tracks onboarding progress
- `is_profile_complete` (BOOLEAN)
- `full_name` (TEXT)
- `display_name` (TEXT)
- `username` (TEXT) - Unique username
- `avatar_url` (TEXT)
- `cover_url` (TEXT)
- `bio` (TEXT)
- `birth_date` (DATE)
- `hide_birth_date` (BOOLEAN)
- `jam_preference` (TEXT) - Deprecated, use individual fields
- `restaurant_preference` (TEXT) - Deprecated, use individual fields
- `selected_jams` (JSONB[])
- `selected_restaurants` (JSONB[])
- `jam_track_id` (TEXT)
- `jam_title` (TEXT)
- `jam_artist` (TEXT)
- `jam_cover_url` (TEXT)
- `jam_preview_url` (TEXT)
- `selected_restaurant_id` (TEXT)
- `selected_restaurant_name` (TEXT)
- `selected_restaurant_address` (TEXT)
- `hobbies` (TEXT[])
- `interests` (TEXT[])
- `path` (TEXT) - Occupation/School
- `location` (TEXT)
- `location_permission_granted` (BOOLEAN)
- `contacts_permission_status` (TEXT)
- `phone` (TEXT) - From auth.users
- `email` (TEXT) - From auth.users
- `last_name_change` (TIMESTAMPTZ)
- `last_username_change` (TIMESTAMPTZ)
- `settings` (JSONB)

**Security Policies:**
- ✅ RLS Enabled
- ✅ Users can only SELECT/UPDATE their own profile
- ✅ No DELETE allowed
- ⚠️ Missing: Input validation for username uniqueness
- ⚠️ Missing: Rate limiting for profile updates

### 2. **events**
Event information and metadata.

**Columns:**
- `id` (UUID, PK)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `date` (TIMESTAMPTZ, NOT NULL)
- `location` (TEXT)
- `image_url` (TEXT)
- `tags` (TEXT[])
- `is_private` (BOOLEAN)
- `created_by` (UUID) - References profiles(id)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Security Policies:**
- ✅ RLS Enabled
- ✅ Public events viewable by all
- ✅ Private events only viewable by creator
- ✅ Users can only update/delete their own events
- ⚠️ Missing: Participant-based access for private events

### 3. **messages**
Chat messages between users.

**Columns:**
- `id` (UUID, PK)
- `chat_id` (UUID) - References chats(id)
- `author_id` (UUID) - References profiles(id)
- `type` (TEXT) - 'text', 'image', 'video', etc.
- `text` (TEXT)
- `meta` (JSONB) - Additional metadata
- `created_at` (TIMESTAMPTZ)

**Security Policies:**
- ✅ RLS Enabled
- ✅ Only chat participants can view/send messages
- ⚠️ Missing: Message edit/delete policies
- ⚠️ Missing: Content moderation checks

### 4. **notifications**
User notifications for various events.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References profiles(id)
- `type` (TEXT, NOT NULL)
- `title` (TEXT, NOT NULL)
- `message` (TEXT)
- `data` (JSONB)
- `read` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

**Security Policies:**
- ✅ RLS Enabled
- ✅ Users can only view/update their own notifications
- ✅ No DELETE policy (good for audit trail)

### 5. **friendships**
Friend relationships between users.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References profiles(id)
- `friend_id` (UUID) - References profiles(id)
- `status` (TEXT) - 'pending', 'accepted', 'blocked'
- `created_at` (TIMESTAMPTZ)

**Security Policies:**
- ✅ RLS Enabled
- ✅ Users can view friendships they're part of
- ✅ UNIQUE constraint on (user_id, friend_id)
- ⚠️ Missing: Reciprocal friendship check

### 6. **stories**
Temporary content similar to Instagram/Snapchat stories.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References profiles(id)
- `content_url` (TEXT)
- `content_type` (TEXT) - 'image' or 'video'
- `caption` (TEXT)
- `mentions` (UUID[])
- `is_public` (BOOLEAN)
- `views_count` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ)

**Security Policies:**
- ✅ RLS Enabled
- ⚠️ Missing: Friend-only visibility option
- ⚠️ Missing: Automatic deletion after expiry

### 7. **ratings**
User ratings for events or other users.

**Columns:**
- `id` (UUID, PK)
- `rater_id` (UUID) - References profiles(id)
- `rated_user_id` (UUID) - References profiles(id)
- `event_id` (UUID) - References events(id)
- `rating` (INTEGER) - 1-5
- `review` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Security Policies:**
- ⚠️ Missing: RLS policies
- ⚠️ Missing: One rating per user per event constraint
- ⚠️ Missing: Self-rating prevention

### 8. **user_blocks**
Blocked user relationships.

**Columns:**
- `id` (UUID, PK)
- `blocker_id` (UUID) - References profiles(id)
- `blocked_id` (UUID) - References profiles(id)
- `reason` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Security Policies:**
- ⚠️ Missing: RLS policies
- ⚠️ Missing: Visibility restrictions for blocked users

### 9. **activities**
User activity feed/timeline.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID) - References profiles(id)
- `type` (TEXT)
- `data` (JSONB)
- `created_at` (TIMESTAMPTZ)

**Security Policies:**
- ⚠️ Missing: RLS policies
- ⚠️ Missing: Privacy controls

## Security Vulnerabilities & Recommendations

### 1. **SQL Injection Protection**
- ✅ Supabase uses parameterized queries by default
- ✅ Created validation utilities in `supabaseValidation.ts`
- ⚠️ **Action Required**: Implement input sanitization in all client-side queries

### 2. **Input Validation**
- ⚠️ **Critical**: No server-side validation for:
  - Username format and uniqueness
  - Email format validation
  - Phone number format validation
  - URL validation for avatar_url, cover_url
  - Array size limits for hobbies, interests, tags

**Recommendation**: Create database-level CHECK constraints:
```sql
ALTER TABLE profiles ADD CONSTRAINT check_username_format 
  CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$');

ALTER TABLE profiles ADD CONSTRAINT check_email_format 
  CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE profiles ADD CONSTRAINT check_array_size_hobbies 
  CHECK (array_length(hobbies, 1) <= 10);
```

### 3. **Rate Limiting**
- ⚠️ **Critical**: No rate limiting on:
  - Profile updates
  - Message sending
  - Friend requests
  - Story uploads

**Recommendation**: Implement rate limiting tables:
```sql
CREATE TABLE rate_limits (
  user_id UUID REFERENCES profiles(id),
  action TEXT,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, action, window_start)
);
```

### 4. **Data Privacy**
- ⚠️ **Issue**: Phone numbers and emails exposed in profiles table
- ⚠️ **Issue**: No encryption for sensitive data
- ⚠️ **Issue**: Birth dates visible even when hide_birth_date is true

**Recommendation**: 
- Move sensitive data to separate encrypted table
- Implement view-level security for birth dates
- Hash phone numbers for matching while preserving privacy

### 5. **Missing RLS Policies**
Tables without proper RLS:
- `ratings`
- `user_blocks`
- `activities`
- `otp_rate_limits`
- `otp_failed_attempts`

**Recommendation**: Add RLS policies immediately:
```sql
-- Example for ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings for public events"
  ON ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ratings.event_id 
      AND NOT events.is_private
    )
  );
```

### 6. **Authentication & Authorization**
- ✅ Using Supabase Auth
- ⚠️ **Issue**: No two-factor authentication
- ⚠️ **Issue**: No session management controls
- ⚠️ **Issue**: No device tracking

### 7. **Data Retention & GDPR**
- ⚠️ **Issue**: No data deletion policies
- ⚠️ **Issue**: No audit trail for data access
- ⚠️ **Issue**: No user data export functionality

**Recommendation**: Implement soft deletes and audit tables:
```sql
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN deletion_reason TEXT;

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. **Content Security**
- ⚠️ **Issue**: No content moderation for messages, stories, bios
- ⚠️ **Issue**: No file type validation for uploads
- ⚠️ **Issue**: No size limits on text fields

### 9. **Performance & Indexing**
Missing indexes on:
- `profiles.username` (UNIQUE)
- `messages.created_at` 
- `stories.expires_at`
- `notifications.user_id, read`

## Implementation Priority

### Critical (Implement Immediately):
1. Add RLS to all tables
2. Implement rate limiting
3. Add input validation constraints
4. Secure sensitive data (phone, email)

### High Priority:
1. Add missing indexes
2. Implement content moderation
3. Add audit logging
4. Fix friendship/blocking logic

### Medium Priority:
1. Implement soft deletes
2. Add two-factor authentication
3. Create data export functionality
4. Add device tracking

### Low Priority:
1. Optimize query performance
2. Add advanced analytics
3. Implement data archival

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] All user inputs are validated
- [ ] Rate limiting is implemented
- [ ] Sensitive data is encrypted
- [ ] Audit logging is in place
- [ ] GDPR compliance is ensured
- [ ] Content moderation is active
- [ ] Regular security audits scheduled
- [ ] Backup and recovery tested
- [ ] Incident response plan created

## Monitoring & Alerts

Set up monitoring for:
- Failed authentication attempts
- Unusual data access patterns
- Rate limit violations
- RLS policy bypasses
- Large data exports
- Suspicious user behavior

## Next Steps

1. Run the security patches in `supabase/migrations/security_patches.sql`
2. Update all client code to use `useSecureSupabase` hook
3. Implement server-side validation functions
4. Set up monitoring and alerting
5. Schedule regular security audits
6. Train team on security best practices