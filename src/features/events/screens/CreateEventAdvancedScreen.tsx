// import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { format } from 'date-fns';
// import * as Haptics from 'expo-haptics';
// import * as ImagePicker from 'expo-image-picker';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import React, { useRef, useState } from 'react';
// import {
//   Alert,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Switch,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';

// import { useEvents } from '@/hooks/useEvents';
// import { useSupabaseStorage } from '@/shared/hooks/useSupabaseStorage';

// const categories = [
//   { id: 'sports', name: 'Sports', icon: 'basketball', color: '#4CAF50' },
//   { id: 'music', name: 'Music', icon: 'musical-notes', color: '#FF6B6B' },
//   { id: 'arts', name: 'Arts', icon: 'color-palette', color: '#9C27B0' },
//   { id: 'food', name: 'Food', icon: 'restaurant', color: '#FF9800' },
//   { id: 'gaming', name: 'Gaming', icon: 'game-controller', color: '#2196F3' },
//   { id: 'social', name: 'Social', icon: 'people', color: '#45B7D1' },
// ];

// const coverStyles = [
//   { id: 'gradient1', colors: ['#FF6B6B', '#FF8787'] as const },
//   { id: 'gradient2', colors: ['#4ECDC4', '#44A3AA'] as const },
//   { id: 'gradient3', colors: ['#45B7D1', '#3498DB'] as const },
//   { id: 'gradient4', colors: ['#96CEB4', '#88C999'] as const },
//   { id: 'gradient5', colors: ['#DDA0DD', '#BA55D3'] as const },
// ];

// export default function CreateEventAdvancedScreen() {
//   const router = useRouter();
//   const { createEvent } = useEvents();
//   const { uploadImage } = useSupabaseStorage();

//   const [step, setStep] = useState(1);
//   const [title, setTitle] = useState('');
//   const [subtitle, setSubtitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [category, setCategory] = useState('');
//   const [date, setDate] = useState(new Date());
//   const [time, setTime] = useState(new Date());
//   const [location, setLocation] = useState('');
//   const [address, setAddress] = useState('');
//   const [coverImage, setCoverImage] = useState<string | null>(null);
//   const [selectedCoverStyle, setSelectedCoverStyle] = useState(coverStyles[0]);
//   const [inviteOnly, setInviteOnly] = useState(false);
//   const [maxParticipants, setMaxParticipants] = useState('');
//   const [coHosts] = useState<string[]>([]);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [showTimePicker, setShowTimePicker] = useState(false);
//   const [creating, setCreating] = useState(false);

//   const scrollRef = useRef<ScrollView>(null);

//   const handleNextStep = () => {
//     if (step === 1 && (!title || !category)) {
//       Alert.alert('Missing Information', 'Please fill in the title and select a category.');
//       return;
//     }
//     if (step === 2 && !location) {
//       Alert.alert('Missing Information', 'Please add a location for your event.');
//       return;
//     }

//     if (step < 4) {
//       setStep(step + 1);
//       scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
//     }
//   };

//   const handlePreviousStep = () => {
//     if (step > 1) {
//       setStep(step - 1);
//       scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
//     }
//   };

//   const handlePickImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       allowsEditing: true,
//       aspect: [16, 9],
//       quality: 0.8,
//     });

//     if (!result.canceled && result.assets[0]) {
//       setCoverImage(result.assets[0].uri);
//     }
//   };

//   const handleCreateEvent = async () => {
//     setCreating(true);

//     try {
//       let coverUrl = null;

//       if (coverImage && coverImage.startsWith('file://')) {
//         const uploadResult = await uploadImage(coverImage, 'events');
//         if (uploadResult) {
//           coverUrl = uploadResult;
//         }
//       }

//       const eventData = {
//         title,
//         subtitle,
//         description,
//         category,
//         date: format(date, 'yyyy-MM-dd'),
//         time: format(time, 'HH:mm'),
//         location,
//         address,
//         cover_url: coverUrl || undefined,
//         invite_only: inviteOnly,
//         max_participants: maxParticipants ? parseInt(maxParticipants) : undefined,
//         co_hosts: coHosts,
//       };

//       const { error } = await createEvent(eventData);

//       if (error) {
//         Alert.alert('Error', 'Failed to create event. Please try again.');
//       } else {
//         void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//         router.push(
//           'EventConfirmation' as never,
//           {
//             eventId: 'new',
//             eventTitle: title,
//             eventDate: format(date, 'PPP'),
//           } as never
//         );
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Something went wrong. Please try again.');
//     } finally {
//       setCreating(false);
//     }
//   };

