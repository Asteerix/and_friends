// import * as Haptics from 'expo-haptics';
// import * as ImagePicker from 'expo-image-picker';
// import { useRouter } from 'expo-router';
// import React, { useState, useRef } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Image,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
//   Dimensions,
//   PanResponder,
//   Animated,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';

// import BackButton from '@/assets/svg/back-button.svg';
// import ChatButton from '@/assets/svg/chat-button.svg';
// import NotificationButton from '@/assets/svg/notification-button.svg';

// const { width: screenWidth } = Dimensions.get('window');

// // Constants for sticker functionality
// const MAX_STICKERS = 10;
// const MIN_SCALE = 0.5;
// const MAX_SCALE = 3.0;

// // Default event cover image
// const DEFAULT_EVENT_COVER = require('../../../assets/default_avatar.png');

// // Sample data for different tabs
// const FONTS = [
//   { id: '1', name: 'Classic Invite', style: { fontFamily: 'System', fontStyle: 'italic' as const } },
//   { id: '2', name: 'Handwriting', style: { fontFamily: 'System', fontStyle: 'normal' as const } },
//   { id: '3', name: 'AFTERPARTY', style: { fontFamily: 'System', fontWeight: 'bold' as const } },
//   { id: '4', name: 'Modern', style: { fontFamily: 'System', fontWeight: '300' as const } },
//   { id: '5', name: 'Elegant', style: { fontFamily: 'System', fontWeight: '500' as const } },
//   { id: '6', name: 'Fun Script', style: { fontFamily: 'System', fontStyle: 'italic' as const } },
//   { id: '7', name: 'Bold Impact', style: { fontFamily: 'System', fontWeight: '900' as const } },
// ];

// const BACKGROUNDS = [
//   { id: '1', colors: ['#FFB6C1', '#E6E6FA'] as [string, string] },
//   { id: '2', colors: ['#87CEEB', '#98FB98'] as [string, string] },
//   { id: '3', colors: ['#4169E1', '#00CED1'] as [string, string] },
//   { id: '4', colors: ['#90EE90', '#FFD700'] as [string, string] },
//   { id: '5', colors: ['#00CED1', '#FF69B4'] as [string, string] },
//   { id: '6', colors: ['#FF69B4', '#FFB6C1'] as [string, string] },
//   { id: '7', colors: ['#E6E6FA', '#D8BFD8'] as [string, string] },
// ];

// // Using emojis directly as stickers - they will render natively
// const STICKER_CATEGORIES = [
//   {
//     id: 'party',
//     name: 'Party',
//     stickers: [
//       { id: 'party-1', emoji: '🎉', name: 'Party Popper' },
//       { id: 'party-2', emoji: '🎂', name: 'Birthday Cake' },
//       { id: 'party-3', emoji: '🍾', name: 'Champagne' },
//       { id: 'party-4', emoji: '🎆', name: 'Fireworks' },
//       { id: 'party-5', emoji: '🎁', name: 'Gift' },
//       { id: 'party-6', emoji: '🎈', name: 'Balloon' },
//       { id: 'party-7', emoji: '🥳', name: 'Party Face' },
//       { id: 'party-8', emoji: '🎊', name: 'Confetti' },
//       { id: 'party-9', emoji: '🪩', name: 'Disco Ball' },
//       { id: 'party-10', emoji: '🍻', name: 'Cheers' },
//       { id: 'party-11', emoji: '🥂', name: 'Toast' },
//       { id: 'party-12', emoji: '🎪', name: 'Circus' },
//     ]
//   },
//   {
//     id: 'music',
//     name: 'Music',
//     stickers: [
//       { id: 'music-1', emoji: '🎤', name: 'Microphone' },
//       { id: 'music-2', emoji: '🎵', name: 'Musical Note' },
//       { id: 'music-3', emoji: '🎶', name: 'Multiple Notes' },
//       { id: 'music-4', emoji: '🎧', name: 'Headphones' },
//       { id: 'music-5', emoji: '🎸', name: 'Guitar' },
//       { id: 'music-6', emoji: '🥁', name: 'Drum' },
//       { id: 'music-7', emoji: '🎹', name: 'Piano' },
//       { id: 'music-8', emoji: '🎺', name: 'Trumpet' },
//       { id: 'music-9', emoji: '🎷', name: 'Saxophone' },
//       { id: 'music-10', emoji: '🎻', name: 'Violin' },
//       { id: 'music-11', emoji: '🎼', name: 'Musical Score' },
//       { id: 'music-12', emoji: '🎙️', name: 'Studio Mic' },
//     ]
//   },
//   {
//     id: 'food',
//     name: 'Food & Drink',
//     stickers: [
//       { id: 'food-1', emoji: '🍕', name: 'Pizza' },
//       { id: 'food-2', emoji: '🍔', name: 'Burger' },
//       { id: 'food-3', emoji: '🍹', name: 'Tropical Drink' },
//       { id: 'food-4', emoji: '☕', name: 'Coffee' },
//       { id: 'food-5', emoji: '🍺', name: 'Beer' },
//       { id: 'food-6', emoji: '🍰', name: 'Cake' },
//       { id: 'food-7', emoji: '🍿', name: 'Popcorn' },
//       { id: 'food-8', emoji: '🌮', name: 'Taco' },
//       { id: 'food-9', emoji: '🍝', name: 'Pasta' },
//       { id: 'food-10', emoji: '🍣', name: 'Sushi' },
//       { id: 'food-11', emoji: '🍷', name: 'Wine' },
//       { id: 'food-12', emoji: '🧁', name: 'Cupcake' },
//     ]
//   },
//   {
//     id: 'activities',
//     name: 'Activities',
//     stickers: [
//       { id: 'activities-1', emoji: '🏀', name: 'Basketball' },
//       { id: 'activities-2', emoji: '⚽', name: 'Soccer' },
//       { id: 'activities-3', emoji: '🎮', name: 'Gaming' },
//       { id: 'activities-4', emoji: '🎨', name: 'Art' },
//       { id: 'activities-5', emoji: '📸', name: 'Camera' },
//       { id: 'activities-6', emoji: '🎯', name: 'Target' },
//       { id: 'activities-7', emoji: '🎬', name: 'Movie' },
//       { id: 'activities-8', emoji: '🎭', name: 'Theater' },
//       { id: 'activities-9', emoji: '🏖️', name: 'Beach' },
//       { id: 'activities-10', emoji: '🎢', name: 'Roller Coaster' },
//       { id: 'activities-11', emoji: '🎳', name: 'Bowling' },
//       { id: 'activities-12', emoji: '🏕️', name: 'Camping' },
//     ]
//   },
//   {
//     id: 'decorative',
//     name: 'Decorative',
//     stickers: [
//       { id: 'deco-1', emoji: '✨', name: 'Sparkles' },
//       { id: 'deco-2', emoji: '💫', name: 'Dizzy Star' },
//       { id: 'deco-3', emoji: '⭐', name: 'Star' },
//       { id: 'deco-4', emoji: '💖', name: 'Sparkling Heart' },
//       { id: 'deco-5', emoji: '❤️', name: 'Red Heart' },
//       { id: 'deco-6', emoji: '🌟', name: 'Glowing Star' },
//       { id: 'deco-7', emoji: '🔥', name: 'Fire' },
//       { id: 'deco-8', emoji: '💥', name: 'Boom' },
//       { id: 'deco-9', emoji: '🌈', name: 'Rainbow' },
//       { id: 'deco-10', emoji: '☀️', name: 'Sun' },
//       { id: 'deco-11', emoji: '🌙', name: 'Moon' },
//       { id: 'deco-12', emoji: '💎', name: 'Diamond' },
//     ]
//   },
// ];

