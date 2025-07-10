import React, { useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';
import CountryFlag from 'react-native-country-flag';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useProfile } from '@/hooks/useProfile';

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

export default function LocationPickerScreen() {
  const { navigateNext, navigateBack, getProgress } = useAuthNavigation('location-picker');
  const { updateProfile } = useProfile();
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string }>(
    POPULAR_COUNTRIES[0]!
  );
  const [city, setCity] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [customCityMode, setCustomCityMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!city.trim()) return;

    setLoading(true);
    try {
      const locationString = `${selectedCountry.code === 'US' ? 'USA' : selectedCountry.name}, ${city.trim()}`;
      
      const { error } = await updateProfile({ location: locationString });
      
      if (!error) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigateNext('age-input');
      } else {
        console.error('Error updating location:', error);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateNext('age-input');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Progress Bar */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={navigateBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
          </View>
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Where are you based?</Text>
            <Text style={styles.subtitle}>
              Select your country and city to find events near you
            </Text>
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
                        setCity('');
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
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
          <Pressable
            style={[styles.continueButton, !city.trim() && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!city.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: 28,
    color: COLORS.primary,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: '70%',
    height: 2,
    backgroundColor: COLORS.grey0,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.grey2,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 24,
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
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.grey0,
  },
  skipButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.black,
  },
  continueButton: {
    flex: 2,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  continueButtonDisabled: {
    backgroundColor: '#B3D1FF',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});