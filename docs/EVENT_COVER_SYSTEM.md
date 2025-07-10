# Event Cover System Documentation

## Overview

The event cover system allows events to have custom, visually appealing covers that are displayed consistently throughout the app. This system replicates the cover design from `EventDetailsScreen` and uses it as a preview in all event cards.

## Components

### 1. EventCoverPreview (`src/features/events/components/EventCoverPreview.tsx`)

A reusable component that renders event covers with:
- Background gradients or images
- Custom fonts for title and subtitle
- Placed stickers with position, scale, and rotation
- Overlay gradient for text readability

**Props:**
```typescript
interface EventCoverPreviewProps {
  event: {
    title?: string;
    subtitle?: string;
    image_url?: string;
    cover_data?: {
      selectedBackground?: string;
      selectedTemplate?: any;
      coverImage?: string;
      uploadedImage?: string;
      placedStickers?: Array<{
        id: string;
        emoji: string;
        x: number;
        y: number;
        scale: number;
        rotation: number;
      }>;
      selectedTitleFont?: string;
      selectedSubtitleFont?: string;
    };
  };
  style?: ViewStyle;
  showTitle?: boolean;
  showOverlay?: boolean;
}
```

### 2. Updated EventCard (`src/features/home/components/EventCard.tsx`)

The EventCard component now accepts an optional `event` prop that contains the full event object with `cover_data`. When provided, it uses `EventCoverPreview` instead of a simple image.

## Cover Data Structure

Events can have a `cover_data` field with the following structure:

```json
{
  "selectedBackground": "3",           // ID of gradient background
  "selectedTemplate": null,            // Template object (if using template)
  "coverImage": "https://...",        // Custom uploaded cover image URL
  "uploadedImage": "https://...",     // Alternative image URL
  "selectedTitleFont": "3",           // Font ID for title (e.g., "AFTERPARTY")
  "selectedSubtitleFont": "5",        // Font ID for subtitle (e.g., "Elegant")
  "placedStickers": [
    {
      "id": "1",
      "emoji": "🎉",
      "x": 20,        // X position as percentage
      "y": 20,        // Y position as percentage
      "scale": 1.5,   // Scale factor
      "rotation": 15  // Rotation in degrees
    }
  ]
}
```

## Usage

### In HomeScreen

```typescript
<EventCard
  key={event.id}
  title={event.title}
  date={event.date}
  location={event.location || ''}
  thumbnail={event.image_url || ''}
  participants={participants}
  goingText={`+${event.participants_count} going`}
  onPress={() => handleEventPress(event.id)}
  category={event.event_category}
  event={event}  // Pass the full event object
/>
```

### In ProfileScreen

Same usage - just pass the `event` prop with the full event object.

## Available Backgrounds

1. Pink to Lavender gradient
2. Sky Blue to Pale Green gradient
3. Royal Blue to Dark Turquoise gradient
4. Light Green to Gold gradient
5. Dark Turquoise to Hot Pink gradient
6. Hot Pink to Light Pink gradient
7. Lavender to Plum gradient

## Available Fonts

1. **Classic Invite** - Italic system font
2. **Handwriting** - Normal system font
3. **AFTERPARTY** - Bold system font
4. **Modern** - Light (300) system font
5. **Elegant** - Medium (500) system font
6. **Fun Script** - Italic system font
7. **Bold Impact** - Black (900) system font

## Priority Order

The cover preview follows this priority for displaying backgrounds:
1. Custom gradient (if `selectedBackground` is set and no image)
2. Template image (if `selectedTemplate` is set)
3. Uploaded cover image (`coverImage` or `uploadedImage`)
4. Event's default image (`image_url`)
5. Placeholder with gradient and image icon

## Notes

- Stickers are scaled down by 50% in the preview for better visibility
- The overlay gradient ensures text readability on any background
- Title and subtitle are optional and can be hidden with `showTitle={false}`
- The component is fully responsive and adapts to the container size