// // Template categories with MANY more images
// const TEMPLATE_CATEGORIES = [
//   {
//     id: 'party',
//     name: 'Party',
//     templates: [
//       { id: 'party-1', name: 'After Party', image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=1200&q=80' },
//       { id: 'party-2', name: 'Backyard Party', image: 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1200&q=80' },
//       { id: 'party-3', name: 'Beach Party', image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80' },
//       { id: 'party-4', name: 'Block Party', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80' },
//       { id: 'party-5', name: 'Boat Party', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80' },
//       { id: 'party-6', name: 'Bonfire Party', image: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=1200&q=80' },
//       { id: 'party-7', name: 'Club Night', image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1200&q=80' },
//       { id: 'party-8', name: 'Costume Party', image: 'https://images.unsplash.com/photo-1478146059778-58d7c6b6945e?w=1200&q=80' },
//       { id: 'party-9', name: 'Dance Party', image: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1200&q=80' },
//       { id: 'party-10', name: 'Disco Night', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80' },
//       { id: 'party-11', name: 'Festival Party', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80' },
//       { id: 'party-12', name: 'Garden Party', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80' },
//       { id: 'party-13', name: 'Glow Party', image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=1200&q=80' },
//       { id: 'party-14', name: 'House Party', image: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=1200&q=80' },
//       { id: 'party-15', name: 'Masquerade Ball', image: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=1200&q=80' },
//       { id: 'party-16', name: 'Neon Party', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80' },
//       { id: 'party-17', name: 'Night Club', image: 'https://images.unsplash.com/photo-1519671282429-b44660ead0a7?w=1200&q=80' },
//       { id: 'party-18', name: 'Outdoor Party', image: 'https://images.unsplash.com/photo-1471967183320-ee018f6e114a?w=1200&q=80' },
//       { id: 'party-19', name: 'Pajama Party', image: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=1200&q=80' },
//       { id: 'party-20', name: 'Pool Party', image: 'https://images.unsplash.com/photo-1572297794908-f2ee5a2930d6?w=1200&q=80' },
//       { id: 'party-21', name: 'Rave Night', image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1200&q=80' },
//       { id: 'party-22', name: 'Rooftop Party', image: 'https://images.unsplash.com/photo-1528495612343-9ca9f755a74e?w=1200&q=80' },
//       { id: 'party-23', name: 'Silent Disco', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=1200&q=80' },
//       { id: 'party-24', name: 'Street Party', image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80' },
//       { id: 'party-25', name: 'Surprise Party', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1200&q=80' },
//       { id: 'party-26', name: 'Tiki Party', image: 'https://images.unsplash.com/photo-1570213489059-0aac6626cade?w=1200&q=80' },
//       { id: 'party-27', name: 'VIP Party', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80' },
//       { id: 'party-28', name: 'Yacht Party', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80' },
//     ].sort((a, b) => a.name.localeCompare(b.name))
//   },
//   {
//     id: 'birthday',
//     name: 'Birthday',
//     templates: [
//       { id: 'bday-1', name: '1st Birthday', image: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=1200&q=80' },
//       { id: 'bday-2', name: '18th Birthday', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&q=80' },
//       { id: 'bday-3', name: '21st Birthday', image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80' },
//       { id: 'bday-4', name: '30th Birthday', image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1200&q=80' },
//       { id: 'bday-5', name: '40th Birthday', image: 'https://images.unsplash.com/photo-1530029536652-e6e5b862dbb8?w=1200&q=80' },
//       { id: 'bday-6', name: '50th Birthday', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&q=80' },
//       { id: 'bday-7', name: 'Adult Birthday', image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&q=80' },
//       { id: 'bday-8', name: 'Baby Shower', image: 'https://images.unsplash.com/photo-1549831243-a69a0b3d39e0?w=1200&q=80' },
//       { id: 'bday-9', name: 'Birthday Balloons', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80' },
//       { id: 'bday-10', name: 'Birthday Brunch', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80' },
//       { id: 'bday-11', name: 'Birthday Cake', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1200&q=80' },
//       { id: 'bday-12', name: 'Birthday Candles', image: 'https://images.unsplash.com/photo-1531956531700-dc0ee0f1f9a5?w=1200&q=80' },
//       { id: 'bday-13', name: 'Birthday Celebration', image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=80' },
//       { id: 'bday-14', name: 'Birthday Dinner', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80' },
//       { id: 'bday-15', name: 'Birthday Party', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1200&q=80' },
//       { id: 'bday-16', name: 'Birthday Surprise', image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80' },
//       { id: 'bday-17', name: 'Gender Reveal', image: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=1200&q=80' },
//       { id: 'bday-18', name: 'Golden Birthday', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80' },
//       { id: 'bday-19', name: 'Kids Birthday', image: 'https://images.unsplash.com/photo-1561489396-888724a1543d?w=1200&q=80' },
//       { id: 'bday-20', name: 'Milestone Birthday', image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1200&q=80' },
//       { id: 'bday-21', name: 'Princess Party', image: 'https://images.unsplash.com/photo-1546450270-aaa6e5def093?w=1200&q=80' },
//       { id: 'bday-22', name: 'Quinceañera', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80' },
//       { id: 'bday-23', name: 'Superhero Party', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&q=80' },
//       { id: 'bday-24', name: 'Sweet 16', image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80' },
//       { id: 'bday-25', name: 'Teenage Birthday', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1200&q=80' },
//     ].sort((a, b) => a.name.localeCompare(b.name))
//   },
//   {
//     id: 'wedding',
//     name: 'Wedding',
//     templates: [
//       { id: 'wed-1', name: 'Anniversary Party', image: 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1200&q=80' },
//       { id: 'wed-2', name: 'Bachelor Party', image: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=1200&q=80' },
//       { id: 'wed-3', name: 'Bachelorette Party', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80' },
//       { id: 'wed-4', name: 'Barn Wedding', image: 'https://images.unsplash.com/photo-1564435187256-e12ef4358e3f?w=1200&q=80' },
//       { id: 'wed-5', name: 'Beach Wedding', image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=1200&q=80' },
//       { id: 'wed-6', name: 'Boho Wedding', image: 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=1200&q=80' },
//       { id: 'wed-7', name: 'Bridal Shower', image: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=1200&q=80' },
//       { id: 'wed-8', name: 'Castle Wedding', image: 'https://images.unsplash.com/photo-1519657814046-1ba16599fdd0?w=1200&q=80' },
//       { id: 'wed-9', name: 'Church Wedding', image: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80' },
//       { id: 'wed-10', name: 'City Wedding', image: 'https://images.unsplash.com/photo-1516435209827-920f9f3b7e53?w=1200&q=80' },
//       { id: 'wed-11', name: 'Classic Wedding', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80' },
//       { id: 'wed-12', name: 'Country Wedding', image: 'https://images.unsplash.com/photo-1525772764200-be829a350797?w=1200&q=80' },
//       { id: 'wed-13', name: 'Destination Wedding', image: 'https://images.unsplash.com/photo-1452901569789-2a1dbd0f0c96?w=1200&q=80' },
//       { id: 'wed-14', name: 'Engagement Party', image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=80' },
//       { id: 'wed-15', name: 'Fairytale Wedding', image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80' },
//       { id: 'wed-16', name: 'Fall Wedding', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80' },
//       { id: 'wed-17', name: 'Garden Wedding', image: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=80' },
//       { id: 'wed-18', name: 'Glamorous Wedding', image: 'https://images.unsplash.com/photo-1505932049984-db368d92fa63?w=1200&q=80' },
//       { id: 'wed-19', name: 'Hotel Wedding', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80' },
//       { id: 'wed-20', name: 'Indoor Wedding', image: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=1200&q=80' },
//       { id: 'wed-21', name: 'Intimate Wedding', image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&q=80' },
//       { id: 'wed-22', name: 'Luxury Wedding', image: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=80' },
//       { id: 'wed-23', name: 'Modern Wedding', image: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=1200&q=80' },
//       { id: 'wed-24', name: 'Mountain Wedding', image: 'https://images.unsplash.com/photo-1522199710521-72d69614c702?w=1200&q=80' },
//       { id: 'wed-25', name: 'Outdoor Wedding', image: 'https://images.unsplash.com/photo-1431576901776-e539bd916ba2?w=1200&q=80' },
//       { id: 'wed-26', name: 'Reception', image: 'https://images.unsplash.com/photo-1511795409834-432f7b1728dd?w=1200&q=80' },
//       { id: 'wed-27', name: 'Rehearsal Dinner', image: 'https://images.unsplash.com/photo-1533854775446-95c4609da544?w=1200&q=80' },
//       { id: 'wed-28', name: 'Romantic Wedding', image: 'https://images.unsplash.com/photo-1522333323-32663f141b57?w=1200&q=80' },
//       { id: 'wed-29', name: 'Rustic Wedding', image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80' },
//       { id: 'wed-30', name: 'Spring Wedding', image: 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=1200&q=80' },
//       { id: 'wed-31', name: 'Summer Wedding', image: 'https://images.unsplash.com/photo-1420819453217-57b6badd9e19?w=1200&q=80' },
//       { id: 'wed-32', name: 'Traditional Wedding', image: 'https://images.unsplash.com/photo-1511285605577-4d62fb50d2f7?w=1200&q=80' },
//       { id: 'wed-33', name: 'Tropical Wedding', image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1200&q=80' },
//       { id: 'wed-34', name: 'Vintage Wedding', image: 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=1200&q=80' },
//       { id: 'wed-35', name: 'Vineyard Wedding', image: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=1200&q=80' },
//       { id: 'wed-36', name: 'Wedding Ceremony', image: 'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=1200&q=80' },
//       { id: 'wed-37', name: 'Wedding Proposal', image: 'https://images.unsplash.com/photo-1522057384400-681b421cfebc?w=1200&q=80' },
//       { id: 'wed-38', name: 'Winter Wedding', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80' },
//     ].sort((a, b) => a.name.localeCompare(b.name))
//   },
//   {
//     id: 'music',
//     name: 'Music & Concert',
//     templates: [
//       { id: 'music-1', name: 'Acoustic Night', image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80' },
//       { id: 'music-2', name: 'Album Launch', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80' },
//       { id: 'music-3', name: 'Battle of Bands', image: 'https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=1200&q=80' },
//       { id: 'music-4', name: 'Blues Night', image: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200&q=80' },
//       { id: 'music-5', name: 'Classical Concert', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80' },
//       { id: 'music-6', name: 'Concert Night', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80' },
//       { id: 'music-7', name: 'Country Music Night', image: 'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=1200&q=80' },
//       { id: 'music-8', name: 'DJ Battle', image: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=1200&q=80' },
//       { id: 'music-9', name: 'DJ Night', image: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1200&q=80' },
//       { id: 'music-10', name: 'Drum Circle', image: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=1200&q=80' },
//       { id: 'music-11', name: 'EDM Festival', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80' },
//       { id: 'music-12', name: 'Electronic Night', image: 'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=1200&q=80' },
//       { id: 'music-13', name: 'Folk Music Night', image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80' },
//       { id: 'music-14', name: 'Hip Hop Night', image: 'https://images.unsplash.com/photo-1547355253-ff0740f6e8c1?w=1200&q=80' },
//       { id: 'music-15', name: 'House Music Night', image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=1200&q=80' },
//       { id: 'music-16', name: 'Indie Band Night', image: 'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=1200&q=80' },
//       { id: 'music-17', name: 'Jazz Night', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=1200&q=80' },
//       { id: 'music-18', name: 'Karaoke Night', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1200&q=80' },
//       { id: 'music-19', name: 'Latin Music Night', image: 'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=1200&q=80' },
//       { id: 'music-20', name: 'Live Band', image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&q=80' },
//       { id: 'music-21', name: 'Music Festival', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80' },
//       { id: 'music-22', name: 'Music Workshop', image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=1200&q=80' },
//       { id: 'music-23', name: 'Open Mic', image: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1200&q=80' },
//       { id: 'music-24', name: 'Orchestra Performance', image: 'https://images.unsplash.com/photo-1521547418549-6a31aad7c177?w=1200&q=80' },
//       { id: 'music-25', name: 'Piano Recital', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=1200&q=80' },
//       { id: 'music-26', name: 'Pop Concert', image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80' },
//       { id: 'music-27', name: 'Punk Rock Show', image: 'https://images.unsplash.com/photo-1506091403742-e3aa39518db5?w=1200&q=80' },
//       { id: 'music-28', name: 'R&B Night', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=1200&q=80' },
//       { id: 'music-29', name: 'Rap Battle', image: 'https://images.unsplash.com/photo-1546708761-f0e3f2e47d1e?w=1200&q=80' },
//       { id: 'music-30', name: 'Reggae Night', image: 'https://images.unsplash.com/photo-1504509546545-e000b4a62425?w=1200&q=80' },
//       { id: 'music-31', name: 'Rock Concert', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80' },
//       { id: 'music-32', name: 'Singer Songwriter Night', image: 'https://images.unsplash.com/photo-1517230878791-4d28214057c2?w=1200&q=80' },
//       { id: 'music-33', name: 'Soul Music Night', image: 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?w=1200&q=80' },
//       { id: 'music-34', name: 'Techno Party', image: 'https://images.unsplash.com/photo-1528489096-c6ddc8e88e61?w=1200&q=80' },
//       { id: 'music-35', name: 'Vinyl Night', image: 'https://images.unsplash.com/photo-1488376794858-19b0d09d87a6?w=1200&q=80' },
//     ].sort((a, b) => a.name.localeCompare(b.name))
//   },
//   {
//     id: 'food',
//     name: 'Food & Drinks',
//     templates: [
//       { id: 'food-1', name: 'Bake Off', image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&q=80' },
//       { id: 'food-2', name: 'BBQ Party', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80' },
//       { id: 'food-3', name: 'Beer Tasting', image: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=1200&q=80' },
//       { id: 'food-4', name: 'Breakfast Party', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80' },
//       { id: 'food-5', name: 'Brunch', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80' },
//       { id: 'food-6', name: 'Buffet Party', image: 'https://images.unsplash.com/photo-1568625365131-079e026a927d?w=1200&q=80' },
//       { id: 'food-7', name: 'Cake Party', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80' },
//       { id: 'food-8', name: 'Cheese & Wine', image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&q=80' },
//       { id: 'food-9', name: 'Chocolate Tasting', image: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=1200&q=80' },
//       { id: 'food-10', name: 'Cocktail Party', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80' },
//       { id: 'food-11', name: 'Coffee Tasting', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80' },
//       { id: 'food-12', name: 'Cooking Class', image: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=1200&q=80' },
//       { id: 'food-13', name: 'Cooking Competition', image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=80' },
//       { id: 'food-14', name: 'Dessert Party', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&q=80' },
//       { id: 'food-15', name: 'Dinner Party', image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80' },
//       { id: 'food-16', name: 'Farm to Table', image: 'https://images.unsplash.com/photo-1535891567255-54ae21b48f6a?w=1200&q=80' },
//       { id: 'food-17', name: 'Food Festival', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80' },
//       { id: 'food-18', name: 'Food Truck Party', image: 'https://images.unsplash.com/photo-1567129937968-cdad8f07e2f8?w=1200&q=80' },
//       { id: 'food-19', name: 'Garden Party', image: 'https://images.unsplash.com/photo-1530062845289-9109b2c9c868?w=1200&q=80' },
//       { id: 'food-20', name: 'Gourmet Night', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80' },
//       { id: 'food-21', name: 'Grill Party', image: 'https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?w=1200&q=80' },
//       { id: 'food-22', name: 'Happy Hour', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80' },
//       { id: 'food-23', name: 'High Tea', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784cf3?w=1200&q=80' },
//       { id: 'food-24', name: 'Ice Cream Social', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=1200&q=80' },
//       { id: 'food-25', name: 'Lunch Party', image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=1200&q=80' },
//       { id: 'food-26', name: 'Mixology Class', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&q=80' },
//       { id: 'food-27', name: 'Pasta Night', image: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=1200&q=80' },
//       { id: 'food-28', name: 'Picnic', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80' },
//       { id: 'food-29', name: 'Pizza Party', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80' },
//       { id: 'food-30', name: 'Potluck Dinner', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&q=80' },
//       { id: 'food-31', name: 'Sake Tasting', image: 'https://images.unsplash.com/photo-1536599424071-0b215a388ba7?w=1200&q=80' },
//       { id: 'food-32', name: 'Seafood Feast', image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1200&q=80' },
//       { id: 'food-33', name: 'Sushi Night', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80' },
//       { id: 'food-34', name: 'Taco Tuesday', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80' },
//       { id: 'food-35', name: 'Tea Party', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80' },
//       { id: 'food-36', name: 'Tequila Tasting', image: 'https://images.unsplash.com/photo-1516535794938-6063878f08cc?w=1200&q=80' },
//       { id: 'food-37', name: 'Whiskey Tasting', image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=1200&q=80' },
//       { id: 'food-38', name: 'Wine & Dine', image: 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=1200&q=80' },
//       { id: 'food-39', name: 'Wine Tasting', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&q=80' },
//     ].sort((a, b) => a.name.localeCompare(b.name))
//   },
//   {
//     id: 'seasonal',
//     name: 'Seasonal',
//     templates: [
//       { id: 'season-1', name: '4th of July', image: 'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=1200&q=80' },
//       { id: 'season-2', name: 'April Fools', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&q=80' },
//       { id: 'season-3', name: 'Autumn Celebration', image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1200&q=80' },
//       { id: 'season-4', name: 'Black Friday', image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200&q=80' },
//       { id: 'season-5', name: 'Canada Day', image: 'https://images.unsplash.com/photo-1564754943164-e83c08469116?w=1200&q=80' },
//       { id: 'season-6', name: 'Chinese New Year', image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1200&q=80' },
//       { id: 'season-7', name: 'Christmas Eve', image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1200&q=80' },
//       { id: 'season-8', name: 'Christmas Party', image: 'https://images.unsplash.com/photo-1482517967863-0266176ba470?w=1200&q=80' },
//       { id: 'season-9', name: 'Cinco de Mayo', image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80' },
//       { id: 'season-10', name: 'Day of the Dead', image: 'https://images.unsplash.com/photo-1570646317476-b29e5c3988d7?w=1200&q=80' },
//       { id: 'season-11', name: 'Diwali', image: 'https://images.unsplash.com/photo-1605639156481-244775d6f803?w=1200&q=80' },
//       { id: 'season-12', name: 'Earth Day', image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=80' },
//       { id: 'season-13', name: 'Easter', image: 'https://images.unsplash.com/photo-1521967663429-271bae24b5b1?w=1200&q=80' },
//       { id: 'season-14', name: 'Fall Harvest', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80' },
//       { id: 'season-15', name: 'Fathers Day', image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&q=80' },
//       { id: 'season-16', name: 'Friendsgiving', image: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=1200&q=80' },
//       { id: 'season-17', name: 'Halloween', image: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=1200&q=80' },
//       { id: 'season-18', name: 'Hanukkah', image: 'https://images.unsplash.com/photo-1544954862-d193faba3d77?w=1200&q=80' },
//       { id: 'season-19', name: 'Holi Festival', image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80' },
//       { id: 'season-20', name: 'Labor Day', image: 'https://images.unsplash.com/photo-1598522325074-042db73aa4e6?w=1200&q=80' },
//       { id: 'season-21', name: 'Mardi Gras', image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80' },
//       { id: 'season-22', name: 'Memorial Day', image: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1200&q=80' },
//       { id: 'season-23', name: 'Mothers Day', image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?w=1200&q=80' },
//       { id: 'season-24', name: 'New Year Eve', image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=1200&q=80' },
//       { id: 'season-25', name: 'Oktoberfest', image: 'https://images.unsplash.com/photo-1571167530149-c1105da4c2c7?w=1200&q=80' },
//       { id: 'season-26', name: 'Passover', image: 'https://images.unsplash.com/photo-1586614385892-f088b55f7a14?w=1200&q=80' },
//       { id: 'season-27', name: 'Pride Festival', image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=1200&q=80' },
//       { id: 'season-28', name: 'Ramadan', image: 'https://images.unsplash.com/photo-1557678859-ccaa43e5389d?w=1200&q=80' },
//       { id: 'season-29', name: "St. Patrick's Day", image: 'https://images.unsplash.com/photo-1520942434488-a4c36640af47?w=1200&q=80' },
//       { id: 'season-30', name: 'Spring Break', image: 'https://images.unsplash.com/photo-1523309375637-b3f4f2347f6d?w=1200&q=80' },
//       { id: 'season-31', name: 'Spring Festival', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80' },
//       { id: 'season-32', name: 'Summer BBQ', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=80' },
//       { id: 'season-33', name: 'Summer Beach', image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80' },
//       { id: 'season-34', name: 'Summer Solstice', image: 'https://images.unsplash.com/photo-1502472584811-0a2f2feb8968?w=1200&q=80' },
//       { id: 'season-35', name: 'Super Bowl Party', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80' },
//       { id: 'season-36', name: 'Thanksgiving', image: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=1200&q=80' },
//       { id: 'season-37', name: "Valentine's Day", image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&q=80' },
//       { id: 'season-38', name: 'Winter Holiday', image: 'https://images.unsplash.com/photo-1483739086890-b89b8e210835?w=1200&q=80' },
//       { id: 'season-39', name: 'Winter Solstice', image: 'https://images.unsplash.com/photo-1516592398706-e76a3f8a6817?w=1200&q=80' },
//     ].sort((a, b) => a.name.localeCompare(b.name))
//   },
//   {
//     id: 'sports',
//     name: 'Sports & Games',
//     templates: [
//       { id: 'sport-1', name: 'Game Night', image: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=1200&q=80' },
//       { id: 'sport-2', name: 'Sports Watch Party', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80' },
//       { id: 'sport-3', name: 'Soccer Match', image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80' },
//       { id: 'sport-4', name: 'Basketball Game', image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=1200&q=80' },
//       { id: 'sport-5', name: 'Bowling Night', image: 'https://images.unsplash.com/photo-1545056453-f0359c3df6db?w=1200&q=80' },
//       { id: 'sport-6', name: 'Golf Tournament', image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&q=80' },
//       { id: 'sport-7', name: 'Poker Night', image: 'https://images.unsplash.com/photo-1541278107931-e006523892df?w=1200&q=80' },
//       { id: 'sport-8', name: 'Board Game Night', image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=1200&q=80' },
//     ]
//   },
//   {
//     id: 'corporate',
//     name: 'Corporate',
//     templates: [
//       { id: 'corp-1', name: 'Team Building', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80' },
//       { id: 'corp-2', name: 'Conference', image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80' },
//       { id: 'corp-3', name: 'Workshop', image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&q=80' },
//       { id: 'corp-4', name: 'Networking Event', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80' },
//       { id: 'corp-5', name: 'Product Launch', image: 'https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?w=1200&q=80' },
//       { id: 'corp-6', name: 'Office Party', image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80' },
//       { id: 'corp-7', name: 'Award Ceremony', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80' },
//       { id: 'corp-8', name: 'Seminar', image: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=1200&q=80' },
//     ]
//   },
// ];

