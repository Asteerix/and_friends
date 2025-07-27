# Chat Routes Architecture

## Route Structure

- `/chat` - Redirects to chat list screen
- `/chat/conversation/[id]` - Shows a specific conversation

## URL Patterns

The app supports multiple URL patterns for accessing conversations:

1. **New pattern**: `/chat/conversation/[id]`
   - Example: `/chat/conversation/676e8707-d9ae-4c43-a709-344a2d8a05b1`
   - This is the preferred pattern

2. **Legacy pattern**: `/screens/conversation?chatId=[id]`
   - Example: `/screens/conversation?chatId=676e8707-d9ae-4c43-a709-344a2d8a05b1`
   - Still supported for backward compatibility

## How it works

The `/chat/conversation/[id].tsx` route automatically redirects to the legacy pattern to maintain compatibility with existing code while supporting the new URL structure.