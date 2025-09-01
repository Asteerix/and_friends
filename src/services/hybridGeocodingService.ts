import { freeGeocodingService } from './freeGeocodingApis';
import { hereApiService, type LocationSearchResult } from './hereApi';

export type { LocationSearchResult } from './hereApi';

class HybridGeocodingService {
  async searchLocations(
    query: string,
    at?: { lat: number; lng: number }
  ): Promise<LocationSearchResult[]> {
    console.log('🔄 HybridGeocodingService starting search for:', query);

    // Validation minimale - on laisse passer toutes les requêtes
    // La validation de 4 caractères est faite dans la modale
    if (!query || query.trim().length === 0) {
      console.log('❌ Empty query');
      return [];
    }

    // 1. D'abord essayer avec les APIs gratuites
    console.log('1️⃣ Trying free APIs first...');
    const freeResults = await freeGeocodingService.searchLocations(query);

    if (freeResults.length > 0) {
      console.log('✅ Found', freeResults.length, 'results with free APIs!');
      return freeResults;
    }

    // 2. Si aucun résultat avec les APIs gratuites, utiliser HERE
    console.log('2️⃣ No results with free APIs, falling back to HERE...');
    const hereResults = await hereApiService.searchLocations(query, at);

    if (hereResults.length > 0) {
      console.log('✅ Found', hereResults.length, 'results with HERE API');
    } else {
      console.log('❌ No results found with any API');
    }

    return hereResults;
  }

  // Pour la compatibilité, on expose aussi geocodeAddress
  async geocodeAddress(address: string): Promise<LocationSearchResult | null> {
    const results = await this.searchLocations(address);
    return results[0] || null;
  }
}

export const hybridGeocodingService = new HybridGeocodingService();