// type TabType = 'style' | 'decorate' | 'template';

// interface StickerType {
//   id: string;
//   emoji: string;
//   x: number;
//   y: number;
//   scale: number;
//   rotation: number;
// }

// // Instagram/Snapchat style Draggable Sticker Component
// const DraggableSticker: React.FC<{
//   sticker: StickerType;
//   isSelected: boolean;
//   onSelect: () => void;
//   onUpdate: (sticker: StickerType) => void;
//   onRemove: () => void;
// }> = ({ sticker, isSelected, onSelect, onUpdate, onRemove }) => {
//   const pan = useRef(new Animated.ValueXY({
//     x: (sticker.x / 100) * screenWidth,
//     y: (sticker.y / 100) * 700,
//   })).current;

//   const scale = useRef(new Animated.Value(sticker.scale)).current;
//   const rotation = useRef(new Animated.Value(sticker.rotation)).current;
//   const lastScale = useRef(sticker.scale);
//   const lastRotation = useRef(sticker.rotation);
//   const baseScale = useRef(new Animated.Value(1)).current;
//   const pinchScale = useRef(new Animated.Value(1)).current;
//   const lastDistance = useRef(0);
//   const lastAngle = useRef(0);

//   const panResponder = useRef(
//     PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,

//       onPanResponderGrant: () => {
//         onSelect();