//   const renderStepIndicator = () => (
//     <View style={styles.stepIndicator}>
//       {[1, 2, 3, 4].map((stepNumber) => (
//         <View key={stepNumber} style={styles.stepItem}>
//           <View style={[styles.stepCircle, step >= stepNumber && styles.stepCircleActive]}>
//             <Text style={[styles.stepNumber, step >= stepNumber && styles.stepNumberActive]}>
//               {stepNumber}
//             </Text>
//           </View>
//           {stepNumber < 4 && (
//             <View style={[styles.stepLine, step > stepNumber && styles.stepLineActive]} />
//           )}
//         </View>
//       ))}
//     </View>
//   );

//   const renderStep1 = () => (
//     <View style={styles.stepContent}>
//       <Text style={styles.stepTitle}>Basic Information</Text>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Event Title *</Text>
//         <TextInput
//           style={styles.input}
//           value={title}
//           onChangeText={setTitle}
//           placeholder="Give your event a catchy title"
//           placeholderTextColor="#999"
//         />
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Subtitle</Text>
//         <TextInput
//           style={styles.input}
//           value={subtitle}
//           onChangeText={setSubtitle}
//           placeholder="Add a brief tagline (optional)"
//           placeholderTextColor="#999"
//         />
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Category *</Text>
//         <View style={styles.categoryGrid}>
//           {categories.map((cat) => (
//             <TouchableOpacity
//               key={cat.id}
//               style={[
//                 styles.categoryCard,
//                 category === cat.id && styles.categoryCardActive,
//                 { borderColor: cat.color },
//               ]}
//               onPress={() => setCategory(cat.id)}
//             >
//               <Ionicons
//                 name={cat.icon as any}
//                 size={24}
//                 color={category === cat.id ? 'white' : cat.color}
//               />
//               <Text style={[styles.categoryName, category === cat.id && styles.categoryNameActive]}>
//                 {cat.name}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Description</Text>
//         <TextInput
//           style={[styles.input, styles.textArea]}
//           value={description}
//           onChangeText={setDescription}
//           placeholder="Tell people what your event is about..."
//           placeholderTextColor="#999"
//           multiline
//           numberOfLines={4}
//         />
//       </View>
//     </View>
//   );

//   const renderStep2 = () => (
//     <View style={styles.stepContent}>
//       <Text style={styles.stepTitle}>Date & Location</Text>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Date *</Text>
//         <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
//           <Ionicons name="calendar-outline" size={20} color="#666" />
//           <Text style={styles.dateText}>{format(date, 'EEEE, MMMM d, yyyy')}</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Time *</Text>
//         <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
//           <Ionicons name="time-outline" size={20} color="#666" />
//           <Text style={styles.dateText}>{format(time, 'h:mm a')}</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Location Name *</Text>
//         <TextInput
//           style={styles.input}
//           value={location}
//           onChangeText={setLocation}
//           placeholder="e.g., Central Park, John's House"
//           placeholderTextColor="#999"
//         />
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Address</Text>
//         <TextInput
//           style={styles.input}
//           value={address}
//           onChangeText={setAddress}
//           placeholder="Full address (optional)"
//           placeholderTextColor="#999"
//         />
//       </View>

//       <TouchableOpacity style={styles.mapButton}>
//         <Ionicons name="map-outline" size={20} color="#45B7D1" />
//         <Text style={styles.mapButtonText}>Choose on Map</Text>
//       </TouchableOpacity>
//     </View>
//   );

//   const renderStep3 = () => (
//     <View style={styles.stepContent}>
//       <Text style={styles.stepTitle}>Cover & Style</Text>

//       <View style={styles.coverPreview}>
//         {coverImage ? (
//           <Image source={{ uri: coverImage }} style={styles.coverImage} />
//         ) : (
//           <LinearGradient
//             colors={selectedCoverStyle?.colors || ['#FF6B6B', '#FF8E53']}
//             style={styles.coverPlaceholder}
//           >
//             <Text style={styles.coverTitle}>{title || 'Your Event'}</Text>
//             {subtitle && <Text style={styles.coverSubtitle}>{subtitle}</Text>}
//           </LinearGradient>
//         )}
//       </View>

//       <View style={styles.coverOptions}>
//         <TouchableOpacity style={styles.coverOption} onPress={handlePickImage}>
//           <Ionicons name="image-outline" size={24} color="#45B7D1" />
//           <Text style={styles.coverOptionText}>Upload Image</Text>
//         </TouchableOpacity>

