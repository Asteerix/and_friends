import { LocationSearchResult } from './hereApi';

// Interface commune pour tous les services de géocodage
interface GeocodingService {
  name: string;
  countries: string[];
  searchLocations(query: string, country?: string): Promise<LocationSearchResult[]>;
}

// 🇫🇷 API Adresse France - 100% gratuite et illimitée
class FranceGeocodingService implements GeocodingService {
  name = 'API Adresse France';
  countries = ['FR', 'France'];
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    // L'API Adresse France nécessite au moins 3 caractères
    if (query.length < 3) {
      console.log('🇫🇷 Query too short for API Adresse France (min 3 chars)');
      return [];
    }
    
    try {
      
      console.log('🇫🇷 Searching with API Adresse France:', query);
      
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&autocomplete=1&limit=10`
      );
      
      if (!response.ok) {
        console.warn(`🇫🇷 API Adresse France returned status: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      console.log('🇫🇷 API Adresse France found', data.features?.length || 0, 'results');
      
      return (data.features || []).map((feature: any) => ({
        id: `fr-${feature.properties.id || Date.now()}-${Math.random()}`,
        name: feature.properties.name || feature.properties.label,
        address: feature.properties.name || '',
        city: feature.properties.city || feature.properties.municipality || '',
        postalCode: feature.properties.postcode || '',
        country: 'France',
        coordinates: {
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
        },
      }));
    } catch (error) {
      console.warn('🇫🇷 API Adresse France error:', error);
      return [];
    }
  }
}

// 🇬🇧 UK OS Places API - 250k/mois gratuit (nécessite une clé)
class UKGeocodingService implements GeocodingService {
  name = 'UK OS Places';
  countries = ['GB', 'UK', 'United Kingdom', 'England', 'Scotland', 'Wales'];
  private apiKey = process.env.EXPO_PUBLIC_UK_OS_API_KEY;
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    // Si pas de clé API, on skip
    if (!this.apiKey) {
      console.log('🇬🇧 UK OS API key not configured, skipping');
      return [];
    }
    
    try {
      console.log('🇬🇧 Searching with UK OS Places:', query);
      
      const response = await fetch(
        `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&key=${this.apiKey}&maxresults=10`
      );
      
      if (!response.ok) {
        throw new Error(`UK OS Places error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.results || []).map((result: any) => ({
        id: `uk-${result.DPA?.UPRN || Date.now()}-${Math.random()}`,
        name: result.DPA?.ADDRESS || '',
        address: result.DPA?.THOROUGHFARE_NAME || '',
        city: result.DPA?.POST_TOWN || '',
        postalCode: result.DPA?.POSTCODE || '',
        country: 'United Kingdom',
        coordinates: {
          latitude: result.DPA?.LAT || 0,
          longitude: result.DPA?.LNG || 0,
        },
      }));
    } catch (error) {
      console.error('🇬🇧 UK OS Places error:', error);
      return [];
    }
  }
}

// 🇺🇸 US Census Geocoder - 100% gratuit et illimité
class USGeocodingService implements GeocodingService {
  name = 'US Census Geocoder';
  countries = ['US', 'USA', 'United States'];
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    try {
      console.log('🇺🇸 Searching with US Census Geocoder:', query);
      
      const response = await fetch(
        `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`
      );
      
      if (!response.ok) {
        throw new Error(`US Census error: ${response.status}`);
      }
      
      const data = await response.json();
      const matches = data.result?.addressMatches || [];
      
      return matches.map((match: any) => ({
        id: `us-${Date.now()}-${Math.random()}`,
        name: match.matchedAddress || query,
        address: match.addressComponents?.streetName || '',
        city: match.addressComponents?.city || '',
        postalCode: match.addressComponents?.zip || '',
        country: 'United States',
        coordinates: {
          latitude: match.coordinates?.y || 0,
          longitude: match.coordinates?.x || 0,
        },
      }));
    } catch (error) {
      console.error('🇺🇸 US Census Geocoder error:', error);
      return [];
    }
  }
}

// 🇳🇱 Netherlands PDOK - 100% gratuit et illimité
class NetherlandsGeocodingService implements GeocodingService {
  name = 'PDOK Locatieserver';
  countries = ['NL', 'Netherlands', 'Nederland'];
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    try {
      console.log('🇳🇱 Searching with PDOK:', query);
      
      const response = await fetch(
        `https://geodata.nationaalgeoregister.nl/locatieserver/v3/suggest?q=${encodeURIComponent(query)}&rows=10`
      );
      
      if (!response.ok) {
        throw new Error(`PDOK error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.response?.docs || []).map((doc: any) => ({
        id: `nl-${doc.id || Date.now()}-${Math.random()}`,
        name: doc.weergavenaam || '',
        address: doc.straatnaam || '',
        city: doc.woonplaatsnaam || '',
        postalCode: doc.postcode || '',
        country: 'Netherlands',
        coordinates: doc.centroide_ll ? {
          latitude: parseFloat(doc.centroide_ll.split(' ')[1]),
          longitude: parseFloat(doc.centroide_ll.split(' ')[0]),
        } : undefined,
      })).filter((r: LocationSearchResult) => r.coordinates);
    } catch (error) {
      console.error('🇳🇱 PDOK error:', error);
      return [];
    }
  }
}

// 🇨🇭 Switzerland geo.admin.ch - 100% gratuit et illimité
class SwitzerlandGeocodingService implements GeocodingService {
  name = 'geo.admin.ch';
  countries = ['CH', 'Switzerland', 'Suisse', 'Schweiz'];
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    try {
      console.log('🇨🇭 Searching with geo.admin.ch:', query);
      
      const response = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(query)}&type=locations&limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`geo.admin.ch error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.results || []).map((result: any) => ({
        id: `ch-${result.id || Date.now()}-${Math.random()}`,
        name: result.attrs?.label || '',
        address: result.attrs?.detail || '',
        city: result.attrs?.origin || '',
        postalCode: '',
        country: 'Switzerland',
        coordinates: result.attrs?.lat && result.attrs?.lon ? {
          latitude: result.attrs.lat,
          longitude: result.attrs.lon,
        } : undefined,
      })).filter((r: LocationSearchResult) => r.coordinates);
    } catch (error) {
      console.error('🇨🇭 geo.admin.ch error:', error);
      return [];
    }
  }
}

// Service principal qui orchestre tous les services gratuits
export class FreeGeocodingService {
  private services: GeocodingService[] = [
    new FranceGeocodingService(),
    new UKGeocodingService(),
    new USGeocodingService(),
    new NetherlandsGeocodingService(),
    new SwitzerlandGeocodingService(),
  ];
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    console.log('🌍 FreeGeocodingService searching for:', query);
    