//         // Set offset for current position
//         pan.setOffset({
//           x: (pan.x as any)._value,
//           y: (pan.y as any)._value,
//         });
//         pan.setValue({ x: 0, y: 0 });

//         void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//       },

//       onPanResponderMove: (evt, gestureState) => {
//         const touches = evt.nativeEvent.touches;

//         // Handle pinch to zoom and rotate
//         if (touches.length === 2) {
//           const touch1 = touches[0];
//           const touch2 = touches[1];

//           if (touch1 && touch2) {
//             // Calculate distance for scaling
//             const distance = Math.sqrt(
//               Math.pow(touch2.pageX - touch1.pageX, 2) +
//               Math.pow(touch2.pageY - touch1.pageY, 2)
//             );

//             // Calculate angle for rotation
//             const angle = Math.atan2(
//               touch2.pageY - touch1.pageY,
//               touch2.pageX - touch1.pageX
//             ) * (180 / Math.PI);

//             // Handle scaling
//             if (lastDistance.current > 0) {
//               const delta = distance / lastDistance.current;
//               const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, lastScale.current * delta));
//               scale.setValue(newScale);
//             }

//             // Handle rotation
//             if (lastAngle.current !== 0) {
//               const angleDelta = angle - lastAngle.current;
//               const newRotation = lastRotation.current + angleDelta;
//               rotation.setValue(newRotation);
//             }

//             lastDistance.current = distance;
//             lastAngle.current = angle;
//           }
//         } else {
//           // Normal drag
//           pan.x.setValue(gestureState.dx);
//           pan.y.setValue(gestureState.dy);
//         }
//       },

//       onPanResponderRelease: () => {
//         pan.flattenOffset();
//         lastDistance.current = 0;
//         lastAngle.current = 0;

//         // Update sticker position, scale and rotation
//         const currentX = ((pan.x as any)._value / screenWidth) * 100;
//         const currentY = ((pan.y as any)._value / 700) * 100;
//         const currentScale = (scale as any)._value;
//         const currentRotation = (rotation as any)._value;

//         lastScale.current = currentScale;
//         lastRotation.current = currentRotation;

//         onUpdate({
//           ...sticker,
//           x: Math.max(0, Math.min(100, currentX)),
//           y: Math.max(0, Math.min(100, currentY)),
//           scale: currentScale,
//           rotation: currentRotation,
//         });
//       },
//     })
//   ).current;

//   const animatedStyle = {
//     transform: [
//       { translateX: pan.x },
//       { translateY: pan.y },
//       { scale: Animated.multiply(baseScale, pinchScale) },
//       { scale },
//       { rotate: rotation.interpolate({
//           inputRange: [-360, 360],
//           outputRange: ['-360deg', '360deg'],
//         })
//       },
//     ],
//   };

//   return (
//     <Animated.View
//       style={[
//         {
//           position: 'absolute',
//           width: 60,
//           height: 60,
//           zIndex: isSelected ? 11 : 10,
//         },
//         animatedStyle,
//       ]}
//       {...panResponder.panHandlers}
//     >
//       <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
//         <Text style={{ fontSize: 40 }}>{sticker.emoji}</Text>
//       </View>

