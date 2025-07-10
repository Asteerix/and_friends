import { z } from 'zod';
import type { PostgrestError } from '@supabase/supabase-js';

// ============================================
// TABLE SCHEMAS
// ============================================

// Profile Schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  current_registration_step: z.string().nullable().optional(),
  is_profile_complete: z.boolean().default(false),
  full_name: z.string().max(255).nullable().optional(),
  display_name: z.string().max(255).nullable().optional(),
  username: z.string().max(50).regex(/^[a-zA-Z0-9_]+$/).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  birth_date: z.string().nullable().optional(),
  hide_birth_date: z.boolean().default(false),
  jam_preference: z.string().nullable().optional(),
  restaurant_preference: z.string().nullable().optional(),
  selected_jams: z.array(z.any()).default([]),
  selected_restaurants: z.array(z.any()).default([]),
  jam_track_id: z.string().nullable().optional(),
  jam_title: z.string().max(255).nullable().optional(),
  jam_artist: z.string().max(255).nullable().optional(),
  jam_cover_url: z.string().url().nullable().optional(),
  jam_preview_url: z.string().url().nullable().optional(),
  selected_restaurant_id: z.string().nullable().optional(),
  selected_restaurant_name: z.string().max(255).nullable().optional(),
  selected_restaurant_address: z.string().max(500).nullable().optional(),
  hobbies: z.array(z.string().max(50)).max(10).default([]),
  interests: z.array(z.string().max(50)).max(10).default([]),
  path: z.string().max(255).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  location_permission_granted: z.boolean().nullable().optional(),
  contacts_permission_status: z.string().nullable().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).nullable().optional(),
  email: z.string().email().nullable().optional(),
  last_name_change: z.string().datetime().nullable().optional(),
  last_username_change: z.string().datetime().nullable().optional(),
  settings: z.any().nullable().optional(),
});

// Event Schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  date: z.string().datetime(),
  location: z.string().max(500).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  is_private: z.boolean().default(false),
  created_by: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Message Schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  chat_id: z.string().uuid(),
  author_id: z.string().uuid(),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'poll']).default('text'),
  text: z.string().max(10000).nullable().optional(),
  meta: z.any().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

// Notification Schema
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string().max(50),
  title: z.string().max(255),
  message: z.string().max(1000).nullable().optional(),
  data: z.any().nullable().optional(),
  read: z.boolean().default(false),
  created_at: z.string().datetime().optional(),
});

// Friendship Schema
export const FriendshipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  friend_id: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'blocked']).default('pending'),
  created_at: z.string().datetime().optional(),
});

// Story Schema
export const StorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  content_url: z.string().url(),
  content_type: z.enum(['image', 'video']).default('image'),
  caption: z.string().max(500).nullable().optional(),
  mentions: z.array(z.string().uuid()).default([]),
  is_public: z.boolean().default(true),
  views_count: z.number().int().min(0).default(0),
  created_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
});

// Rating Schema
export const RatingSchema = z.object({
  id: z.string().uuid(),
  rater_id: z.string().uuid(),
  rated_user_id: z.string().uuid(),
  event_id: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).nullable().optional(),
  created_at: z.string().datetime().optional(),
});

// ============================================
// VALIDATION FUNCTIONS
// ============================================

export function validateProfileUpdate(data: any): z.infer<typeof ProfileSchema> {
  // Remove undefined values to prevent overwriting with null
  const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  return ProfileSchema.partial().parse(cleanData);
}

export function validateEventCreate(data: any): z.infer<typeof EventSchema> {
  return EventSchema.omit({ id: true, created_at: true, updated_at: true }).parse(data);
}

export function validateMessageCreate(data: any): z.infer<typeof MessageSchema> {
  return MessageSchema.omit({ id: true, created_at: true }).parse(data);
}

export function validateNotificationCreate(data: any): z.infer<typeof NotificationSchema> {
  return NotificationSchema.omit({ id: true, created_at: true }).parse(data);
}

// ============================================
// SQL INJECTION PROTECTION
// ============================================

// Sanitize string inputs to prevent SQL injection
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove or escape potentially dangerous characters
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comments start
    .replace(/\*\//g, '') // Remove multi-line comments end
    .replace(/;/g, '') // Remove semicolons
    .trim();
}

// Validate UUID to prevent injection
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Sanitize array inputs
export function sanitizeArray<T>(arr: T[]): T[] {
  if (!Array.isArray(arr)) return [];
  
  return arr.map(item => {
    if (typeof item === 'string') {
      return sanitizeString(item) as T;
    }
    return item;
  });
}

// ============================================
// ERROR HANDLING
// ============================================

export interface SafeResult<T> {
  data: T | null;
  error: Error | PostgrestError | null;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Enhanced error handler with specific error types
export function handleSupabaseError(error: PostgrestError | any): Error {
  // Handle specific PostgreSQL error codes
  if (error?.code) {
    switch (error.code) {
      case '23505': // unique_violation
        return new ValidationError('This value already exists', error.details);
      case '23503': // foreign_key_violation
        return new ValidationError('Referenced item does not exist', error.details);
      case '23502': // not_null_violation
        return new ValidationError('Required field is missing', error.details);
      case '22P02': // invalid_text_representation
        return new ValidationError('Invalid input format', error.details);
      case '42501': // insufficient_privilege
        return new DatabaseError('Permission denied', error.code);
      case '42P01': // undefined_table
        return new DatabaseError('Table does not exist', error.code);
      case 'PGRST301': // JWT expired
        return new DatabaseError('Session expired, please login again', error.code);
      default:
        return new DatabaseError(error.message || 'Database error occurred', error.code);
    }
  }

  // Handle network errors
  if (error?.message?.includes('Failed to fetch')) {
    return new Error('Network error: Please check your connection');
  }

  // Handle auth errors
  if (error?.message?.includes('JWT')) {
    return new Error('Authentication error: Please login again');
  }

  // Default error
  return new Error(error?.message || 'An unexpected error occurred');
}

// Safe wrapper for Supabase operations
export async function safeSupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      return {
        data: null,
        error: handleSupabaseError(error),
      };
    }
    
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: handleSupabaseError(err),
    };
  }
}

// ============================================
// INPUT VALIDATION HELPERS
// ============================================

export const InputValidators = {
  username: (value: string) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 50) return 'Username must be less than 50 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
    return null;
  },

  email: (value: string) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
    return null;
  },

  phone: (value: string) => {
    if (!value) return 'Phone number is required';
    if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, ''))) return 'Invalid phone number format';
    return null;
  },

  password: (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return null;
  },

  birthDate: (value: string) => {
    if (!value) return 'Birth date is required';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Invalid date format';
    
    const age = new Date().getFullYear() - date.getFullYear();
    if (age < 13) return 'You must be at least 13 years old';
    if (age > 120) return 'Invalid birth date';
    
    return null;
  },

  url: (value: string) => {
    if (!value) return null; // URL is optional
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },
};

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private config: RateLimitConfig) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return true;
    }

    if (attempt.count >= this.config.maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  getRemainingTime(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt) return 0;

    const now = Date.now();
    return Math.max(0, attempt.resetTime - now);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Create rate limiters for different operations
export const rateLimiters = {
  login: new RateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 }), // 5 attempts per 15 minutes
  otp: new RateLimiter({ maxAttempts: 3, windowMs: 5 * 60 * 1000 }), // 3 attempts per 5 minutes
  api: new RateLimiter({ maxAttempts: 100, windowMs: 60 * 1000 }), // 100 requests per minute
};