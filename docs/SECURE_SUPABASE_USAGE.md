# Secure Supabase Usage Guide

## Overview
This guide demonstrates how to securely use Supabase in the And Friends application with proper validation, error handling, and protection against common vulnerabilities.

## 1. Import Required Utilities

```typescript
import { 
  validateProfileUpdate,
  validateEventCreate,
  validateMessageCreate,
  sanitizeString,
  sanitizeArray,
  validateUUID,
  handleSupabaseError,
  InputValidators,
  rateLimiters,
  safeSupabaseOperation,
  ValidationError,
  DatabaseError
} from '@/shared/utils/supabaseValidation';

import { useSecureSupabase } from '@/shared/hooks/useSecureSupabase';
```

## 2. Profile Operations

### Updating a Profile

```typescript
// ❌ BAD: Direct update without validation
const updateProfile = async (updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .single();
};

// ✅ GOOD: Validated and sanitized update
const updateProfile = async (updates: Partial<UserProfile>) => {
  try {
    // Validate input
    const validatedData = validateProfileUpdate(updates);
    
    // Additional validation
    if (validatedData.username) {
      const error = InputValidators.username(validatedData.username);
      if (error) throw new ValidationError(error, 'username');
      validatedData.username = sanitizeString(validatedData.username).toLowerCase();
    }
    
    if (validatedData.bio) {
      validatedData.bio = sanitizeString(validatedData.bio);
    }
    
    // Use safe operation wrapper
    const result = await safeSupabaseOperation(async () => {
      return await supabase
        .from('profiles')
        .update(validatedData)
        .eq('id', userId)
        .single();
    });
    
    if (result.error) {
      // Error is already handled and user-friendly
      Alert.alert('Error', result.error.message);
      return;
    }
    
    // Success
    return result.data;
  } catch (err) {
    const error = handleSupabaseError(err);
    Alert.alert('Error', error.message);
  }
};
```

### Using the Secure Hook

```typescript
function EditProfileScreen() {
  const { secureUpdateProfile } = useSecureSupabase();
  
  const handleSave = async () => {
    const result = await secureUpdateProfile(userId, {
      full_name: name,
      bio: bio,
      hobbies: selectedHobbies,
    });
    
    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }
    
    Alert.alert('Success', 'Profile updated!');
  };
}
```

## 3. Message Operations

### Sending Messages with Rate Limiting

```typescript
// ❌ BAD: No rate limiting or validation
const sendMessage = async (text: string) => {
  await supabase.from('messages').insert({
    chat_id: chatId,
    author_id: userId,
    text: text,
  });
};

// ✅ GOOD: Rate limited and validated
const sendMessage = async (text: string) => {
  // Check rate limit
  if (!rateLimiters.api.isAllowed(`message:${userId}`)) {
    const remainingTime = rateLimiters.api.getRemainingTime(`message:${userId}`);
    Alert.alert(
      'Too Many Messages', 
      `Please wait ${Math.ceil(remainingTime / 1000)} seconds`
    );
    return;
  }
  
  // Validate and sanitize
  const sanitizedText = sanitizeString(text);
  if (!sanitizedText || sanitizedText.length > 10000) {
    Alert.alert('Error', 'Invalid message');
    return;
  }
  
  // Validate UUIDs
  if (!validateUUID(chatId) || !validateUUID(userId)) {
    Alert.alert('Error', 'Invalid chat or user');
    return;
  }
  
  const result = await safeSupabaseOperation(async () => {
    return await supabase.from('messages').insert({
      chat_id: chatId,
      author_id: userId,
      text: sanitizedText,
      type: 'text',
    }).single();
  });
  
  if (result.error) {
    Alert.alert('Error', result.error.message);
  }
};
```

## 4. Search Operations

### Safe User Search

```typescript
// ❌ BAD: SQL injection vulnerable
const searchUsers = async (term: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${term}%`);
};

// ✅ GOOD: Sanitized and limited
const { secureSearchUsers } = useSecureSupabase();

const handleSearch = async (searchTerm: string) => {
  const result = await secureSearchUsers(searchTerm, 20);
  
  if (result.error) {
    if (result.error instanceof ValidationError) {
      // Show validation error to user
      setSearchError(result.error.message);
    } else {
      // Log other errors
      console.error('Search error:', result.error);
      setSearchError('Search failed. Please try again.');
    }
    return;
  }
  
  setSearchResults(result.data);
};
```

## 5. Event Operations

### Creating Events

```typescript
const { secureCreateEvent } = useSecureSupabase();

const createEvent = async (eventData: any) => {
  // Client-side validation first
  if (!eventData.title || eventData.title.length < 3) {
    Alert.alert('Error', 'Event title must be at least 3 characters');
    return;
  }
  
  const result = await secureCreateEvent({
    title: eventData.title,
    description: eventData.description,
    date: eventData.date,
    location: eventData.location,
    tags: eventData.tags,
    is_private: eventData.isPrivate,
    created_by: userId,
  });
  
  if (result.error) {
    Alert.alert('Error', result.error.message);
    return;
  }
  
  // Navigate to event
  router.push(`/events/${result.data.id}`);
};
```

## 6. Friendship Operations

### Adding Friends Safely

```typescript
const { secureAddFriend } = useSecureSupabase();