//       {isSelected && (
//         <TouchableOpacity
//           style={{
//             position: 'absolute',
//             width: 20,
//             height: 20,
//             borderRadius: 10,
//             backgroundColor: 'rgba(255, 255, 255, 0.9)',
//             top: -8,
//             right: -8,
//             alignItems: 'center',
//             justifyContent: 'center',
//             shadowColor: '#000',
//             shadowOffset: { width: 0, height: 2 },
//             shadowOpacity: 0.25,
//             shadowRadius: 3.84,
//             elevation: 5,
//           }}
//           onPress={onRemove}
//         >
//           <Ionicons name="close" size={14} color="#000" />
//         </TouchableOpacity>
//       )}
//     </Animated.View>
//   );
// };

// export default function EditEventCoverScreen() {
//   const router = useRouter();
//   const [activeTab, setActiveTab] = useState<TabType>('style');
//   const [selectedTitleFont, setSelectedTitleFont] = useState('1');
//   const [selectedSubtitleFont, setSelectedSubtitleFont] = useState('1');
//   const [selectedBackground, setSelectedBackground] = useState('');
//   const [eventTitle, setEventTitle] = useState('');
//   const [eventSubtitle, setEventSubtitle] = useState('');
//   const [isEditingTitle, setIsEditingTitle] = useState(false);
//   const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
//   const [coverImage, setCoverImage] = useState('');
//   const [uploadedImage, setUploadedImage] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState('party');
//   const [placedStickers, setPlacedStickers] = useState<StickerType[]>([]);
//   const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isDecorationMode, setIsDecorationMode] = useState(false);
//   const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('party');
//   const [templateSearchQuery, setTemplateSearchQuery] = useState('');

//   const handleUploadImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       allowsEditing: true,
//       aspect: [16, 9],
//       quality: 0.8,
//     });

//     if (!result.canceled && result.assets[0]) {
//       setUploadedImage(result.assets[0].uri);
//       setCoverImage(result.assets[0].uri);
//       setSelectedBackground('');
//       void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//     }
//   };

//   const handleResetToDefault = () => {
//     setCoverImage('');
//     setUploadedImage('');
//     setSelectedBackground('');
//     setSelectedTitleFont('1');
//     setSelectedSubtitleFont('1');
//     setPlacedStickers([]);
//     void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//   };

//   const handleSave = async () => {
//     setIsLoading(true);
//     try {
//       // Here you would save the cover configuration
//       void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       router.back();
//     } catch (error) {
//       Alert.alert('Error', 'Failed to save cover');
//       void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleEnterDecorationMode = () => {
//     setIsDecorationMode(true);
//     void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
//   };

//   const handleExitDecorationMode = (save: boolean) => {
//     if (save) {
//       void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//     }
//     setIsDecorationMode(false);
//   };

//   const handleBackgroundSelect = (bgId: string) => {
//     setSelectedBackground(bgId);
//     setCoverImage(''); // Désélectionner l'image quand on choisit un background
//   };

//   const handleImageSelect = () => {
//     if (uploadedImage) {
//       setCoverImage(uploadedImage);
//       setSelectedBackground(''); // Désélectionner le background quand on choisit l'image
//     }
//   };

//   const getTitleFontStyle = () => {
//     const font = FONTS.find(f => f.id === selectedTitleFont);
//     return font ? font.style : {};
//   };

//   const getSubtitleFontStyle = () => {
//     const font = FONTS.find(f => f.id === selectedSubtitleFont);
//     return font ? font.style : {};
//   };

//   const renderStyleTab = () => (
//     <ScrollView showsVerticalScrollIndicator={false}>
//       {/* Event Title Section */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Event Title</Text>
//         <TextInput
//           style={styles.titleInput}
//           value={eventTitle.replace('\n', ' ')}
//           onChangeText={(text) => {
//             if (text.length <= 50) {
//               setEventTitle(text.includes(' ') && text.length > 20 ? text.replace(' ', '\n') : text);
//             }
//           }}
//           placeholder="Tap to add your event title"
//           placeholderTextColor="#999"
//           maxLength={50}
//         />
//         <Text style={styles.characterCount}>{eventTitle.length}/50</Text>
//       </View>

//       {/* Event Subtitle Section */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Event Subtitle</Text>
//         <TextInput
//           style={[styles.titleInput, styles.subtitleInput]}
//           value={eventSubtitle.replace('\n', ' ')}
//           onChangeText={(text) => {
//             if (text.length <= 80) {
//               setEventSubtitle(text);
//             }
//           }}
//           placeholder="Drop a punchline to get the crew hyped for what's coming"
//           placeholderTextColor="#999"
//           multiline
//           numberOfLines={2}
//           maxLength={80}
//         />
//         <Text style={styles.characterCount}>{eventSubtitle.length}/80</Text>
//       </View>

//       {/* Title Font Section */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Title Font</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontsScroll}>
//           <View style={styles.fontsRow}>
//             {FONTS.map((font) => (
//               <TouchableOpacity
//                 key={font.id}
//                 style={[
//                   styles.fontOption,
//                   selectedTitleFont === font.id && styles.selectedFontOption,
//                 ]}
//                 onPress={() => setSelectedTitleFont(font.id)}
//               >
//                 <Text style={[styles.fontText, font.style, selectedTitleFont === font.id && styles.selectedFontText]}>
//                   {font.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       </View>

//       {/* Subtitle Font Section */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Subtitle Font</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontsScroll}>
//           <View style={styles.fontsRow}>
//             {FONTS.map((font) => (
//               <TouchableOpacity
//                 key={font.id}
//                 style={[
//                   styles.fontOption,
//                   selectedSubtitleFont === font.id && styles.selectedFontOption,
//                 ]}
//                 onPress={() => setSelectedSubtitleFont(font.id)}
//               >
//                 <Text style={[styles.fontText, font.style, selectedSubtitleFont === font.id && styles.selectedFontText]}>
//                   {font.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       </View>

//       {/* Background Section */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Background</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.backgroundsScroll}>
//           <View style={styles.backgroundsRow}>
//             {BACKGROUNDS.map((bg) => (
//               <TouchableOpacity
//                 key={bg.id}
//                 style={styles.backgroundOption}
//                 onPress={() => handleBackgroundSelect(bg.id)}
//               >
//                 <LinearGradient
//                   colors={bg.colors}
//                   style={[
//                     styles.backgroundGradient,
//                     selectedBackground === bg.id && styles.selectedBackground,
//                   ]}
//                 />
//               </TouchableOpacity>
//             ))}
//             <TouchableOpacity
//               style={styles.backgroundOption}
//               onPress={handleUploadImage}
//             >
//               <View style={styles.addBackgroundBtn}>
//                 <Ionicons name="add" size={24} color="#007AFF" />
//               </View>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </View>

//       {/* Upload Media Section */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Cover Image</Text>
//         {uploadedImage ? (
//           <View style={styles.uploadedImageContainer}>
//             <TouchableOpacity
//               style={[styles.uploadedImageWrapper, coverImage === uploadedImage && styles.selectedUploadedImage]}
//               onPress={handleImageSelect}
//             >
//               <Image source={{ uri: uploadedImage }} style={styles.uploadedImageThumb} />
//               {coverImage === uploadedImage && (
//                 <View style={styles.selectedCheckmark}>
//                   <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
//                 </View>
//               )}
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.changeImageBtn} onPress={handleUploadImage}>
//               <Ionicons name="camera-outline" size={20} color="#007AFF" />
//               <Text style={styles.changeImageText}>Change Image</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <TouchableOpacity style={styles.uploadOption} onPress={handleUploadImage}>
//             <Ionicons name="image-outline" size={24} color="#666" />
//             <Text style={styles.uploadText}>Upload Image</Text>
//             <Ionicons name="chevron-forward" size={20} color="#999" />
//           </TouchableOpacity>
//         )}
//       </View>
//     </ScrollView>
//   );

//   const handleStickerSelect = (sticker: any) => {
//     if (placedStickers.length >= MAX_STICKERS) {
//       Alert.alert('Limit Reached', `You can only add up to ${MAX_STICKERS} stickers`);
//       return;
//     }

//     const newSticker = {
//       id: `placed-${Date.now()}`,
//       emoji: sticker.emoji,
//       x: 50, // Center X %
//       y: 30, // Upper center Y %
//       scale: 1.2,
//       rotation: 0,
//     };
//     setPlacedStickers([...placedStickers, newSticker]);
//     setSelectedStickerId(newSticker.id);
//     void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

//     // Automatically enter decoration mode when adding a new sticker
//     setIsDecorationMode(true);
//   };

//   const handleRemoveSticker = (stickerId: string) => {
//     setPlacedStickers(placedStickers.filter(s => s.id !== stickerId));
//   };

