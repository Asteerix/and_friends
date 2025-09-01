// Category mapping for event categories
export const EVENT_CATEGORIES = [
  // Primary categories
  { id: 'nightlife', label: 'Nightlife & Clubs', icon: '🌃' },
  { id: 'apartment', label: 'Apartment & Home', icon: '🏠' },
  { id: 'outdoor', label: 'Outdoor', icon: '🏕️' },
  { id: 'activities', label: 'Activities', icon: '🎯' },
  { id: 'cultural', label: 'Cultural', icon: '🎭' },
  { id: 'meetup', label: 'Meetups', icon: '🤝' },
  { id: 'casual', label: 'Casual', icon: '☕' },
  { id: 'dining', label: 'Dining', icon: '🍽️' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'party', label: 'Parties & Celebrations', icon: '🎉' },
  { id: 'wedding', label: 'Weddings', icon: '💒' },
  { id: 'seasonal', label: 'Seasonal', icon: '🎄' },
  { id: 'sports', label: 'Sports & Games', icon: '⚽' },
  { id: 'corporate', label: 'Corporate', icon: '🏢' },
  { id: 'travel', label: 'Travel & Adventures', icon: '✈️' },
  { id: 'wellness', label: 'Wellness & Health', icon: '🧘' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'arts', label: 'Arts', icon: '🎨' },
  { id: 'food', label: 'Food', icon: '🍴' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  // Default/legacy
  { id: 'social', label: 'Social', icon: '👥' },
];

// Map of old label values to new IDs for backward compatibility
export const CATEGORY_LABEL_TO_ID_MAP: { [key: string]: string } = {
  'Nightlife & Clubs': 'nightlife',
  'Apartment & Home': 'apartment',
  Outdoor: 'outdoor',
  Activities: 'activities',
  Cultural: 'cultural',
  Meetups: 'meetup',
  Casual: 'casual',
  Dining: 'dining',
  Entertainment: 'entertainment',
  'Parties & Celebrations': 'party',
  Weddings: 'wedding',
  Seasonal: 'seasonal',
  'Sports & Games': 'sports',
  Corporate: 'corporate',
  'Travel & Adventures': 'travel',
  'Wellness & Health': 'wellness',
  Music: 'music',
  Arts: 'arts',
  Food: 'food',
  Gaming: 'gaming',
  Social: 'social',
};

/**
 * Get the display name for a category
 * @param category - Can be either the category ID (e.g., 'nightlife') or label (e.g., 'Nightlife & Clubs')
 * @returns The full category label or the input if not found
 */
export function getCategoryDisplayName(category: string | null | undefined): string {
  if (!category) return 'Not specified';

  // Debug log
  console.log('🔍 [getCategoryDisplayName] Input category:', category);

  // First, try to find by ID (case-insensitive)
  const categoryById = EVENT_CATEGORIES.find(
    (cat) => cat.id.toLowerCase() === category.toLowerCase()
  );
  if (categoryById) {
    console.log('✅ [getCategoryDisplayName] Found by ID:', categoryById.label);
    return categoryById.label;
  }

  // Then, try to find by exact label match
  const categoryByExactLabel = EVENT_CATEGORIES.find((cat) => cat.label === category);
  if (categoryByExactLabel) {
    console.log('✅ [getCategoryDisplayName] Found by exact label:', categoryByExactLabel.label);
    return categoryByExactLabel.label;
  }

  // Try to find by label (case-insensitive)
  const categoryByLabel = EVENT_CATEGORIES.find(
    (cat) => cat.label.toLowerCase() === category.toLowerCase()
  );
  if (categoryByLabel) {
    console.log(
      '✅ [getCategoryDisplayName] Found by label (case-insensitive):',
      categoryByLabel.label
    );
    return categoryByLabel.label;
  }

  // If not found, log and return the original value
  console.log('⚠️ [getCategoryDisplayName] Category not found, returning original:', category);
  return category;
}

/**
 * Get the icon for a category
 * @param category - Can be either the category ID or label
 * @returns The category icon or a default icon
 */
export function getCategoryIcon(category: string | null | undefined): string {
  if (!category) return '📍';

  // Try to find by ID (case-insensitive)
  const foundById = EVENT_CATEGORIES.find((cat) => cat.id.toLowerCase() === category.toLowerCase());
  if (foundById) return foundById.icon;

  // Try to find by exact label
  const foundByExactLabel = EVENT_CATEGORIES.find((cat) => cat.label === category);
  if (foundByExactLabel) return foundByExactLabel.icon;

  // Try to find by label (case-insensitive)
  const foundByLabel = EVENT_CATEGORIES.find(
    (cat) => cat.label.toLowerCase() === category.toLowerCase()
  );
  if (foundByLabel) return foundByLabel.icon;

  return '📍';
}
