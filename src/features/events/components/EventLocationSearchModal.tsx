import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { hereApiService, type LocationSearchResult } from '../../../services/hereApi';

interface EventLocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: LocationSearchResult) => void;
  currentLocation?: string;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  primary: '#007AFF',
  error: '#FF3B30',
};

export default function EventLocationSearchModal({
  visible,
  onClose,
  onSelect,
  // currentLocation,
}: EventLocationSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationSearchResult[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Manual entry fields
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualPostalCode, setManualPostalCode] = useState('');
  const [manualCountry, setManualCountry] = useState('');

  // Search for locations using HERE API
  const handleSearch = async (query: string) => {
    console.log('🔍 EventLocationSearchModal - Starting search for:', query);
    
    if (!query.trim()) {
      console.log('❌ Empty query, clearing results');
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('📡 Calling HERE API...');
      // Use HERE API to search for locations
      // You can optionally pass a location bias (e.g., user's current location)
      const results = await hereApiService.searchLocations(query);
      console.log('✅ HERE API returned', results.length, 'results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Error searching locations:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      void handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (location: LocationSearchResult) => {
    console.log('📍 Location selected:', location);
    console.log('  - Name:', location.name);
    console.log('  - Address:', location.address);
    console.log('  - City:', location.city);
    console.log('  - Coordinates:', location.coordinates);
    
    onSelect(location);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Add to recent locations
    setRecentLocations(prev => {
      const filtered = prev.filter(loc => loc.id !== location.id);
      return [location, ...filtered].slice(0, 5);
    });
    
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualName.trim() || !manualAddress.trim() || !manualCity.trim()) {
      return;
    }

    const manualLocation: LocationSearchResult = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      address: manualAddress.trim(),
      city: manualCity.trim(),
      postalCode: manualPostalCode.trim(),
      country: manualCountry.trim() || 'USA',
    };

    handleSelectLocation(manualLocation);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowManualEntry(false);
    setManualName('');
    setManualAddress('');
    setManualCity('');
    setManualPostalCode('');
    setManualCountry('');
    onClose();
  };

  const formatLocationDisplay = (location: LocationSearchResult) => {
    const parts = [location.address];
    if (location.city) parts.push(location.city);
    if (location.postalCode) parts.push(location.postalCode);
    if (location.country) parts.push(location.country);
    return parts.join(', ');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContent, { paddingBottom: insets.bottom || 20 }]}
          keyboardVerticalOffset={0}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Event Location</Text>
            <Text style={styles.subtitle}>Search for a place or enter an address</Text>
            <Text style={styles.poweredBy}>Powered by HERE Maps</Text>
          </View>

          {!showManualEntry ? (
            <>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={20} color={COLORS.grey2} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search places, addresses, postal codes..."
                    placeholderTextColor={COLORS.grey1}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.grey1} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Search Results */}
              <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
                {isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                ) : searchQuery.length > 0 && searchResults.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="location-outline" size={48} color={COLORS.grey1} />
                    <Text style={styles.emptyStateText}>No locations found</Text>
                    <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
                  </View>
                ) : searchQuery.length > 0 ? (
                  searchResults.map((location) => (
                    <Pressable
                      key={location.id}
                      style={styles.locationItem}
                      onPress={() => handleSelectLocation(location)}
                    >
                      <View style={styles.locationIcon}>
                        <Ionicons name="location" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationName}>{location.name}</Text>
                        <Text style={styles.locationAddress}>
                          {formatLocationDisplay(location)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.grey1} />
                    </Pressable>
                  ))
                ) : recentLocations.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>Recent Locations</Text>
                    {recentLocations.map((location) => (
                      <Pressable
                        key={location.id}
                        style={styles.locationItem}
                        onPress={() => handleSelectLocation(location)}
                      >
                        <View style={styles.locationIcon}>
                          <Ionicons name="time-outline" size={24} color={COLORS.grey2} />
                        </View>
                        <View style={styles.locationInfo}>
                          <Text style={styles.locationName}>{location.name}</Text>
                          <Text style={styles.locationAddress}>
                            {formatLocationDisplay(location)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.grey1} />
                      </Pressable>
                    ))}
                  </>
                ) : null}

                {/* Manual Entry Button */}
                <Pressable
                  style={styles.manualEntryButton}
                  onPress={() => {
                    setShowManualEntry(true);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.manualEntryText}>Enter address manually</Text>
                </Pressable>
              </ScrollView>
            </>
          ) : (
            /* Manual Entry Form */
            <ScrollView style={styles.manualForm} showsVerticalScrollIndicator={false}>
              <Pressable
                style={styles.backButton}
                onPress={() => setShowManualEntry(false)}
              >
                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                <Text style={styles.backButtonText}>Back to search</Text>
              </Pressable>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Location name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Central Park, My House"
                  placeholderTextColor={COLORS.grey1}
                  value={manualName}
                  onChangeText={setManualName}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Street address *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 123 Main Street"
                  placeholderTextColor={COLORS.grey1}
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 2, marginRight: 12 }]}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., New York"
                    placeholderTextColor={COLORS.grey1}
                    value={manualCity}
                    onChangeText={setManualCity}
                    returnKeyType="next"
                  />
                </View>

                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Postal code</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., 10001"
                    placeholderTextColor={COLORS.grey1}
                    value={manualPostalCode}
                    onChangeText={setManualPostalCode}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Country</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., USA"
                  placeholderTextColor={COLORS.grey1}
                  value={manualCountry}
                  onChangeText={setManualCountry}
                  returnKeyType="done"
                />
              </View>

              <Text style={styles.requiredNote}>* Required fields</Text>
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            {showManualEntry && (
              <Pressable
                style={[
                  styles.confirmButton,
                  (!manualName.trim() || !manualAddress.trim() || !manualCity.trim()) && 
                  styles.confirmButtonDisabled
                ]}
                onPress={handleManualSubmit}
                disabled={!manualName.trim() || !manualAddress.trim() || !manualCity.trim()}
              >
                <Text style={styles.confirmButtonText}>Add Location</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    height: '85%', // Changed from maxHeight to fixed height for better visibility
    minHeight: '70%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.grey0,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.grey2,
  },
  poweredBy: {
    fontSize: 12,
    color: COLORS.grey1,
    marginTop: 4,
    fontStyle: 'italic',
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.grey2,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.grey2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grey2,
    marginBottom: 12,
    marginTop: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey0,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: COLORS.grey2,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    gap: 8,
  },
  manualEntryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  manualForm: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  formField: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.grey2,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
  },
  requiredNote: {
    fontSize: 12,
    color: COLORS.grey2,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey0,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.grey0,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  confirmButton: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: '#B3D1FF',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});