//   const renderDecorateTab = () => {
//     const currentCategory = STICKER_CATEGORIES.find(cat => cat.id === selectedCategory);
//     const filteredStickers = currentCategory?.stickers.filter(sticker =>
//       searchQuery === '' || sticker.name.toLowerCase().includes(searchQuery.toLowerCase())
//     ) || [];

//     return (
//       <ScrollView showsVerticalScrollIndicator={false}>
//         {/* Category Tabs */}
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
//           <View style={styles.categoryRow}>
//             {STICKER_CATEGORIES.map((category) => (
//               <TouchableOpacity
//                 key={category.id}
//                 style={[
//                   styles.categoryTab,
//                   selectedCategory === category.id && styles.selectedCategoryTab,
//                 ]}
//                 onPress={() => setSelectedCategory(category.id)}
//               >
//                 <Text style={[
//                   styles.categoryTabText,
//                   selectedCategory === category.id && styles.selectedCategoryTabText,
//                 ]}>
//                   {category.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Search Bar */}
//         <View style={styles.searchContainer}>
//           <Ionicons name="search" size={20} color="#999" />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search stickers"
//             placeholderTextColor="#999"
//             value={searchQuery}
//             onChangeText={setSearchQuery}
//           />
//         </View>

//         {/* Stickers Grid */}
//         <View style={styles.stickersGrid}>
//           {filteredStickers.map((sticker) => (
//             <TouchableOpacity
//               key={sticker.id}
//               style={styles.stickerOption}
//               onPress={() => handleStickerSelect(sticker)}
//             >
//               <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* Placed Stickers Info */}
//         {placedStickers.length > 0 && (
//           <View style={styles.placedStickersSection}>
//             <View style={styles.placedStickersInfo}>
//               <Text style={styles.placedStickersText}>
//                 {placedStickers.length} sticker{placedStickers.length > 1 ? 's' : ''} added
//               </Text>
//               <TouchableOpacity onPress={() => setPlacedStickers([])}>
//                 <Text style={styles.clearAllText}>Clear All</Text>
//               </TouchableOpacity>
//             </View>

//             {/* Reposition Stickers button in Decorate panel */}
//             <TouchableOpacity
//               style={styles.repositionPanelButton}
//               onPress={handleEnterDecorationMode}
//             >
//               <Ionicons name="move-outline" size={20} color="#007AFF" />
//               <Text style={styles.repositionPanelButtonText}>Reposition Stickers</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>
//     );
//   };

//   const handleTemplateSelect = (template: { id: string; name: string; image: string }) => {
//     setCoverImage(template.image);
//     setUploadedImage('');
//     setSelectedBackground('');
//     void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//   };

//   const renderTemplateTab = () => {
//     const currentCategory = TEMPLATE_CATEGORIES.find(cat => cat.id === selectedTemplateCategory);
//     const filteredTemplates = currentCategory?.templates.filter(template =>
//       templateSearchQuery === '' || template.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
//     ) || [];

//     return (
//       <ScrollView showsVerticalScrollIndicator={false}>
//         {/* Category Tabs */}
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
//           <View style={styles.categoryRow}>
//             {TEMPLATE_CATEGORIES.map((category) => (
//               <TouchableOpacity
//                 key={category.id}
//                 style={[
//                   styles.categoryTab,
//                   selectedTemplateCategory === category.id && styles.selectedCategoryTab,
//                 ]}
//                 onPress={() => setSelectedTemplateCategory(category.id)}
//               >
//                 <Text style={[
//                   styles.categoryTabText,
//                   selectedTemplateCategory === category.id && styles.selectedCategoryTabText,
//                 ]}>
//                   {category.name}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>

//         {/* Search Bar */}
//         <View style={styles.searchContainer}>
//           <Ionicons name="search" size={20} color="#999" />
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search templates"
//             placeholderTextColor="#999"
//             value={templateSearchQuery}
//             onChangeText={setTemplateSearchQuery}
//           />
//         </View>

//         {/* Templates Grid */}
//         <View style={styles.templatesGrid}>
//           {filteredTemplates.length > 0 ? (
//             filteredTemplates.map((template) => (
//               <TouchableOpacity
//                 key={template.id}
//                 style={styles.templateOption}
//                 onPress={() => handleTemplateSelect(template)}
//                 activeOpacity={0.9}
//               >
//                 <Image
//                   source={{ uri: template.image }}
//                   style={styles.templateImage}
//                 />
//                 <View style={styles.templateOverlay}>
//                   <LinearGradient
//                     colors={['transparent', 'rgba(0,0,0,0.7)']}
//                     style={styles.templateGradient}
//                   />
//                   <Text style={styles.templateName}>{template.name}</Text>
//                 </View>
//                 {coverImage === template.image && (
//                   <View style={styles.templateSelectedBadge}>
//                     <Ionicons name="checkmark-circle" size={26} color="#FFF" />
//                   </View>
//                 )}
//               </TouchableOpacity>
//             ))
//           ) : (
//             <View style={styles.noTemplatesContainer}>
//               <Ionicons name="image-outline" size={48} color="#999" />
//               <Text style={styles.noTemplatesText}>No templates found</Text>
//               <Text style={styles.noTemplatesSubtext}>Try another search term</Text>
//             </View>
//           )}
//         </View>
//       </ScrollView>
//     );
//   };

//   const getBackgroundStyle = () => {
//     if (selectedBackground) {
//       const bg = BACKGROUNDS.find(b => b.id === selectedBackground);
//       if (bg) {
//         return { colors: bg.colors };
//       }
//     }
//     return { colors: ['#C8E6C9', '#C8E6C9'] as [string, string] };
//   };

//   // Decoration mode screen
//   if (isDecorationMode) {
//     return (
//       <View style={styles.container}>
//         {/* Header with preview - no scroll */}
//         <View style={styles.decorationModeContainer}>
//           <View style={styles.headerContainer}>
//             {selectedBackground && !coverImage ? (
//               <LinearGradient colors={getBackgroundStyle().colors} style={styles.headerGradient} />
//             ) : (
//               <Image
//                 source={coverImage ? { uri: coverImage } : DEFAULT_EVENT_COVER}
//                 style={styles.coverImage}
//               />
//             )}

//             {/* Overlay for readability */}
//             <View style={styles.headerOverlay} pointerEvents="none" />

//             {/* Placed Stickers - Draggable in decoration mode */}
//             <View style={styles.stickersLayer} pointerEvents="box-none">
//               {placedStickers.map((sticker) => (
//                 <DraggableSticker
//                   key={sticker.id}
//                   sticker={sticker}
//                   isSelected={selectedStickerId === sticker.id}
//                   onSelect={() => setSelectedStickerId(sticker.id)}
//                   onUpdate={(updatedSticker) => {
//                     setPlacedStickers(placedStickers.map(s =>
//                       s.id === updatedSticker.id ? updatedSticker : s
//                     ));
//                   }}
//                   onRemove={() => {
//                     handleRemoveSticker(sticker.id);
//                     if (selectedStickerId === sticker.id) {
//                       setSelectedStickerId(null);
//                     }
//                   }}
//                 />
//               ))}
//             </View>

//             {/* Decoration mode header */}
//             <View style={styles.decorationHeader}>
//               <TouchableOpacity
//                 onPress={() => handleExitDecorationMode(false)}
//                 style={styles.decorationButton}
//               >
//                 <Ionicons name="close" size={24} color="#FFF" />
//               </TouchableOpacity>

//               <Text style={styles.decorationTitle}>Position Stickers</Text>

//               <TouchableOpacity
//                 onPress={() => handleExitDecorationMode(true)}
//                 style={styles.decorationButton}
//               >
//                 <Ionicons name="checkmark" size={24} color="#FFF" />
//               </TouchableOpacity>
//             </View>

//             {/* Event title and subtitle - always visible but not interactive in decoration mode */}
//             <View style={styles.eventTitleContainer} pointerEvents="none">
//               <Text style={[styles.eventTitle, getTitleFontStyle()]}>
//                 {eventTitle || 'Tap to add your\nevent title'}
//               </Text>
//               <Text style={[styles.eventSubtitle, getSubtitleFontStyle()]}>
//                 {eventSubtitle || 'Drop a punchline to get the crew\nhyped for what\'s coming.'}
//               </Text>
//             </View>
//           </View>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
//         {/* Header with preview */}
//         <View style={styles.headerContainer}>
//         {selectedBackground && !coverImage ? (
//           <LinearGradient colors={getBackgroundStyle().colors} style={styles.headerGradient} />
//         ) : (
//           <Image
//             source={coverImage ? { uri: coverImage } : DEFAULT_EVENT_COVER}
//             style={styles.coverImage}
//           />
//         )}

//         {/* Overlay for readability */}
//         <View style={styles.headerOverlay} pointerEvents="none" />