    // Détection intelligente du pays basée sur la requête
    const country = this.detectCountry(query);
    console.log('🔍 Detected country:', country || 'Not detected');
    
    // Si on détecte un pays, on utilise son service en priorité
    if (country) {
      const service = this.services.find(s => 
        s.countries.some(c => c.toLowerCase() === country.toLowerCase())
      );
      
      if (service) {
        console.log(`✅ Using ${service.name} for country: ${country}`);
        const results = await service.searchLocations(query);
        if (results.length > 0) {
          return results;
        }
      }
    }
    
    // Si la requête contient "rue" ou d'autres mots français, on essaie avec l'API France
    // mais seulement si la requête a au moins 3 caractères
    if (query.length >= 3 && (country === 'france' || !country)) {
      console.log('🇫🇷 Trying with France API');
      const franceService = this.services[0]; // FranceGeocodingService
      if (franceService) {
        const results = await franceService.searchLocations(query);
        if (results.length > 0) {
          return results;
        }
      }
    }
    
    return [];
  }
  
  private detectCountry(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Détection basée sur des mots-clés dans la requête
    const countryKeywords = {
      'france': ['france', 'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'bordeaux', 'lille', 'nantes', 'strasbourg', 'montpellier', 'rennes'],
      'uk': ['uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'glasgow', 'edinburgh'],
      'us': ['usa', 'united states', 'new york', 'los angeles', 'chicago', 'houston', 'miami'],
      'netherlands': ['netherlands', 'nederland', 'amsterdam', 'rotterdam', 'den haag', 'utrecht'],
      'switzerland': ['switzerland', 'suisse', 'schweiz', 'zurich', 'geneva', 'basel', 'bern'],
    };
    
    for (const [country, keywords] of Object.entries(countryKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return country;
      }
    }
    
    // Détection basée sur le code postal français (5 chiffres)
    if (/\b\d{5}\b/.test(query) && !query.includes('-')) return 'france'; // 75001
    
    // Détection basée sur des patterns d'adresses françaises
    if (/\b(rue|avenue|boulevard|place|impasse|allée|chemin|route|quai)\b/i.test(query)) return 'france';
    
    // Détection basée sur le code postal UK
    if (/\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/i.test(query)) return 'uk'; // SW1A 1AA
    
    // Détection basée sur le code postal US
    if (/\b\d{5}-\d{4}\b/.test(query)) return 'us'; // 12345-6789
    
    return null;
  }
}

export const freeGeocodingService = new FreeGeocodingService();