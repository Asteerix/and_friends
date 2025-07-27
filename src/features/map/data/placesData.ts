// Places data with images and metadata
export interface PlaceData {
  name: string;
  type: 'city' | 'country';
  country?: string; // For cities
  image?: string; // Local image path
  flag?: string; // For countries
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Country flags using emojis (no need to download)
export const COUNTRY_FLAGS: { [key: string]: string } = {
  'France': '🇫🇷',
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Spain': '🇪🇸',
  'Italy': '🇮🇹',
  'Germany': '🇩🇪',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
  'Japan': '🇯🇵',
  'Brazil': '🇧🇷',
  'Mexico': '🇲🇽',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭',
  'Portugal': '🇵🇹',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Ireland': '🇮🇪',
  'Austria': '🇦🇹',
  'Greece': '🇬🇷',
  'Poland': '🇵🇱',
  'Turkey': '🇹🇷',
  'Russia': '🇷🇺',
  'China': '🇨🇳',
  'India': '🇮🇳',
  'South Korea': '🇰🇷',
  'Argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'Colombia': '🇨🇴',
  'Peru': '🇵🇪',
  'South Africa': '🇿🇦',
  'Egypt': '🇪🇬',
  'Morocco': '🇲🇦',
  'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Israel': '🇮🇱',
  'New Zealand': '🇳🇿',
  'Singapore': '🇸🇬',
  'Thailand': '🇹🇭',
  'Indonesia': '🇮🇩',
  'Malaysia': '🇲🇾',
  'Philippines': '🇵🇭',
  'Vietnam': '🇻🇳',
};

// City images with country info
export const CITY_IMAGES: { [key: string]: { country: string; coordinates?: { lat: number; lng: number } } } = {
  'Paris': { 
    country: 'France',
    coordinates: { lat: 48.8566, lng: 2.3522 }
  },
  'London': { 
    country: 'United Kingdom',
    coordinates: { lat: 51.5074, lng: -0.1278 }
  },
  'New York': { 
    country: 'United States',
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  'Tokyo': { 
    country: 'Japan',
    coordinates: { lat: 35.6762, lng: 139.6503 }
  },
  'Barcelona': { 
    country: 'Spain',
    coordinates: { lat: 41.3851, lng: 2.1734 }
  },
  'Rome': { 
    country: 'Italy',
    coordinates: { lat: 41.9028, lng: 12.4964 }
  },
  'Berlin': { 
    country: 'Germany',
    coordinates: { lat: 52.5200, lng: 13.4050 }
  },
  'Amsterdam': { 
    country: 'Netherlands',
    coordinates: { lat: 52.3676, lng: 4.9041 }
  },
  'Madrid': { 
    country: 'Spain',
    coordinates: { lat: 40.4168, lng: -3.7038 }
  },
  'Los Angeles': { 
    country: 'United States',
    coordinates: { lat: 34.0522, lng: -118.2437 }
  },
  'San Francisco': { 
    country: 'United States',
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  'Sydney': { 
    country: 'Australia',
    coordinates: { lat: -33.8688, lng: 151.2093 }
  },
  'Dubai': { 
    country: 'UAE',
    coordinates: { lat: 25.2048, lng: 55.2708 }
  },
  'Singapore': { 
    country: 'Singapore',
    coordinates: { lat: 1.3521, lng: 103.8198 }
  },
  'Hong Kong': { 
    country: 'China',
    coordinates: { lat: 22.3193, lng: 114.1694 }
  },
  'Mumbai': { 
    country: 'India',
    coordinates: { lat: 19.0760, lng: 72.8777 }
  },
  'Toronto': { 
    country: 'Canada',
    coordinates: { lat: 43.6532, lng: -79.3832 }
  },
  'Montreal': { 
    country: 'Canada',
    coordinates: { lat: 45.5017, lng: -73.5673 }
  },
  'Vancouver': { 
    country: 'Canada',
    coordinates: { lat: 49.2827, lng: -123.1207 }
  },
  'Miami': { 
    country: 'United States',
    coordinates: { lat: 25.7617, lng: -80.1918 }
  },
  'Chicago': { 
    country: 'United States',
    coordinates: { lat: 41.8781, lng: -87.6298 }
  },
  'Boston': { 
    country: 'United States',
    coordinates: { lat: 42.3601, lng: -71.0589 }
  },
  'Seattle': { 
    country: 'United States',
    coordinates: { lat: 47.6062, lng: -122.3321 }
  },
  'Austin': { 
    country: 'United States',
    coordinates: { lat: 30.2672, lng: -97.7431 }
  },
  'Las Vegas': { 
    country: 'United States',
    coordinates: { lat: 36.1699, lng: -115.1398 }
  },
  'Mexico City': { 
    country: 'Mexico',
    coordinates: { lat: 19.4326, lng: -99.1332 }
  },
  'São Paulo': { 
    country: 'Brazil',
    coordinates: { lat: -23.5505, lng: -46.6333 }
  },
  'Rio de Janeiro': { 
    country: 'Brazil',
    coordinates: { lat: -22.9068, lng: -43.1729 }
  },
  'Buenos Aires': { 
    country: 'Argentina',
    coordinates: { lat: -34.6037, lng: -58.3816 }
  },
  'Lima': { 
    country: 'Peru',
    coordinates: { lat: -12.0464, lng: -77.0428 }
  },
  'Brussels': { 
    country: 'Belgium',
    coordinates: { lat: 50.8503, lng: 4.3517 }
  },
  'Zurich': { 
    country: 'Switzerland',
    coordinates: { lat: 47.3769, lng: 8.5417 }
  },
  'Geneva': { 
    country: 'Switzerland',
    coordinates: { lat: 46.2044, lng: 6.1432 }
  },
  'Vienna': { 
    country: 'Austria',
    coordinates: { lat: 48.2082, lng: 16.3738 }
  },
  'Prague': { 
    country: 'Czech Republic',
    coordinates: { lat: 50.0755, lng: 14.4378 }
  },
  'Budapest': { 
    country: 'Hungary',
    coordinates: { lat: 47.4979, lng: 19.0402 }
  },
  'Warsaw': { 
    country: 'Poland',
    coordinates: { lat: 52.2297, lng: 21.0122 }
  },
  'Stockholm': { 
    country: 'Sweden',
    coordinates: { lat: 59.3293, lng: 18.0686 }
  },
  'Copenhagen': { 
    country: 'Denmark',
    coordinates: { lat: 55.6761, lng: 12.5683 }
  },
  'Oslo': { 
    country: 'Norway',
    coordinates: { lat: 59.9139, lng: 10.7522 }
  },
  'Helsinki': { 
    country: 'Finland',
    coordinates: { lat: 60.1699, lng: 24.9384 }
  },
  'Dublin': { 
    country: 'Ireland',
    coordinates: { lat: 53.3498, lng: -6.2603 }
  },
  'Edinburgh': { 
    country: 'United Kingdom',
    coordinates: { lat: 55.9533, lng: -3.1883 }
  },
  'Lisbon': { 
    country: 'Portugal',
    coordinates: { lat: 38.7223, lng: -9.1393 }
  },
  'Athens': { 
    country: 'Greece',
    coordinates: { lat: 37.9838, lng: 23.7275 }
  },
  'Istanbul': { 
    country: 'Turkey',
    coordinates: { lat: 41.0082, lng: 28.9784 }
  },
  'Moscow': { 
    country: 'Russia',
    coordinates: { lat: 55.7558, lng: 37.6173 }
  },
  'Beijing': { 
    country: 'China',
    coordinates: { lat: 39.9042, lng: 116.4074 }
  },
  'Shanghai': { 
    country: 'China',
    coordinates: { lat: 31.2304, lng: 121.4737 }
  },
  'Seoul': { 
    country: 'South Korea',
    coordinates: { lat: 37.5665, lng: 126.9780 }
  },
  'Bangkok': { 
    country: 'Thailand',
    coordinates: { lat: 13.7563, lng: 100.5018 }
  },
  'Bali': { 
    country: 'Indonesia',
    coordinates: { lat: -8.3405, lng: 115.0920 }
  },
  'Jakarta': { 
    country: 'Indonesia',
    coordinates: { lat: -6.2088, lng: 106.8456 }
  },
  'Kuala Lumpur': { 
    country: 'Malaysia',
    coordinates: { lat: 3.1390, lng: 101.6869 }
  },
  'Manila': { 
    country: 'Philippines',
    coordinates: { lat: 14.5995, lng: 120.9842 }
  },
  'Ho Chi Minh City': { 
    country: 'Vietnam',
    coordinates: { lat: 10.8231, lng: 106.6297 }
  },
  'Tel Aviv': { 
    country: 'Israel',
    coordinates: { lat: 32.0853, lng: 34.7818 }
  },
  'Jerusalem': { 
    country: 'Israel',
    coordinates: { lat: 31.7683, lng: 35.2137 }
  },
  'Cairo': { 
    country: 'Egypt',
    coordinates: { lat: 30.0444, lng: 31.2357 }
  },
  'Marrakech': { 
    country: 'Morocco',
    coordinates: { lat: 31.6295, lng: -7.9811 }
  },
  'Cape Town': { 
    country: 'South Africa',
    coordinates: { lat: -33.9249, lng: 18.4241 }
  },
  'Johannesburg': { 
    country: 'South Africa',
    coordinates: { lat: -26.2041, lng: 28.0473 }
  },
  'Auckland': { 
    country: 'New Zealand',
    coordinates: { lat: -36.8485, lng: 174.7633 }
  },
  'Melbourne': { 
    country: 'Australia',
    coordinates: { lat: -37.8136, lng: 144.9631 }
  },
};

// Helper function to get country flag
export const getCountryFlag = (country: string): string => {
  return COUNTRY_FLAGS[country] || '🏳️';
};

// Helper function to get city info
export const getCityInfo = (city: string): { country: string; flag: string; coordinates?: { lat: number; lng: number } } | null => {
  const cityData = CITY_IMAGES[city];
  if (!cityData) return null;
  
  return {
    country: cityData.country,
    flag: getCountryFlag(cityData.country),
    coordinates: cityData.coordinates
  };
};