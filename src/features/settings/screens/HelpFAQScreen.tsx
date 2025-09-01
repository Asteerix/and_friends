import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer:
      "To create an account, download the & friends app and sign up with your phone number. You'll receive a verification code via SMS. After verification, you can set up your profile with your name, photo, and interests.",
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'Is & friends free to use?',
    answer:
      'Yes! & friends is completely free to download and use. All core features including creating events, joining events, messaging, and sharing stories are available at no cost.',
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'How do I find friends on the app?',
    answer:
      "You can find friends by:\n• Syncing your contacts to see who's already on & friends\n• Searching for friends by username\n• Discovering people at events you attend\n• Getting friend suggestions based on mutual connections",
  },

  // Events
  {
    id: '4',
    category: 'Events',
    question: 'How do I create an event?',
    answer:
      'Tap the create button (+) in the bottom navigation, select "Create Event", and fill in the details like title, date, time, location, and description. You can also add a cover photo, set privacy settings, and invite specific friends.',
  },
  {
    id: '5',
    category: 'Events',
    question: 'Can I make my event private?',
    answer:
      'Yes! When creating an event, you can choose who can see and join it:\n• Public: Anyone can discover and join\n• Friends Only: Only your friends can see and join\n• Invite Only: Only people you specifically invite can see and join',
  },
  {
    id: '6',
    category: 'Events',
    question: 'How do I RSVP to an event?',
    answer:
      "Open the event details page and tap the RSVP button. You can choose:\n• Going: You'll attend the event\n• Maybe: You're interested but not sure\n• Can't go: You won't be able to attend\n\nYou can change your RSVP status anytime before the event.",
  },
  {
    id: '7',
    category: 'Events',
    question: 'Can I edit or cancel an event I created?',
    answer:
      'Yes, as the event creator you can:\n• Edit event details anytime before it starts\n• Cancel the event (all attendees will be notified)\n• Transfer ownership to another attendee\n\nTap the menu button (...) on your event page to access these options.',
  },

  // Stories & Memories
  {
    id: '8',
    category: 'Stories',
    question: 'What are Stories?',
    answer:
      "Stories are photos or videos you share that disappear after 24 hours. They're a fun way to share moments from your day with friends without permanently posting them.",
  },
  {
    id: '9',
    category: 'Stories',
    question: 'How do I create a Story?',
    answer:
      'Tap the "+" button on your profile picture in the Stories section, or tap the camera icon. You can:\n• Take a photo or video\n• Choose from your gallery\n• Add text, stickers, or drawings\n• Choose who can see your story',
  },
  {
    id: '10',
    category: 'Stories',
    question: 'Who can see my Stories?',
    answer:
      'You control who sees your stories:\n• Everyone: All & friends users\n• Friends Only: Only your friends\n• Custom: Select specific friends\n\nYou can also hide stories from specific people in your privacy settings.',
  },

  // Messages & Chat
  {
    id: '11',
    category: 'Messages',
    question: 'How do I send a message?',
    answer:
      'You can message friends by:\n• Tapping the chat icon on their profile\n• Starting a new chat from the Messages tab\n• Replying to their story\n• Messaging in an event group chat',
  },
  {
    id: '12',
    category: 'Messages',
    question: 'Can I delete messages?',
    answer:
      'Yes, you can delete messages you\'ve sent. Press and hold on a message to see options. Deleted messages will show "This message was deleted" to other participants.',
  },
  {
    id: '13',
    category: 'Messages',
    question: 'What are event group chats?',
    answer:
      "Each event automatically has a group chat for all attendees. It's a great place to:\n• Coordinate plans\n• Share updates\n• Post photos during/after the event\n• Stay connected with people you met",
  },

  // Privacy & Safety
  {
    id: '14',
    category: 'Privacy',
    question: 'How do I block someone?',
    answer:
      'To block a user:\n1. Go to their profile\n2. Tap the menu button (...)\n3. Select "Block User"\n\nBlocked users cannot:\n• See your profile or stories\n• Send you messages\n• Invite you to events\n• See your activity',
  },
  {
    id: '15',
    category: 'Privacy',
    question: 'Is my location shared?',
    answer:
      'Your exact location is never shared without permission. Location features:\n• Event locations are shown to attendees\n• Nearby events show distance, not your location\n• You can disable location services in settings\n• Live location sharing requires explicit consent',
  },
  {
    id: '16',
    category: 'Privacy',
    question: 'How do I report inappropriate content?',
    answer:
      'To report content:\n• Press and hold on any post, story, or message\n• Select "Report"\n• Choose the reason for reporting\n• Add additional details if needed\n\nOur team reviews all reports within 24 hours.',
  },

  // Account & Settings
  {
    id: '17',
    category: 'Account',
    question: 'How do I change my phone number?',
    answer:
      'Currently, phone numbers cannot be changed directly in the app for security reasons. Please contact support at support@andfriends.app to update your phone number.',
  },
  {
    id: '18',
    category: 'Account',
    question: 'Can I have multiple accounts?',
    answer:
      "Each phone number can only be associated with one account. We don't support multiple accounts per user to maintain authenticity and trust in the community.",
  },
  {
    id: '19',
    category: 'Account',
    question: 'How do I delete my account?',
    answer:
      'To delete your account:\n1. Go to Settings\n2. Tap "Account"\n3. Select "Delete my account"\n4. Follow the confirmation steps\n\nWarning: This permanently deletes all your data including events, messages, and stories.',
  },

  // Troubleshooting
  {
    id: '20',
    category: 'Troubleshooting',
    question: "I'm not receiving notifications",
    answer:
      'To fix notification issues:\n1. Check Settings > Notifications in the app\n2. Enable notifications in your phone settings\n3. Make sure Do Not Disturb is off\n4. Try logging out and back in\n5. Update to the latest app version',
  },
  {
    id: '21',
    category: 'Troubleshooting',
    question: 'The app is running slowly',
    answer:
      'To improve performance:\n• Close and reopen the app\n• Clear the app cache in your phone settings\n• Check your internet connection\n• Update to the latest version\n• Free up storage space on your device',
  },
  {
    id: '22',
    category: 'Troubleshooting',
    question: "I can't upload photos/videos",
    answer:
      'If uploads are failing:\n• Check your internet connection\n• Ensure the app has photo/camera permissions\n• Try reducing file size (photos under 10MB, videos under 100MB)\n• Clear app cache and try again\n• Make sure you have enough storage',
  },
];

const categories = [
  'All',
  'Getting Started',
  'Events',
  'Stories',
  'Messages',
  'Privacy',
  'Account',
  'Troubleshooting',
];

export default function HelpFAQScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const filteredFAQ = faqData.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle-outline" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryTab, selectedCategory === category && styles.categoryTabActive]}
            onPress={() => {
              setSelectedCategory(category);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAQ List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredFAQ.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try searching with different keywords</Text>
          </View>
        ) : (
          filteredFAQ.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.faqItem}
              onPress={() => toggleExpanded(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={expandedItems.includes(item.id) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#8E8E93"
                />
              </View>
              {expandedItems.includes(item.id) && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Contact Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Still need help?</Text>
          <Text style={styles.supportText}>
            Our support team is here to help you with any questions not covered in the FAQ.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => router.back()}>
            <Ionicons name="mail-outline" size={20} color="#007AFF" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F8F8',
    height: 44,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  categoriesContainer: {
    maxHeight: 44,
    marginTop: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
  },
  supportSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
