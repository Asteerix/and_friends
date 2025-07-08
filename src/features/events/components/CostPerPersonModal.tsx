import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomModal from './BottomModal';
import { useProfile } from '@/hooks/useProfile';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CostItem {
  id: string;
  amount: string;
  currency: string;
  description: string;
}

interface CostPerPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (costs: CostItem[]) => void;
  initialCosts?: CostItem[];
}

// Currency mapping based on country
const CURRENCY_BY_COUNTRY: { [key: string]: string } = {
  'US': 'USD',
  'GB': 'GBP',
  'FR': 'EUR',
  'DE': 'EUR',
  'IT': 'EUR',
  'ES': 'EUR',
  'NL': 'EUR',
  'BE': 'EUR',
  'AT': 'EUR',
  'IE': 'EUR',
  'PT': 'EUR',
  'FI': 'EUR',
  'GR': 'EUR',
  'CA': 'CAD',
  'AU': 'AUD',
  'JP': 'JPY',
  'CN': 'CNY',
  'IN': 'INR',
  'BR': 'BRL',
  'MX': 'MXN',
  'CH': 'CHF',
  'SE': 'SEK',
  'NO': 'NOK',
  'DK': 'DKK',
  'KR': 'KRW',
  'SG': 'SGD',
  'HK': 'HKD',
  'NZ': 'NZD',
  'TH': 'THB',
  'ID': 'IDR',
  'MY': 'MYR',
  'PH': 'PHP',
  'VN': 'VND',
  'RU': 'RUB',
  'TR': 'TRY',
  'ZA': 'ZAR',
  'AE': 'AED',
  'SA': 'SAR',
  'IL': 'ILS',
  'EG': 'EGP',
  'PL': 'PLN',
  'CZ': 'CZK',
  'HU': 'HUF',
  'RO': 'RON',
};

// Currencies ordered by popularity
const ALL_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
];

// Examples sorted by popularity
const COST_EXAMPLES = [
  // Most common
  { label: '🍽️ Dinner', description: 'Restaurant dinner' },
  { label: '🍺 Drinks', description: 'Bar drinks' },
  { label: '🎫 Entry', description: 'Entry ticket' },
  { label: '🚕 Transport', description: 'Transportation' },
  { label: '🏨 Accommodation', description: 'Hotel/Airbnb' },
  { label: '🎂 Birthday', description: 'Birthday party' },
  { label: '🍕 Food', description: 'Food & snacks' },
  { label: '🎬 Movie', description: 'Movie tickets' },
  
  // Activities
  { label: '🎳 Bowling', description: 'Bowling' },
  { label: '🎤 Karaoke', description: 'Karaoke night' },
  { label: '🎯 Escape Room', description: 'Escape room' },
  { label: '🏌️ Golf', description: 'Mini golf' },
  { label: '🎮 Arcade', description: 'Arcade games' },
  { label: '🏎️ Go-Kart', description: 'Go-karting' },
  { label: '🎨 Paint & Sip', description: 'Paint and sip' },
  { label: '⛸️ Ice Skating', description: 'Ice skating' },
  
  // Food & Drinks
  { label: '🥂 Champagne', description: 'Champagne toast' },
  { label: '🍷 Wine', description: 'Wine tasting' },
  { label: '🍸 Cocktails', description: 'Cocktails' },
  { label: '☕ Coffee', description: 'Coffee meetup' },
  { label: '🥐 Brunch', description: 'Weekend brunch' },
  { label: '🍱 Lunch', description: 'Lunch' },
  { label: '🍰 Dessert', description: 'Cake & desserts' },
  { label: '🍜 Street Food', description: 'Street food tour' },
  
  // Entertainment
  { label: '🎭 Theater', description: 'Theater show' },
  { label: '🎵 Concert', description: 'Concert tickets' },
  { label: '🎪 Festival', description: 'Festival pass' },
  { label: '🎨 Museum', description: 'Museum entry' },
  { label: '🎡 Theme Park', description: 'Theme park' },
  { label: '🏛️ Tour', description: 'Guided tour' },
  { label: '🎪 Circus', description: 'Circus show' },
  { label: '🎭 Comedy', description: 'Comedy show' },
  
  // Party & Nightlife
  { label: '🍾 Bottle Service', description: 'Bottle service' },
  { label: '💃 Club', description: 'Club entry' },
  { label: '🎉 Party Supplies', description: 'Party supplies' },
  { label: '🎈 Decorations', description: 'Decorations' },
  { label: '🎵 DJ', description: 'DJ/Music' },
  { label: '📸 Photo Booth', description: 'Photo booth' },
  { label: '🎊 VIP Table', description: 'VIP table' },
  { label: '🍻 Bar Tab', description: 'Bar tab' },
  
  // Sports & Outdoor
  { label: '⚽ Sports Game', description: 'Sports tickets' },
  { label: '🏖️ Beach', description: 'Beach day' },
  { label: '⛺ Camping', description: 'Camping trip' },
  { label: '🚴 Bike Rental', description: 'Bike rental' },
  { label: '⛵ Boat', description: 'Boat rental' },
  { label: '🎿 Ski Pass', description: 'Ski pass' },
  { label: '🏊 Pool', description: 'Pool party' },
  { label: '🔥 BBQ', description: 'BBQ supplies' },
  
  // Special
  { label: '💐 Flowers', description: 'Flowers' },
  { label: '🎁 Gift', description: 'Group gift' },
  { label: '🚐 Bus Rental', description: 'Party bus' },
  { label: '🏠 Venue', description: 'Venue rental' },
  { label: '🎶 Band', description: 'Live band' },
  { label: '👗 Costume', description: 'Costume rental' },
  { label: '🍿 Snacks', description: 'Snacks & treats' },
  { label: '🎲 Casino', description: 'Casino night' },
];