//         {/* Placed Stickers - Static in normal mode */}
//         <View style={styles.stickersLayer} pointerEvents="none">
//           {placedStickers.map((sticker) => (
//             <View
//               key={sticker.id}
//               style={[
//                 styles.staticSticker,
//                 {
//                   left: `${sticker.x}%`,
//                   top: `${sticker.y}%`,
//                   transform: [
//                     { scale: sticker.scale },
//                     { rotate: `${sticker.rotation}deg` },
//                   ],
//                 },
//               ]}
//             >
//               <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
//             </View>
//           ))}
//         </View>

//         {/* Top navigation bar */}
//         <View style={styles.topNavBar}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//             <BackButton width={24} height={24} fill="#FFF" color="#FFF" stroke="#FFF" />
//           </TouchableOpacity>

//           <Text style={styles.headerTitle}>Edit Cover</Text>

//           <View style={styles.rightIcons}>
//             <TouchableOpacity style={{ paddingHorizontal: 4 }}>
//               <ChatButton width={40} height={40} />
//             </TouchableOpacity>
//             <TouchableOpacity style={{ paddingHorizontal: 4 }}>
//               <NotificationButton width={40} height={40} />
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* Event title and subtitle - always visible */}
//         <View style={styles.eventTitleContainer}>
//           <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
//             <Text style={[styles.eventTitle, getTitleFontStyle()]}>
//               {eventTitle || 'Tap to add your\nevent title'}
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity onPress={() => setIsEditingSubtitle(true)}>
//             <Text style={[styles.eventSubtitle, getSubtitleFontStyle()]}>
//               {eventSubtitle || 'Drop a punchline to get the crew\nhyped for what\'s coming.'}
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Title Edit Modal */}
//         {isEditingTitle && (
//           <View style={styles.editOverlay}>
//             <View style={styles.editModal}>
//               <Text style={styles.editModalTitle}>Edit Title</Text>
//               <TextInput
//                 style={styles.editModalInput}
//                 value={eventTitle.replace('\n', ' ')}
//                 onChangeText={(text) => {
//                   if (text.length <= 50) {
//                     setEventTitle(text.includes(' ') && text.length > 20 ? text.replace(' ', '\n') : text);
//                   }
//                 }}
//                 placeholder="Tap to add your event title"
//                 placeholderTextColor="#999"
//                 autoFocus
//                 maxLength={50}
//               />
//               <Text style={styles.modalCharacterCount}>{eventTitle.length}/50</Text>
//               <View style={styles.editModalButtons}>
//                 <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditingTitle(false)}>
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity style={styles.doneButton} onPress={() => setIsEditingTitle(false)}>
//                   <Text style={styles.doneButtonText}>Done</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* Subtitle Edit Modal */}
//         {isEditingSubtitle && (
//           <View style={styles.editOverlay}>
//             <View style={styles.editModal}>
//               <Text style={styles.editModalTitle}>Edit Subtitle</Text>
//               <TextInput
//                 style={[styles.editModalInput, { height: 80 }]}
//                 value={eventSubtitle.replace('\n', ' ')}
//                 onChangeText={(text) => {
//                   if (text.length <= 80) {
//                     setEventSubtitle(text);
//                   }
//                 }}
//                 placeholder="Drop a punchline to get the crew hyped for what's coming"
//                 placeholderTextColor="#999"
//                 autoFocus
//                 multiline
//                 numberOfLines={3}
//                 maxLength={80}
//               />
//               <Text style={styles.modalCharacterCount}>{eventSubtitle.length}/80</Text>
//               <View style={styles.editModalButtons}>
//                 <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditingSubtitle(false)}>
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity style={styles.doneButton} onPress={() => setIsEditingSubtitle(false)}>
//                   <Text style={styles.doneButtonText}>Done</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         )}

//         {/* Reset to Default button */}
//         <TouchableOpacity style={styles.resetButton} onPress={handleResetToDefault}>
//           <Ionicons name="trash-outline" size={20} color="#666" />
//           <Text style={styles.resetButtonText}>Reset to Default</Text>
//         </TouchableOpacity>

//       </View>

//       {/* Bottom sheet with tabs */}
//       <View style={styles.bottomSheet}>
//         {/* Tabs */}
//         <View style={styles.tabsContainer}>
//           <TouchableOpacity
//             style={[styles.tab, activeTab === 'style' && styles.activeTab]}
//             onPress={() => setActiveTab('style')}
//           >
//             <Text style={[styles.tabText, activeTab === 'style' && styles.activeTabText]}>
//               Style
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.tab, activeTab === 'decorate' && styles.activeTab]}
//             onPress={() => setActiveTab('decorate')}
//           >
//             <Text style={[styles.tabText, activeTab === 'decorate' && styles.activeTabText]}>
//               Decorate
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.tab, activeTab === 'template' && styles.activeTab]}
//             onPress={() => setActiveTab('template')}
//           >
//             <Text style={[styles.tabText, activeTab === 'template' && styles.activeTabText]}>
//               Template
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Tab content */}
//         <View style={styles.tabContent}>
//           {activeTab === 'style' && renderStyleTab()}
//           {activeTab === 'decorate' && renderDecorateTab()}
//           {activeTab === 'template' && renderTemplateTab()}
//         </View>