//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.gradientOptions}
//         >
//           {coverStyles.map((style) => (
//             <TouchableOpacity
//               key={style.id}
//               onPress={() => {
//                 setSelectedCoverStyle(style);
//                 setCoverImage(null);
//               }}
//             >
//               <LinearGradient
//                 colors={style.colors}
//                 style={[
//                   styles.gradientOption,
//                   selectedCoverStyle?.id === style.id && styles.gradientOptionActive,
//                 ]}
//               />
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>
//     </View>
//   );

//   const renderStep4 = () => (
//     <View style={styles.stepContent}>
//       <Text style={styles.stepTitle}>Additional Settings</Text>

//       <View style={styles.settingItem}>
//         <View style={styles.settingInfo}>
//           <Text style={styles.settingLabel}>Invite-Only Event</Text>
//           <Text style={styles.settingDescription}>Only people you invite can see and join</Text>
//         </View>
//         <Switch
//           value={inviteOnly}
//           onValueChange={setInviteOnly}
//           trackColor={{ false: '#e0e0e0', true: '#45B7D1' }}
//           thumbColor="white"
//         />
//       </View>

//       <View style={styles.inputGroup}>
//         <Text style={styles.label}>Max Participants (Optional)</Text>
//         <TextInput
//           style={styles.input}
//           value={maxParticipants}
//           onChangeText={setMaxParticipants}
//           placeholder="Leave empty for unlimited"
//           placeholderTextColor="#999"
//           keyboardType="numeric"
//         />
//       </View>

//       <View style={styles.previewSection}>
//         <Text style={styles.previewTitle}>Event Preview</Text>
//         <View style={styles.previewCard}>
//           {coverImage ? (
//             <Image source={{ uri: coverImage }} style={styles.previewImage} />
//           ) : (
//             <LinearGradient
//               colors={selectedCoverStyle?.colors || ['#FF6B6B', '#FF8E53']}
//               style={styles.previewImage}
//             />
//           )}
//           <View style={styles.previewInfo}>
//             <Text style={styles.previewEventTitle}>{title}</Text>
//             <Text style={styles.previewEventDate}>
//               {format(date, 'MMM d')} • {format(time, 'h:mm a')}
//             </Text>
//             <Text style={styles.previewEventLocation}>{location}</Text>
//           </View>
//         </View>
//       </View>
//     </View>
//   );

//   return (
//     <KeyboardAvoidingView
//       style={styles.container}
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//     >
//       <LinearGradient colors={['#45B7D1', '#3498DB']} style={styles.header}>
//         <View style={styles.headerContent}>
//           <TouchableOpacity onPress={() => router.back()}>
//             <Ionicons name="close" size={28} color="white" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Create Event</Text>
//           <View style={{ width: 28 }} />
//         </View>
//         {renderStepIndicator()}
//       </LinearGradient>

//       <ScrollView
//         ref={scrollRef}
//         style={styles.scrollView}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.scrollContent}
//       >
//         {step === 1 && renderStep1()}
//         {step === 2 && renderStep2()}
//         {step === 3 && renderStep3()}
//         {step === 4 && renderStep4()}
//       </ScrollView>

//       <View style={styles.footer}>
//         {step > 1 && (
//           <TouchableOpacity style={styles.backButton} onPress={handlePreviousStep}>
//             <Ionicons name="arrow-back" size={20} color="#666" />
//             <Text style={styles.backButtonText}>Back</Text>
//           </TouchableOpacity>
//         )}

//         {step < 4 ? (
//           <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
//             <Text style={styles.nextButtonText}>Next</Text>
//             <Ionicons name="arrow-forward" size={20} color="white" />
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity
//             style={[styles.createButton, creating && styles.createButtonDisabled]}
//             onPress={handleCreateEvent}
//             disabled={creating}
//           >
//             <Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create Event'}</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {showDatePicker && (
//         <DateTimePicker
//           value={date}
//           mode="date"
//           minimumDate={new Date()}
//           onChange={(_, selectedDate) => {
//             setShowDatePicker(false);
//             if (selectedDate) setDate(selectedDate);
//           }}
//         />
//       )}

