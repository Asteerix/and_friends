import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { create } from 'react-native-pixel-perfect';
import { Ionicons } from '@expo/vector-icons';
import UnderlineDecoration from '@/features/home/components/UnderlineDecoration.svg';
import EventCardNew from '@/features/home/components/EventCardNew';
import { useEventsAdvanced } from '@/hooks/useEventsAdvanced';
import { useSession } from '@/shared/providers/SessionContext';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const MyEventsScreen: React.FC = React.memo(() => {
  const router = useRouter();
  const { session } = useSession();
  const { events = [] } = useEventsAdvanced();
  const myEvents = events.filter((e) => e.created_by === session?.user?.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.createCard}>
              <View style={styles.createCardContent}>
                <Ionicons
                  name="add-circle"
                  size={perfectSize(40)}
                  color="#000"
                  style={styles.createIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.createTitle}
                    accessibilityRole="header"
                    accessibilityLabel="Create Event"
                  >
                    Create a new event
                  </Text>
                  <Text style={styles.createSubtitle}>Share something fun with your friends!</Text>
                </View>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => router.push('/create-event')}
                  accessibilityRole="button"
                  accessibilityLabel="Start creating a new event"
                >
                  <Ionicons name="chevron-forward" size={perfectSize(24)} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.underlineWrap}>
              <UnderlineDecoration width={perfectSize(56)} height={perfectSize(4)} />
            </View>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              My Events
            </Text>
          </>
        }
        data={myEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCardNew
            event={item as any}
            style={styles.eventCard}
            onPress={() =>
              router.push(`/features/events/screens/EventDetailsScreen?eventId=${item.id}`)
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events yet. Tap above to create your first event!</Text>
        }
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  createCard: {
    marginTop: perfectSize(24),
    marginHorizontal: perfectSize(20),
    backgroundColor: '#F5F5F7',
    borderRadius: perfectSize(16),
    padding: perfectSize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 4 : 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.15,
    shadowRadius: Platform.OS === 'ios' ? 12 : 4,
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  createCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createIcon: {
    marginRight: perfectSize(16),
  },
  createTitle: {
    fontSize: perfectSize(18),
    fontWeight: '700',
    color: '#000',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'System' }),
  },
  createSubtitle: {
    fontSize: perfectSize(14),
    color: '#666',
    marginTop: perfectSize(4),
  },
  createButton: {
    backgroundColor: '#000',
    borderRadius: perfectSize(24),
    width: perfectSize(40),
    height: perfectSize(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: perfectSize(12),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  underlineWrap: {
    alignItems: 'center',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(16),
  },
  sectionTitle: {
    fontSize: perfectSize(20),
    fontWeight: '700',
    color: '#000',
    marginLeft: perfectSize(20),
    marginBottom: perfectSize(12),
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'System' }),
  },
  listContent: {
    paddingBottom: perfectSize(40),
  },
  eventCard: {
    marginHorizontal: perfectSize(20),
    marginBottom: perfectSize(16),
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: perfectSize(16),
    marginTop: perfectSize(40),
  },
});

export default MyEventsScreen;