export default function CostPerPersonModal({
  visible,
  onClose,
  onSave,
  initialCosts = [],
}: CostPerPersonModalProps) {
  const { profile } = useProfile();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [costs, setCosts] = useState<CostItem[]>(initialCosts);
  const [currencies, setCurrencies] = useState(ALL_CURRENCIES);

  // Get default currency based on user's country and reorder currencies
  useEffect(() => {
    if (profile?.location) {
      const countryCode = getCountryISOCode(profile.location);
      const userCurrency = CURRENCY_BY_COUNTRY[countryCode] || 'USD';
      setSelectedCurrency(userCurrency);
      
      // Reorder currencies to put user's currency first
      const reorderedCurrencies = [...ALL_CURRENCIES];
      const userCurrencyIndex = reorderedCurrencies.findIndex(c => c.code === userCurrency);
      if (userCurrencyIndex > 0) {
        const userCurrencyObj = reorderedCurrencies.splice(userCurrencyIndex, 1)[0];
        if (userCurrencyObj) {
          reorderedCurrencies.unshift(userCurrencyObj);
        }
      }
      setCurrencies(reorderedCurrencies);
    } else if (initialCosts.length > 0 && initialCosts[0]) {
      setSelectedCurrency(initialCosts[0].currency);
    }
  }, [profile?.location, initialCosts]);

  const getCountryISOCode = (location: string) => {
    if (!location) return 'US';
    
    const countryMappings: { [key: string]: string } = {
      'USA': 'US',
      'United States': 'US',
      'United States of America': 'US',
      'UK': 'GB',
      'United Kingdom': 'GB',
      'England': 'GB',
      'Scotland': 'GB',
      'Wales': 'GB',
      'Northern Ireland': 'GB',
      'Canada': 'CA',
      'Australia': 'AU',
      'France': 'FR',
      'Germany': 'DE',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Austria': 'AT',
      'Ireland': 'IE',
      'Portugal': 'PT',
      'Finland': 'FI',
      'Greece': 'GR',
      'Japan': 'JP',
      'China': 'CN',
      'India': 'IN',
      'Brazil': 'BR',
      'Mexico': 'MX',
      'Switzerland': 'CH',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'South Korea': 'KR',
      'Korea': 'KR',
      'Singapore': 'SG',
      'Hong Kong': 'HK',
      'New Zealand': 'NZ',
      'Thailand': 'TH',
      'Indonesia': 'ID',
      'Malaysia': 'MY',
      'Philippines': 'PH',
      'Vietnam': 'VN',
      'Russia': 'RU',
      'Turkey': 'TR',
      'South Africa': 'ZA',
      'UAE': 'AE',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      'Israel': 'IL',
      'Egypt': 'EG',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Romania': 'RO',
    };
    
    const parts = location.split(',');
    
    // Try last part first (usually country in "City, Country" format)
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1]?.trim() || '';
      if (countryMappings[lastPart]) {
        return countryMappings[lastPart];
      }
      if (lastPart.length === 2) {
        return lastPart.toUpperCase();
      }
    }
    
    // Try first part
    const firstPart = parts[0]?.trim() || '';
    if (countryMappings[firstPart]) {
      return countryMappings[firstPart];
    }
    
    return 'US';
  };

  const handleSave = () => {
    onSave(costs);
    onClose();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatAmount = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].substring(0, 2);
    }
    setAmount(cleaned);
  };

  const addCost = () => {
    if (!amount || parseFloat(amount) === 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Please describe what this cost is for');
      return;
    }

    const newCost: CostItem = {
      id: Date.now().toString(),
      amount,
      currency: selectedCurrency,
      description: description.trim(),
    };

    setCosts([...costs, newCost]);
    setAmount('');
    setDescription('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeCost = (costId: string) => {
    setCosts(costs.filter(cost => cost.id !== costId));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getCurrencySymbol = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    return currency?.symbol || code;
  };

  const getTotalAmount = () => {
    return costs.reduce((total, cost) => total + parseFloat(cost.amount || '0'), 0);
  };

  const selectExample = (example: typeof COST_EXAMPLES[0]) => {
    setDescription(example.description);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="💰 Cost Per Person"
      height={SCREEN_HEIGHT * 0.9}
      onSave={handleSave}
      saveButtonText={`Save ${costs.length > 0 ? `(${getCurrencySymbol(selectedCurrency)}${getTotalAmount().toFixed(2)})` : ''}`}
      scrollable={true}
    >
      <View style={styles.container}>
        {/* Currency Selector */}
        <View style={styles.currencySection}>
          <Text style={styles.sectionLabel}>Select Currency</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.currencyScroll}
          >
            {currencies.map((currency, index) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyOption,
                  selectedCurrency === currency.code && styles.currencySelected,
                  index === 0 && styles.firstCurrency
                ]}
                onPress={() => {
                  setSelectedCurrency(currency.code);
                  setCosts(costs.map(c => ({ ...c, currency: currency.code })));
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.currencySymbol,
                  selectedCurrency === currency.code && styles.currencySymbolSelected
                ]}>
                  {currency.symbol}
                </Text>
                <Text style={[
                  styles.currencyCode,
                  selectedCurrency === currency.code && styles.currencyCodeSelected
                ]}>
                  {currency.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencyPrefix}>{getCurrencySymbol(selectedCurrency)}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={formatAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#C7C7CC"
            />
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionLabel}>What's this for? <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the cost (required)"
            placeholderTextColor="#C7C7CC"
            maxLength={50}
          />
          
          {/* Examples */}
          <Text style={styles.examplesLabel}>Popular examples:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.examplesScroll}
          >
            {COST_EXAMPLES.map((example, index) => (
              <TouchableOpacity
                key={index}
                style={styles.exampleButton}
                onPress={() => selectExample(example)}
              >
                <Text style={styles.exampleText}>{example.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Add Button */}
        <TouchableOpacity 
          style={[
            styles.addButton, 
            (!amount || parseFloat(amount) === 0 || !description.trim()) && styles.addButtonDisabled
          ]}
          onPress={addCost}
          disabled={!amount || parseFloat(amount) === 0 || !description.trim()}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add to List</Text>
        </TouchableOpacity>

        {/* Costs List */}
        {costs.length > 0 && (
          <View style={styles.costsListSection}>
            <Text style={styles.listTitle}>Cost Breakdown</Text>
            {costs.map((cost) => (
              <View key={cost.id} style={styles.costItem}>
                <View style={styles.costItemLeft}>
                  <Text style={styles.costDescription}>{cost.description}</Text>
                  <Text style={styles.costAmount}>
                    {getCurrencySymbol(cost.currency)}{cost.amount}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeCost(cost.id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Total */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total per person</Text>
              <Text style={styles.totalAmount}>
                {getCurrencySymbol(selectedCurrency)}{getTotalAmount().toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {costs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No costs added yet</Text>
            <Text style={styles.emptyStateSubtext}>Add costs to split with your guests</Text>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
          <Text style={styles.infoText}>
            Guests will see the total cost when they RSVP. You can add multiple costs for different aspects of your event.
          </Text>
        </View>
      </View>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  currencySection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  currencyScroll: {
    marginHorizontal: -20,
  },
  currencyOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    minWidth: 70,
  },
  firstCurrency: {
    marginLeft: 20,
    marginRight: 4,
  },
  currencySelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  currencySymbolSelected: {
    color: '#FFF',
  },
  currencyCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  currencyCodeSelected: {
    color: '#FFF',
    opacity: 0.8,
  },
  amountSection: {
    marginBottom: 24,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  currencyPrefix: {
    fontSize: 32,
    fontWeight: '300',
    color: '#007AFF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '300',
    color: '#000',
    paddingVertical: 20,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  required: {
    color: '#FF3B30',
  },
  descriptionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  examplesLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  examplesScroll: {
    marginHorizontal: -20,
  },
  exampleButton: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  exampleText: {
    fontSize: 14,
    color: '#007AFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  addButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  costsListSection: {
    marginBottom: 24,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  costItemLeft: {
    flex: 1,
  },
  costDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  costAmount: {
    fontSize: 14,
    color: '#666',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F5F5F7',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});