import React, { useState } from 'react';
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
} from 'react-native';
import CountryFlag from 'react-native-country-flag';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  currentLocation?: string;
}

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey1: '#AEB0B4',
  grey2: '#666666',
  primary: '#007AFF',
};

const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'South Korea' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'BE', name: 'Belgium' },
];

const MAJOR_CITIES: { [key: string]: string[] } = {
  'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'San Francisco', 'Seattle', 'Denver', 'Boston', 'Miami', 'Atlanta', 'Las Vegas', 'Portland'],
  'GB': ['London', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield', 'Bradford', 'Liverpool', 'Edinburgh', 'Manchester', 'Bristol', 'Coventry', 'Nottingham', 'Leicester', 'Newcastle', 'Brighton', 'Cambridge', 'Oxford', 'Cardiff', 'Belfast', 'Aberdeen'],
  'CA': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', 'Barrie', 'St. Johns', 'Kelowna'],
  'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong', 'Hobart', 'Geelong', 'Townsville', 'Cairns', 'Darwin', 'Toowoomba', 'Ballarat', 'Bendigo', 'Albury', 'Launceston'],
  'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne', 'Toulon', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Aix-en-Provence'],
  'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'],
  'IT': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Messina', 'Padua', 'Trieste', 'Taranto', 'Brescia', 'Parma', 'Prato', 'Modena'],
  'ES': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet', 'Granada', 'Vitoria', 'Elche', 'Oviedo'],
  'JP': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Kobe', 'Kyoto', 'Fukuoka', 'Kawasaki', 'Saitama', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Sakai', 'Niigata', 'Hamamatsu', 'Shizuoka', 'Kumamoto', 'Okayama'],
  'BR': ['São Paulo', 'Rio de Janeiro', 'Salvador', 'Brasília', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Belém', 'Goiânia', 'Guarulhos', 'Campinas', 'São Luís', 'São Gonçalo', 'Maceió', 'Duque de Caxias', 'Natal', 'Campo Grande'],
  'MX': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Toluca', 'Tijuana', 'León', 'Ciudad Juárez', 'Torreón', 'Zapopan', 'San Luis Potosí', 'Querétaro', 'Mérida', 'Aguascalientes', 'Mexicali', 'Cuernavaca', 'Tampico', 'Chihuahua', 'Morelia', 'Saltillo'],
  'IN': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara'],
  'CN': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Tianjin', 'Wuhan', 'Dongguan', 'Chengdu', 'Nanjing', 'Chongqing', 'Xian', 'Hangzhou', 'Foshan', 'Shenyang', 'Harbin', 'Suzhou', 'Qingdao', 'Dalian', 'Zhengzhou', 'Jinan'],
  'KR': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang', 'Yongin', 'Seongnam', 'Bucheon', 'Cheongju', 'Ansan', 'Jeonju', 'Cheonan', 'Namyangju', 'Hwaseong', 'Anyang'],
  'NL': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Enschede', 'Haarlem', 'Arnhem', 'Zaanstad', 'Amersfoort', 'Apeldoorn', 'Hoofddorp', 'Maastricht', 'Leiden', 'Dordrecht'],
  'SE': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Gävle', 'Borås', 'Eskilstuna', 'Södertälje', 'Karlstad', 'Täby', 'Växjö', 'Halmstad'],
  'NO': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Tromsø', 'Sandnes', 'Sarpsborg', 'Skien', 'Ålesund', 'Sandefjord', 'Haugesund', 'Tønsberg', 'Moss', 'Porsgrunn', 'Bodø', 'Arendal', 'Larvik'],
  'DK': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Horsens', 'Vejle', 'Kolding', 'Hvidovre', 'Greve', 'Roskilde', 'Herning', 'Hørsholm', 'Silkeborg', 'Næstved', 'Fredericia', 'Viborg', 'Køge', 'Holstebro'],
  'CH': ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel', 'Thun', 'Köniz', 'La Chaux-de-Fonds', 'Schaffhausen', 'Fribourg', 'Chur', 'Neuchâtel', 'Vernier', 'Uster', 'Sion'],
  'BE': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst', 'Mechelen', 'La Louvière', 'Kortrijk', 'Hasselt', 'Sint-Niklaas', 'Ostend', 'Tournai', 'Genk', 'Seraing', 'Roeselare'],
};

export default function LocationPickerModal({
  visible,
  onClose,
  onSelect,
  currentLocation,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string }>(
    POPULAR_COUNTRIES[0]!
  );
  const [city, setCity] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [customCityMode, setCustomCityMode] = useState(false);

  // Parse current location if available
  React.useEffect(() => {
    if (currentLocation && visible) {
      const parts = currentLocation.split(', ');
      if (parts.length >= 2) {
        const countryPart = parts[0];
        const cityPart = parts[1];
        
        setCity(cityPart || '');
        
        // Find matching country
        const country = POPULAR_COUNTRIES.find(
          c => c.name === countryPart || c.code === countryPart || 
          (countryPart === 'USA' && c.code === 'US')
        );
        if (country) {
          setSelectedCountry(country);
        }
      }
    }
  }, [currentLocation, visible]);

  const handleConfirm = () => {
    if (city.trim()) {
      const locationString = `${selectedCountry.code === 'US' ? 'USA' : selectedCountry.name}, ${city.trim()}`;
      onSelect(locationString);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  const handleCancel = () => {
    setCity('');
    setSelectedCountry(POPULAR_COUNTRIES[0]!);
    setShowCountryPicker(false);
    setShowCitySuggestions(false);
    setCustomCityMode(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalContent, { paddingBottom: insets.bottom || 20 }]}
          keyboardVerticalOffset={0}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Where are you based?</Text>
            <Text style={styles.subtitle}>Select your country and city</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Country</Text>
              <Pressable
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
              >
                <CountryFlag
                  isoCode={selectedCountry.code}
                  size={24}
                  style={styles.flag}
                />
                <Text style={styles.countryText}>{selectedCountry.name}</Text>
                <Ionicons 
                  name={showCountryPicker ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={COLORS.grey2} 
                  style={styles.chevron}
                />
              </Pressable>
              
              {showCountryPicker && (
                <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                  {POPULAR_COUNTRIES.map((country) => (
                    <Pressable
                      key={country.code}
                      style={[
                        styles.countryItem,
                        selectedCountry.code === country.code && styles.countryItemSelected
                      ]}
                      onPress={() => {
                        setSelectedCountry(country);
                        setShowCountryPicker(false);
                        setShowCitySuggestions(false);
                        setCity(''); // Reset city when country changes
                        setCustomCityMode(false);
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <CountryFlag
                        isoCode={country.code}
                        size={20}
                        style={styles.countryItemFlag}
                      />
                      <Text style={[
                        styles.countryItemText,
                        selectedCountry.code === country.code && styles.countryItemTextSelected
                      ]}>
                        {country.name}
                      </Text>
                      {selectedCountry.code === country.code && (
                        <Ionicons 
                          name="checkmark" 
                          size={20} 
                          color={COLORS.primary} 
                          style={styles.checkmark}
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>City</Text>
              {!customCityMode ? (
                <>
                  <Pressable
                    style={styles.countrySelector}
                    onPress={() => setShowCitySuggestions(!showCitySuggestions)}
                  >
                    <Text style={[styles.countryText, !city && { color: COLORS.grey1 }]}>
                      {city || 'Select a city'}
                    </Text>
                    <Ionicons 
                      name={showCitySuggestions ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={COLORS.grey2} 
                      style={styles.chevron}
                    />
                  </Pressable>
                  
                  {showCitySuggestions && (
                    <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
                      {MAJOR_CITIES[selectedCountry.code]?.map((cityName) => (
                        <Pressable
                          key={cityName}
                          style={[
                            styles.cityItem,
                            city === cityName && styles.cityItemSelected
                          ]}
                          onPress={() => {
                            setCity(cityName);
                            setShowCitySuggestions(false);
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                        >
                          <Text style={[
                            styles.cityItemText,
                            city === cityName && styles.cityItemTextSelected
                          ]}>
                            {cityName}
                          </Text>
                          {city === cityName && (
                            <Ionicons 
                              name="checkmark" 
                              size={20} 
                              color={COLORS.primary} 
                              style={styles.checkmark}
                            />
                          )}
                        </Pressable>
                      ))}
                      <Pressable
                        style={[styles.cityItem, styles.customCityButton]}
                        onPress={() => {
                          setCustomCityMode(true);
                          setShowCitySuggestions(false);
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                        <Text style={[styles.cityItemText, { color: COLORS.primary, marginLeft: 8 }]}>
                          Enter custom city
                        </Text>
                      </Pressable>
                    </ScrollView>
                  )}
                </>
              ) : (
                <View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your city name"
                    placeholderTextColor={COLORS.grey1}
                    value={city}
                    onChangeText={setCity}
                    returnKeyType="done"
                    autoFocus
                  />
                  <Pressable
                    style={styles.backToSuggestions}
                    onPress={() => {
                      setCustomCityMode(false);
                      setCity('');
                    }}
                  >
                    <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                    <Text style={styles.backToSuggestionsText}>Back to suggestions</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !city.trim() && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!city.trim()}
            >
              <Text style={styles.confirmButtonText}>Done</Text>
            </Pressable>
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
    maxHeight: '70%',
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
    marginBottom: 24,
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
  form: {
    paddingHorizontal: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.grey2,
    marginBottom: 8,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  flag: {
    marginRight: 12,
    borderRadius: 4,
  },
  countryText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  chevron: {
    marginLeft: 8,
  },
  countryList: {
    maxHeight: 150,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countryItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  countryItemFlag: {
    marginRight: 12,
    borderRadius: 2,
  },
  countryItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  countryItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 8,
  },
  textInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
    marginTop: 20,
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
  cityList: {
    maxHeight: 200,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cityItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  cityItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  cityItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customCityButton: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grey0,
    marginTop: 8,
    paddingTop: 16,
  },
  backToSuggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  backToSuggestionsText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
  },
});