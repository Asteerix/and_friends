import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'react-native-pixel-perfect';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const DISCO_IMAGE = require('@/assets/images/events/event_logo.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = perfectSize(540); // Ajuste selon besoin

const CreateEventScreen: React.FC = React.memo(() => {
  const [inviteOnly, setInviteOnly] = React.useState(true);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cover section */}
        <View style={styles.coverContainer}>
          <View style={[styles.headerRow, { paddingTop: insets.top + perfectSize(8) }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={perfectSize(24)} color="#222" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Event</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.headerCircle}
                accessibilityRole="button"
                accessibilityLabel="Chat"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={perfectSize(20)} color="#222" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerCircle}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={perfectSize(20)} color="#222" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.blueCardContent}>
            <Text style={styles.title} accessibilityRole="header">
              Add Your Title
            </Text>
            <Text style={styles.subtitle}>
              Drop a fun little punchline to get the crew hyped for what's coming.
            </Text>
            <View style={styles.discoWrap}>
              <Image
                source={DISCO_IMAGE}
                style={styles.discoImg}
                resizeMode="contain"
                accessibilityLabel="Disco Ball"
              />
              <Ionicons
                name="sparkles"
                size={perfectSize(24)}
                color="#222"
                style={styles.sparkle1}
              />
              <Ionicons
                name="sparkles"
                size={perfectSize(20)}
                color="#222"
                style={styles.sparkle2}
              />
            </View>
            <TouchableOpacity
              style={styles.editCoverBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit Cover"
            >
              <Ionicons
                name="pencil-outline"
                size={perfectSize(18)}
                color="#222"
                style={{ marginRight: perfectSize(6) }}
              />
              <Text style={styles.editCoverText}>Edit Cover</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* White form section */}
        <View style={styles.formSectionWrapper}>
          <View style={styles.formSection}>
            <Text style={styles.label}>Date & Time</Text>
            <View style={styles.rowGap}>
              <TouchableOpacity
                style={styles.inputBtn}
                accessibilityRole="button"
                accessibilityLabel="Select date"
              >
                <Text style={styles.inputBtnText}>Select date</Text>
                <Ionicons name="calendar-outline" size={perfectSize(18)} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inputBtn}
                accessibilityRole="button"
                accessibilityLabel="Select time"
              >
                <Text style={styles.inputBtnText}>Select time</Text>
                <Ionicons name="time-outline" size={perfectSize(18)} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputIconWrap}>
              <TextInput
                style={styles.input}
                placeholder="Add location"
                placeholderTextColor="#999"
                accessibilityLabel="Add location"
              />
              <Ionicons
                name="location-outline"
                size={perfectSize(18)}
                color="#999"
                style={styles.inputIcon}
              />
            </View>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add schedule, notes, or other details"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              accessibilityLabel="Add schedule, notes, or other details"
            />
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.input}
              placeholder="Add up to 3 tags to describe your event"
              placeholderTextColor="#999"
              accessibilityLabel="Add up to 3 tags to describe your event"
            />
            <Text style={styles.label}>Customize</Text>
            <TouchableOpacity
              style={styles.inputBtnFull}
              accessibilityRole="button"
              accessibilityLabel="Add Extra Details"
            >
              <Ionicons
                name="reorder-three-outline"
                size={perfectSize(18)}
                color="#222"
                style={{ marginRight: perfectSize(8) }}
              />
              <Text style={styles.inputBtnText}>Add Extra Details</Text>
              <Ionicons
                name="chevron-forward"
                size={perfectSize(18)}
                color="#999"
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>
            <Text style={styles.label}>Privacy</Text>
            <View style={styles.privacyRow}>
              <View>
                <Text style={styles.privacyTitle}>Invite-Only Event</Text>
                <Text style={styles.privacyDesc}>Only invited guests can view</Text>
              </View>
              <Switch
                value={inviteOnly}
                onValueChange={setInviteOnly}
                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                thumbColor={inviteOnly ? '#fff' : '#fff'}
                ios_backgroundColor="#E5E5E5"
                accessibilityLabel="Invite-Only Event"
              />
            </View>
          </View>
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.draftBtn}
              accessibilityRole="button"
              accessibilityLabel="Save as Draft"
            >
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.publishBtn}
              accessibilityRole="button"
              accessibilityLabel="Publish"
            >
              <Text style={styles.publishBtnText}>Publish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingBottom: perfectSize(80),
  },
  coverContainer: {
    width: SCREEN_WIDTH,
    minHeight: COVER_HEIGHT,
    backgroundColor: '#B3E0FF',
    borderBottomLeftRadius: perfectSize(32),
    borderBottomRightRadius: perfectSize(32),
    overflow: 'hidden',
    marginBottom: -perfectSize(32), // pour coller la section blanche
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: perfectSize(16),
    marginBottom: perfectSize(8),
  },
  headerTitle: {
    fontSize: perfectSize(18),
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'System' }),
    color: '#222',
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: perfectSize(8),
  },
  headerCircle: {
    width: perfectSize(32),
    height: perfectSize(32),
    borderRadius: perfectSize(16),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: perfectSize(8),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  blueCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: perfectSize(12),
    paddingHorizontal: perfectSize(12),
  },
  title: {
    fontSize: perfectSize(28),
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'System' }),
    color: '#222',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: perfectSize(8),
  },
  subtitle: {
    fontSize: perfectSize(14),
    color: '#444',
    textAlign: 'center',
    marginBottom: perfectSize(16),
  },
  discoWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: perfectSize(12),
  },
  discoImg: {
    width: perfectSize(160),
    height: perfectSize(160),
  },
  sparkle1: {
    position: 'absolute',
    left: perfectSize(32),
    top: perfectSize(24),
  },
  sparkle2: {
    position: 'absolute',
    right: perfectSize(32),
    bottom: perfectSize(32),
  },
  editCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: perfectSize(10),
    paddingHorizontal: perfectSize(18),
    paddingVertical: perfectSize(8),
    alignSelf: 'center',
    marginTop: perfectSize(8),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  editCoverText: {
    fontSize: perfectSize(15),
    color: '#222',
    fontWeight: '500',
  },
  formSectionWrapper: {
    backgroundColor: '#fff',
    borderTopLeftRadius: perfectSize(32),
    borderTopRightRadius: perfectSize(32),
    marginTop: 0,
    paddingTop: perfectSize(32),
    // shadow for iOS
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formSection: {
    marginHorizontal: perfectSize(16),
    marginTop: perfectSize(8),
    marginBottom: perfectSize(16),
  },
  label: {
    fontSize: perfectSize(15),
    color: '#222',
    fontWeight: '600',
    marginBottom: perfectSize(6),
    marginTop: perfectSize(12),
  },
  rowGap: {
    flexDirection: 'row',
    gap: perfectSize(12),
    marginBottom: perfectSize(8),
  },
  inputBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: perfectSize(12),
    backgroundColor: '#fff',
    paddingHorizontal: perfectSize(14),
    paddingVertical: perfectSize(14),
    marginRight: perfectSize(4),
  },
  inputBtnText: {
    fontSize: perfectSize(15),
    color: '#222',
    flex: 1,
  },
  inputIconWrap: {
    position: 'relative',
    marginBottom: perfectSize(8),
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: perfectSize(12),
    backgroundColor: '#fff',
    paddingHorizontal: perfectSize(14),
    paddingVertical: perfectSize(14),
    fontSize: perfectSize(15),
    color: '#222',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    right: perfectSize(16),
    top: perfectSize(16),
  },
  textArea: {
    minHeight: perfectSize(80),
    textAlignVertical: 'top',
    marginBottom: perfectSize(8),
  },
  inputBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: perfectSize(12),
    backgroundColor: '#fff',
    paddingHorizontal: perfectSize(14),
    paddingVertical: perfectSize(14),
    marginBottom: perfectSize(8),
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: perfectSize(12),
    paddingHorizontal: perfectSize(14),
    paddingVertical: perfectSize(14),
    marginTop: perfectSize(8),
    marginBottom: perfectSize(16),
  },
  privacyTitle: {
    fontSize: perfectSize(15),
    color: '#222',
    fontWeight: '600',
  },
  privacyDesc: {
    fontSize: perfectSize(13),
    color: '#888',
    marginTop: perfectSize(2),
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: perfectSize(16),
    marginTop: perfectSize(8),
    marginBottom: perfectSize(32),
    gap: perfectSize(12),
  },
  draftBtn: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: perfectSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: perfectSize(16),
    marginRight: perfectSize(8),
  },
  draftBtnText: {
    color: '#222',
    fontSize: perfectSize(16),
    fontWeight: '500',
  },
  publishBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: perfectSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: perfectSize(16),
    marginLeft: perfectSize(8),
  },
  publishBtnText: {
    color: '#fff',
    fontSize: perfectSize(16),
    fontWeight: '600',
  },
});

export default CreateEventScreen;