//         {/* Action buttons */}
//         <View style={styles.actionsContainer}>
//           <TouchableOpacity
//             style={styles.saveButton}
//             onPress={handleSave}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <ActivityIndicator color="#FFF" />
//             ) : (
//               <Text style={styles.saveButtonText}>Save</Text>
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity onPress={() => router.back()}>
//             <Text style={styles.discardText}>Discard Changes</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFF',
//   },
//   headerContainer: {
//     height: 700,
//     width: '100%',
//     position: 'relative',
//     backgroundColor: '#222',
//     overflow: 'hidden',
//   },
//   coverImage: {
//     width: '100%',
//     height: '100%',
//     resizeMode: 'cover',
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     zIndex: 0,
//   },
//   headerGradient: {
//     width: '100%',
//     height: '100%',
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     zIndex: 0,
//   },
//   headerOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.4)',
//     zIndex: 1,
//   },
//   topNavBar: {
//     position: 'absolute',
//     top: 64,
//     left: 0,
//     right: 0,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     zIndex: 10,
//     height: 48,
//   },
//   backButton: {
//     padding: 8,
//   },
//   headerTitle: {
//     flex: 1,
//     color: '#FFF',
//     fontWeight: '600',
//     fontSize: 22,
//     textAlign: 'center',
//   },
//   rightIcons: {
//     flexDirection: 'row',
//   },
//   eventTitleContainer: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     top: '50%',
//     transform: [{ translateY: -50 }],
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     zIndex: 50,
//   },
//   eventTitle: {
//     color: '#FFF',
//     fontSize: 38,
//     fontWeight: '300',
//     textAlign: 'center',
//     lineHeight: 44,
//   },
//   eventSubtitle: {
//     color: '#FFF',
//     fontSize: 16,
//     textAlign: 'center',
//     marginTop: 16,
//     lineHeight: 22,
//     opacity: 0.85,
//   },
//   resetButton: {
//     position: 'absolute',
//     alignSelf: 'center',
//     bottom: 80,
//     backgroundColor: '#FFF',
//     borderRadius: 20,
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     zIndex: 100,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   resetButtonText: {
//     fontSize: 16,
//     color: '#666',
//   },
//   bottomSheet: {
//     backgroundColor: '#FFF',
//     borderTopLeftRadius: 32,
//     borderTopRightRadius: 32,
//     marginTop: -24,
//     paddingTop: 32,
//     paddingHorizontal: 20,
//     paddingBottom: 40,
//     zIndex: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.08,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   tabsContainer: {
//     flexDirection: 'row',
//     marginBottom: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E5EA',
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: 'center',
//   },
//   activeTab: {
//     borderBottomWidth: 2,
//     borderBottomColor: '#007AFF',
//   },
//   tabText: {
//     fontSize: 16,
//     color: '#999',
//   },
//   activeTabText: {
//     color: '#007AFF',
//     fontWeight: '600',
//   },
//   tabContent: {
//     minHeight: 400,
//   },
//   section: {
//     marginBottom: 32,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#000',
//     marginBottom: 12,
//   },
//   viewAllLink: {
//     fontSize: 16,
//     color: '#007AFF',
//   },
//   fontsScroll: {
//     marginHorizontal: -20,
//     paddingHorizontal: 20,
//   },
//   fontsRow: {
//     flexDirection: 'row',
//     gap: 12,
//     paddingRight: 20,
//   },
//   fontOption: {
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//     backgroundColor: '#FFF',
//     borderWidth: 1,
//     borderColor: '#E5E5EA',
//     minWidth: 120,
//   },
//   selectedFontOption: {
//     backgroundColor: '#007AFF',
//     borderColor: '#007AFF',
//   },
//   fontText: {
//     fontSize: 16,
//     color: '#000',
//     textAlign: 'center',
//   },
//   selectedFontText: {
//     color: '#FFF',
//   },
//   backgroundsScroll: {
//     marginHorizontal: -20,
//     paddingHorizontal: 20,
//   },
//   backgroundsRow: {
//     flexDirection: 'row',
//     gap: 12,
//     paddingRight: 20,
//   },
//   backgroundOption: {
//     width: 50,
//     height: 50,
//   },
//   backgroundGradient: {
//     width: '100%',
//     height: '100%',
//     borderRadius: 25,
//     borderWidth: 2,
//     borderColor: 'transparent',
//   },
//   selectedBackground: {
//     borderWidth: 3,
//     borderColor: '#007AFF',
//   },
//   addBackgroundBtn: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     borderWidth: 2,
//     borderColor: '#007AFF',
//     borderStyle: 'dashed',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#FFF',
//   },
//   uploadOption: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E5EA',
//   },
//   uploadText: {
//     flex: 1,
//     fontSize: 16,
//     color: '#000',
//     marginLeft: 12,
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#F5F5F7',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     marginBottom: 20,
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: 16,
//     marginLeft: 8,
//     color: '#000',
//   },
//   categoryScroll: {
//     marginHorizontal: -20,
//     paddingHorizontal: 20,
//     marginBottom: 16,
//   },
//   categoryRow: {
//     flexDirection: 'row',
//     gap: 12,
//     paddingRight: 20,
//   },
//   categoryTab: {
//     paddingVertical: 8,
//     paddingHorizontal: 16,
//     borderRadius: 20,
//     backgroundColor: '#F5F5F7',
//   },
//   selectedCategoryTab: {
//     backgroundColor: '#007AFF',
//   },
//   categoryTabText: {
//     fontSize: 14,
//     color: '#666',
//     fontWeight: '500',
//   },
//   selectedCategoryTabText: {
//     color: '#FFF',
//   },
//   stickersGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     paddingTop: 16,
//   },
//   stickerOption: {
//     width: (screenWidth - 60) / 4,
//     height: (screenWidth - 60) / 4,
//     backgroundColor: '#F5F5F7',
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//     padding: 8,
//   },
//   stickerEmoji: {
//     fontSize: 36,
//   },
//   placedStickersInfo: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 24,
//     paddingTop: 16,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E5EA',
//   },
//   placedStickersText: {
//     fontSize: 14,
//     color: '#666',
//   },
//   clearAllText: {
//     fontSize: 14,
//     color: '#FF3B30',
//     fontWeight: '600',
//   },
//   placedSticker: {
//     position: 'absolute',
//     width: 60,
//     height: 60,
//     zIndex: 200,
//   },
//   placedStickerEmoji: {
//     fontSize: 40,
//     textAlign: 'center',
//   },
//   removeStickerBtn: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     backgroundColor: '#FFF',
//     borderRadius: 10,
//   },
//   stickersLayer: {
//     ...StyleSheet.absoluteFillObject,
//     zIndex: 2,
//   },
//   stickerControlBtn: {
//     position: 'absolute',
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   removeBtn: {
//     backgroundColor: '#FF3B30',
//     top: -10,
//     right: -10,
//   },
//   scaleUpBtn: {
//     backgroundColor: '#007AFF',
//     bottom: -10,
//     right: -10,
//   },
//   scaleDownBtn: {
//     backgroundColor: '#007AFF',
//     bottom: -10,
//     left: -10,
//   },
//   templatesGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     paddingHorizontal: 12,
//     paddingBottom: 20,
//     marginTop: 8,
//     gap: 12, // espace entre les éléments
//   },
//   noTemplatesContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 60,
//   },
//   noTemplatesText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//     marginTop: 16,
//   },
//   noTemplatesSubtext: {
//     fontSize: 14,
//     color: '#999',
//     marginTop: 4,
//   },
//   templateOption: {
//     // Réduit de 10% : multiplié par 0.90
//     width: ((screenWidth - 24 - 12) / 2) * 0.90,
//     height: (((screenWidth - 24 - 12) / 2) * 1.4) * 0.90, // ratio portrait réduit de 10%
//     marginBottom: 12,
//     borderRadius: 10,
//     overflow: 'hidden',
//     backgroundColor: '#F5F5F7',
//   },
//   templateImage: {
//     width: '100%',
//     height: '100%',
//     resizeMode: 'cover',
//   },
//   templateOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: '40%',
//     justifyContent: 'flex-end',
//     paddingBottom: 12,
//     paddingHorizontal: 12,
//   },
//   templateGradient: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: '100%',
//   },
//   templateName: {
//     color: '#FFF',
//     fontSize: 16,
//     fontWeight: '700',
//     textAlign: 'center',
//     textShadowColor: 'rgba(0, 0, 0, 0.8)',
//     textShadowOffset: { width: 0, height: 1 },
//     textShadowRadius: 3,
//     letterSpacing: 0.5,
//   },
//   templateSelectedBadge: {
//     position: 'absolute',
//     top: 12,
//     right: 12,
//     backgroundColor: '#007AFF',
//     borderRadius: 16,
//     width: 36,
//     height: 36,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#007AFF',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   actionsContainer: {
//     paddingVertical: 20,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E5EA',
//   },
//   saveButton: {
//     backgroundColor: '#007AFF',
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   saveButtonText: {
//     color: '#FFF',
//     fontSize: 17,
//     fontWeight: '600',
//   },
//   discardText: {
//     fontSize: 16,
//     color: '#007AFF',
//     textAlign: 'center',
//   },
//   uploadedImageContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 16,
//   },
//   uploadedImageWrapper: {
//     width: 100,
//     height: 100,
//     borderRadius: 12,
//     overflow: 'hidden',
//     borderWidth: 2,
//     borderColor: 'transparent',
//     position: 'relative',
//   },
//   selectedUploadedImage: {
//     borderColor: '#007AFF',
//   },
//   uploadedImageThumb: {
//     width: '100%',
//     height: '100%',
//   },
//   selectedCheckmark: {
//     position: 'absolute',
//     top: 8,
//     right: 8,
//     backgroundColor: '#FFF',
//     borderRadius: 12,
//   },
//   changeImageBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     backgroundColor: '#E3F2FD',
//     borderRadius: 20,
//   },
//   changeImageText: {
//     color: '#007AFF',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   titleInput: {
//     backgroundColor: '#FFF',
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#E5E5EA',
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#000',
//   },
//   subtitleInput: {
//     minHeight: 80,
//     textAlignVertical: 'top',
//   },
//   characterCount: {
//     fontSize: 12,
//     color: '#999',
//     marginTop: 4,
//     textAlign: 'right',
//   },
//   editOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 1000,
//   },
//   editModal: {
//     backgroundColor: '#FFF',
//     borderRadius: 16,
//     padding: 24,
//     width: '90%',
//     maxWidth: 350,
//   },
//   editModalTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginBottom: 16,
//     textAlign: 'center',
//   },
//   editModalInput: {
//     backgroundColor: '#F5F5F7',
//     borderRadius: 10,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#000',
//     marginBottom: 8,
//   },
//   modalCharacterCount: {
//     fontSize: 12,
//     color: '#999',
//     marginBottom: 20,
//     textAlign: 'right',
//   },
//   editModalButtons: {
//     flexDirection: 'row',
//     gap: 12,
//   },
//   cancelButton: {
//     flex: 1,
//     backgroundColor: '#F5F5F7',
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: 'center',
//   },
//   cancelButtonText: {
//     color: '#000',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   doneButton: {
//     flex: 1,
//     backgroundColor: '#007AFF',
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: 'center',
//   },
//   doneButtonText: {
//     color: '#FFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   // Decoration mode styles
//   decorationModeContainer: {
//     flex: 1,
//   },
//   decorationHeader: {
//     position: 'absolute',
//     top: 64,
//     left: 0,
//     right: 0,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     zIndex: 20,
//   },
//   decorationButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   decorationTitle: {
//     color: '#FFF',
//     fontSize: 20,
//     fontWeight: '600',
//   },
//   staticSticker: {
//     position: 'absolute',
//     alignItems: 'center',
//     justifyContent: 'center',
//     zIndex: 2,
//   },
//   repositionButton: {
//     position: 'absolute',
//     bottom: 80,
//     alignSelf: 'center',
//     backgroundColor: '#FFF',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     zIndex: 100,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   repositionButtonText: {
//     color: '#007AFF',
//     fontWeight: '500',
//     fontSize: 16,
//   },
//   placedStickersSection: {
//     marginTop: 24,
//   },
//   repositionPanelButton: {
//     backgroundColor: '#FFF',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: '#007AFF',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     marginTop: 12,
//   },
//   repositionPanelButtonText: {
//     color: '#007AFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });
