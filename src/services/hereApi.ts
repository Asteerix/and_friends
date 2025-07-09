const HERE_API_KEY = process.env.EXPO_PUBLIC_HERE_API_KEY;

// Log API key status on module load
console.log('🔑 HERE API Key status:', HERE_API_KEY ? `Loaded (${HERE_API_KEY.substring(0, 8)}...)` : '❌ NOT LOADED - Check .env file');

export interface HereGeocodingResult {
  items: HereLocation[];
}

export interface HereLocation {
  id: string;
  title: string;
  address: {
    label: string;
    street?: string;
    houseNumber?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    county?: string;
    countryCode?: string;
    countryName?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  scoring?: {
    queryScore: number;
  };
}

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

class HereApiService {
  private baseUrl = 'https://autosuggest.search.hereapi.com/v1';
  private geocodeUrl = 'https://geocode.search.hereapi.com/v1';

  async searchLocations(query: string, at?: { lat: number; lng: number }): Promise<LocationSearchResult[]> {
    console.log('🌍 HereApiService.searchLocations called with query:', query);
    
    if (!HERE_API_KEY) {
      console.error('❌ HERE API key is not configured! Check EXPO_PUBLIC_HERE_API_KEY in .env');
      return [];
    }

    if (!query.trim()) {
      console.log('❌ Empty query provided');
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        apiKey: HERE_API_KEY,
        limit: '10',
        lang: 'fr-FR', // French language for French addresses
      });

      // Add location bias if provided, default to France (Paris) for better French results
      if (at) {
        console.log('📍 Using provided location bias:', at);
        params.append('at', `${at.lat},${at.lng}`);
      } else {
        // Default to Paris, France for better French location search
        console.log('📍 Using default location bias: Paris, France');
        params.append('at', '48.8566,2.3522');
      }

      const url = `${this.baseUrl}/autosuggest?${params.toString()}`;
      console.log('🔗 HERE API URL:', url.replace(HERE_API_KEY, 'API_KEY_HIDDEN'));
      
      const response = await fetch(url);
      console.log('📨 HERE API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HERE API Error response:', errorText);
        throw new Error(`HERE API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 HERE API Raw response:', JSON.stringify(data, null, 2));
      
      const formattedResults = this.formatSearchResults(data.items || []);
      console.log('✨ Formatted results:', formattedResults);
      
      return formattedResults;
    } catch (error) {
      console.error('❌ Error in searchLocations:', error);
      return [];
    }
  }

  async geocodeAddress(address: string): Promise<LocationSearchResult | null> {
    if (!HERE_API_KEY) {
      console.error('HERE API key is not configured');
      return null;
    }

    try {
      const params = new URLSearchParams({
        q: address,
        apiKey: HERE_API_KEY,
        limit: '1',
      });

      const response = await fetch(`${this.geocodeUrl}/geocode?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HERE API geocoding failed: ${response.status}`);
      }

      const data: HereGeocodingResult = await response.json();
      
      if (data.items && data.items.length > 0) {
        const results = this.formatSearchResults(data.items);
        return results[0] || null;
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  private formatSearchResults(items: any[]): LocationSearchResult[] {
    return items
      .filter(item => item.position && item.address)
      .map(item => ({
        id: item.id || `here-${Date.now()}-${Math.random()}`,
        name: item.title || item.address?.label || 'Unknown Location',
        address: this.extractAddress(item),
        city: item.address?.city || item.address?.county || '',
        postalCode: item.address?.postalCode,
        country: item.address?.countryName || item.address?.countryCode || '',
        coordinates: item.position ? {
          latitude: item.position.lat,
          longitude: item.position.lng,
        } : undefined,
      }))
      .filter(result => result.coordinates); // Only return results with coordinates
  }

  private extractAddress(item: any): string {
    const address = item.address;
    if (!address) return 'Unknown Address';

    // Try to build a clean address from components
    const parts: string[] = [];
    
    if (address.houseNumber) parts.push(address.houseNumber);
    if (address.street) parts.push(address.street);
    
    // If we don't have street info, use the label but remove city/country info
    if (parts.length === 0 && address.label) {
      const labelParts = address.label.split(',');
      if (labelParts.length > 0) {
        parts.push(labelParts[0].trim());
      }
    }

    return parts.join(' ') || address.label || 'Unknown Address';
  }
}

export const hereApiService = new HereApiService();