//       {showTimePicker && (
//         <DateTimePicker
//           value={time}
//           mode="time"
//           onChange={(_, selectedTime) => {
//             setShowTimePicker(false);
//             if (selectedTime) setTime(selectedTime);
//           }}
//         />
//       )}
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f8f8',
//   },
//   header: {
//     paddingTop: 60,
//     paddingBottom: 20,
//   },
//   headerContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     marginBottom: 20,
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: 'white',
//   },
//   stepIndicator: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   stepItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   stepCircle: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   stepCircleActive: {
//     backgroundColor: 'white',
//   },
//   stepNumber: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: 'rgba(255, 255, 255, 0.7)',
//   },
//   stepNumberActive: {
//     color: '#45B7D1',
//   },
//   stepLine: {
//     flex: 1,
//     height: 2,
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     marginHorizontal: 8,
//   },
//   stepLineActive: {
//     backgroundColor: 'white',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingBottom: 100,
//   },
//   stepContent: {
//     paddingHorizontal: 20,
//     paddingTop: 30,
//   },
//   stepTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#333',
//     marginBottom: 30,
//   },
//   inputGroup: {
//     marginBottom: 25,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#666',
//     marginBottom: 8,
//   },
//   input: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#333',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.05,
//     shadowRadius: 5,
//     elevation: 2,
//   },
//   textArea: {
//     height: 100,
//     textAlignVertical: 'top',
//   },
//   categoryGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   categoryCard: {
//     width: '31%',
//     aspectRatio: 1,
//     backgroundColor: 'white',
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#e0e0e0',
//     gap: 8,
//   },
//   categoryCardActive: {
//     backgroundColor: '#45B7D1',
//     borderColor: '#45B7D1',
//   },
//   categoryName: {
//     fontSize: 12,
//     fontWeight: '500',
//     color: '#666',
//   },
//   categoryNameActive: {
//     color: 'white',
//   },
//   dateButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'white',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     gap: 12,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.05,
//     shadowRadius: 5,
//     elevation: 2,
//   },
//   dateText: {
//     fontSize: 16,
//     color: '#333',
//   },
//   mapButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     gap: 8,
//   },
//   mapButtonText: {
//     fontSize: 16,
//     color: '#45B7D1',
//     fontWeight: '500',
//   },
//   coverPreview: {
//     height: 200,
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 5,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   coverImage: {
//     width: '100%',
//     height: '100%',
//     resizeMode: 'cover',
//   },
//   coverPlaceholder: {
//     width: '100%',
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   coverTitle: {
//     fontSize: 28,
//     fontFamily: 'PlayfairDisplay-Bold',
//     color: 'white',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   coverSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255, 255, 255, 0.9)',
//     textAlign: 'center',
//   },
//   coverOptions: {
//     gap: 20,
//   },
//   coverOption: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'white',
//     borderRadius: 12,
//     paddingVertical: 16,
//     gap: 10,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.05,
//     shadowRadius: 5,
//     elevation: 2,
//   },
//   coverOptionText: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#45B7D1',
//   },
//   gradientOptions: {
//     flexDirection: 'row',
//   },
//   gradientOption: {
//     width: 60,
//     height: 60,
//     borderRadius: 12,
//     marginRight: 12,
//   },
//   gradientOptionActive: {
//     borderWidth: 3,
//     borderColor: 'white',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.2,
//     shadowRadius: 5,
//     elevation: 3,
//   },
//   settingItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.05,
//     shadowRadius: 5,
//     elevation: 2,
//   },
//   settingInfo: {
//     flex: 1,
//   },
//   settingLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   settingDescription: {
//     fontSize: 14,
//     color: '#666',
//   },
//   previewSection: {
//     marginTop: 30,
//   },
//   previewTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 15,
//   },
//   previewCard: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 5,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   previewImage: {
//     width: '100%',
//     height: 120,
//     resizeMode: 'cover',
//   },
//   previewInfo: {
//     padding: 16,
//   },
//   previewEventTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#333',
//     marginBottom: 8,
//   },
//   previewEventDate: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 4,
//   },
//   previewEventLocation: {
//     fontSize: 14,
//     color: '#666',
//   },
//   footer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingTop: 20,
//     paddingBottom: 40,
//     backgroundColor: '#f8f8f8',
//     borderTopWidth: 1,
//     borderTopColor: '#e0e0e0',
//   },
//   backButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     gap: 8,
//   },
//   backButtonText: {
//     fontSize: 16,
//     color: '#666',
//     fontWeight: '500',
//   },
//   nextButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#45B7D1',
//     paddingHorizontal: 30,
//     paddingVertical: 16,
//     borderRadius: 30,
//     gap: 8,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 5,
//     },
//     shadowOpacity: 0.2,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   nextButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: 'white',
//   },
//   createButton: {
//     flex: 1,
//     backgroundColor: '#45B7D1',
//     paddingVertical: 16,
//     borderRadius: 30,
//     alignItems: 'center',
//     marginLeft: 60,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 5,
//     },
//     shadowOpacity: 0.2,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   createButtonDisabled: {
//     opacity: 0.6,
//   },
//   createButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: 'white',
//   },
// });