const sendFriendRequest = async (friendId: string) => {
  // Validate UUID format
  if (!validateUUID(friendId)) {
    Alert.alert('Error', 'Invalid user ID');
    return;
  }
  
  const result = await secureAddFriend(userId, friendId);
  
  if (result.error) {
    if (result.error.message.includes('already exists')) {
      Alert.alert('Info', 'Friend request already sent');
    } else if (result.error.message.includes('yourself')) {
      Alert.alert('Error', 'You cannot add yourself as a friend');
    } else {
      Alert.alert('Error', result.error.message);
    }
    return;
  }
  
  Alert.alert('Success', 'Friend request sent!');
};
```

## 7. Error Handling Patterns

### Comprehensive Error Handling

```typescript
const performDatabaseOperation = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const result = await safeSupabaseOperation(async () => {
      // Your Supabase operation here
    });
    
    if (result.error) {
      // Check error type
      if (result.error instanceof ValidationError) {
        // Show field-specific error
        if (result.error.field) {
          setFieldError(result.error.field, result.error.message);
        } else {
          Alert.alert('Validation Error', result.error.message);
        }
      } else if (result.error instanceof DatabaseError) {
        // Handle database errors
        if (result.error.code === 'PGRST301') {
          // Session expired
          await supabase.auth.signOut();
          router.replace('/login');
        } else {
          Alert.alert('Database Error', result.error.message);
        }
      } else if (result.error.message.includes('Network')) {
        // Network error
        Alert.alert(
          'Connection Error', 
          'Please check your internet connection'
        );
      } else {
        // Generic error
        Alert.alert('Error', result.error.message);
      }
      return;
    }
    
    // Success handling
    handleSuccess(result.data);
    
  } catch (err) {
    // Unexpected errors
    console.error('Unexpected error:', err);
    Alert.alert(
      'Error', 
      'An unexpected error occurred. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};
```

## 8. Input Validation Examples

### Form Validation

```typescript
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  // Username validation
  if (username) {
    const error = InputValidators.username(username);
    if (error) errors.username = error;
  }
  
  // Email validation
  if (email) {
    const error = InputValidators.email(email);
    if (error) errors.email = error;
  }
  
  // Phone validation
  if (phone) {
    const error = InputValidators.phone(phone);
    if (error) errors.phone = error;
  }
  
  // Birth date validation
  if (birthDate) {
    const error = InputValidators.birthDate(birthDate);
    if (error) errors.birthDate = error;
  }
  
  // URL validation
  if (website) {
    const error = InputValidators.url(website);
    if (error) errors.website = error;
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};
```

## 9. Batch Operations

### Safe Batch Updates

```typescript
const { secureBatchOperation } = useSecureSupabase();

const updateMultipleRecords = async () => {
  const operations = selectedItems.map(item => () => 
    supabase
      .from('items')
      .update({ status: 'processed' })
      .eq('id', item.id)
      .single()
  );
  
  const result = await secureBatchOperation(operations);
  
  if (result.error) {
    Alert.alert('Error', 'Some updates failed: ' + result.error.message);
    return;
  }
  
  Alert.alert('Success', `Updated ${result.data.length} items`);
};
```

## 10. Security Best Practices

### 1. Always Validate Input
```typescript
// Always validate before database operations
const validatedData = validateProfileUpdate(data);
```

### 2. Sanitize User Input
```typescript
// Remove potentially dangerous characters
const safeBio = sanitizeString(userInput);
const safeTags = sanitizeArray(tags);
```

### 3. Use Rate Limiting
```typescript
// Prevent abuse
if (!rateLimiters.api.isAllowed(key)) {
  throw new Error('Rate limit exceeded');
}
```

### 4. Handle Errors Gracefully
```typescript
// Provide user-friendly error messages
const error = handleSupabaseError(supabaseError);
Alert.alert('Error', error.message);
```

### 5. Validate UUIDs
```typescript
// Prevent injection through IDs
if (!validateUUID(userId)) {
  throw new ValidationError('Invalid user ID');
}
```

### 6. Use Type Safety
```typescript
// Use TypeScript interfaces
const updateProfile = async (
  updates: Partial<UserProfile>
): Promise<SafeResult<UserProfile>> => {
  // Type-safe operations
};
```

### 7. Log Security Events
```typescript
// Log suspicious activities
console.error('Security: Invalid UUID attempt', { 
  userId, 
  attemptedId: invalidId 
});
```

## Testing Security

### Unit Tests

```typescript
describe('Security Validation', () => {
  test('should sanitize SQL injection attempts', () => {
    const malicious = "'; DROP TABLE users; --";
    const sanitized = sanitizeString(malicious);
    expect(sanitized).not.toContain('DROP TABLE');
  });
  
  test('should validate UUID format', () => {
    expect(validateUUID('123')).toBe(false);
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
  
  test('should enforce rate limits', () => {
    const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 1000 });
    
    expect(limiter.isAllowed('test')).toBe(true);
    expect(limiter.isAllowed('test')).toBe(true);
    expect(limiter.isAllowed('test')).toBe(true);
    expect(limiter.isAllowed('test')).toBe(false);
  });
});
```

## Common Pitfalls to Avoid

1. **Never trust client input**
   - Always validate on both client and server
   - Assume all input is malicious

2. **Don't expose sensitive data**
   - Use views for public data
   - Hide phone numbers and emails

3. **Avoid direct SQL**
   - Use Supabase's query builder
   - Parameterize all queries

4. **Handle all error cases**
   - Network errors
   - Validation errors
   - Permission errors
   - Rate limit errors

5. **Keep security functions updated**
   - Regular security audits
   - Update validation rules
   - Monitor for new attack vectors