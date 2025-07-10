# Notification System Documentation

## Overview

The notification system automatically creates notifications for various user actions through database triggers. Notifications are displayed in real-time and users can navigate to the relevant content by tapping on them.

## Notification Types

### Friend-Related
- **`friend_request`** - When someone sends you a friend request
- **`friend_accepted`** - When someone accepts your friend request

### Rating-Related
- **`new_rating`** - When someone rates you (with stars and optional comment)

### Event-Related
- **`event_invite`** - When invited to an event
- **`event_join`** - When someone joins your event (notifies creator)
- **`event_accepted`** - When accepted into a private event
- **`event_removed`** - When removed from an event
- **`rsvp_update`** - When RSVP status changes

### Story/Memory-Related
- **`story_like`** - When someone likes your story/memory
- **`story_comment`** - When someone comments on your story/memory

### Message-Related (existing)
- **`new_message`** - New chat message
- **`message_reply`** - Reply to message

## Database Schema

### notifications table
```sql
- id: UUID (primary key)
- user_id: UUID (recipient)
- type: TEXT (see types above)
- title: TEXT
- body: TEXT
- data: JSONB (additional metadata)
- related_user_id: UUID (optional)
- related_event_id: UUID (optional)
- related_chat_id: UUID (optional)
- read: BOOLEAN
- read_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- action_url: TEXT (optional)
- action_type: TEXT (optional)
```

## Automatic Triggers

Notifications are created automatically via database triggers:

### 1. Friend Request Trigger
- Fires on `friendships` table INSERT/UPDATE
- Creates notification when status = 'pending' (new request)
- Creates notification when status = 'accepted' (request accepted)

### 2. Rating Trigger
- Fires on `ratings` table INSERT
- Notifies the user being rated
- Includes rating value and comment in notification

### 3. Event Participation Trigger
- Fires on `event_participants` table INSERT/UPDATE
- Notifies event creator when someone joins
- Notifies participant when accepted to private event

### 4. Event Removal Trigger
- Fires on `event_participants` table UPDATE/DELETE
- Notifies user when removed from event

### 5. Story Like Trigger
- Fires on `story_likes` table INSERT
- Notifies story owner (except self-likes)

### 6. Story Comment Trigger
- Fires on `story_comments` table INSERT
- Notifies story owner (except self-comments)
- Shows preview of comment in notification

## Manual Notification Creation

You can also create notifications manually using the helper function:

```typescript
import { createNotification } from '@/utils/notifications';

await createNotification({
  userId: 'recipient-user-id',
  type: 'friend_request',
  title: 'New Friend Request',
  body: 'John Doe sent you a friend request',
  relatedUserId: 'sender-user-id',
  data: {
    sender_name: 'John Doe',
    sender_username: 'johndoe'
  }
});
```

## Navigation Handling

NotificationsScreen handles navigation based on notification type:

- **Friend notifications** → Profile/PersonCard screen
- **Event notifications** → EventDetails screen
- **Story notifications** → Memories/Stories screen
- **Message notifications** → Chat/Conversation screen
- **Rating notifications** → Profile of the rater

## UI Features

### NotificationItem Component
- Color-coded icons for different notification types
- Unread notifications have:
  - Light blue background
  - Bold text
  - Blue dot indicator
- Shows user avatar or event placeholder
- Time formatting (just now, 5m ago, 3h ago, etc.)

### Icon Colors
- 🟡 Ratings (gold star)
- ❤️ Story likes (red heart)
- 💬 Story comments (blue chat bubble)
- 🟢 Friend requests/accepted (green person)
- 📅 Event notifications (calendar)
- 🔴 Event removal (red for negative actions)

## Real-time Updates

The notification system uses Supabase real-time subscriptions:
- New notifications appear instantly
- Read status updates in real-time
- Unread count badge updates automatically

## Permissions (RLS)

- Users can only see their own notifications
- Users can only update (mark as read) their own notifications
- Users can only delete their own notifications
- System/triggers can create notifications for any user

## Testing

Run the test script to verify the system:
```bash
node scripts/test-notifications.js
```

This will check:
- Table structure
- Trigger existence
- Manual notification creation
- Function availability
- RLS policies

## Future Enhancements

1. Push notifications integration
2. Email notifications for important events
3. Notification preferences/settings
4. Batch notification grouping
5. Rich media notifications (images, videos)
6. Notification sounds/vibrations