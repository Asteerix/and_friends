#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'src/app/screens/calendar-month.tsx',
  'src/app/screens/chat.tsx',
  'src/app/screens/conversation.tsx',
  'src/app/screens/conversations-list.tsx',
  'src/app/screens/create-event-advanced.tsx',
  'src/app/screens/create-event.tsx',
  'src/app/screens/create-story.tsx',
  'src/app/screens/edit-cover.tsx',
  'src/app/screens/event-details.tsx',
  'src/app/screens/friends.tsx',
  'src/app/screens/invite-friends.tsx',
  'src/app/screens/map-ar.tsx',
  'src/app/screens/map.tsx',
  'src/app/screens/notifications-full.tsx',
  'src/app/screens/notifications.tsx',
  'src/app/screens/person-card.tsx',
  'src/app/screens/poll.tsx',
  'src/app/screens/rsvp-confirmation.tsx',
  'src/app/screens/rsvp-management.tsx',
  'src/app/screens/search-users.tsx',
  'src/app/screens/stories.tsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the React import if it's not used
    content = content.replace(/^import React from 'react';\n/m, '');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Done fixing unused React imports!');