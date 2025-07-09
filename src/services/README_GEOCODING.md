# Services de Géocodage Hybride

Ce système utilise en priorité des APIs gouvernementales gratuites, puis HERE Maps en fallback.

## APIs Gratuites Implémentées

### 🇫🇷 France - API Adresse
- **Limite** : ILLIMITÉE
- **Qualité** : Excellente
- **Sans clé API** : ✅

### 🇬🇧 Royaume-Uni - OS Places
- **Limite** : 250k requêtes/mois
- **Clé API** : Requise (gratuite)
- **Variable d'env** : `EXPO_PUBLIC_UK_OS_API_KEY`

### 🇺🇸 États-Unis - Census Geocoder
- **Limite** : ILLIMITÉE
- **Sans clé API** : ✅

### 🇳🇱 Pays-Bas - PDOK
- **Limite** : ILLIMITÉE
- **Sans clé API** : ✅

### 🇨🇭 Suisse - geo.admin.ch
- **Limite** : ILLIMITÉE
- **Sans clé API** : ✅

## Comment ajouter un nouveau pays

1. Créer une nouvelle classe dans `freeGeocodingApis.ts` :

```typescript
class BelgiumGeocodingService implements GeocodingService {
  name = 'Belgium Geo';
  countries = ['BE', 'Belgium', 'Belgique'];
  
  async searchLocations(query: string): Promise<LocationSearchResult[]> {
    // Implémenter l'appel API
  }
}
```

2. L'ajouter au tableau des services :

```typescript
private services: GeocodingService[] = [
  // ...
  new BelgiumGeocodingService(),
];
```

## Économies réalisées

- **France** : 100% d'économie (API illimitée)
- **UK** : 250k requêtes gratuites/mois
- **US, NL, CH** : 100% d'économie (APIs illimitées)
- **Autres pays** : HERE Maps en fallback

## Ordre de priorité

1. API du pays détecté dans la requête
2. API Adresse France (par défaut)
3. HERE Maps (si aucun résultat)

## Logs

Les logs indiquent quelle API est utilisée :
- 🇫🇷 API Adresse France
- 🇬🇧 UK OS Places
- 🇺🇸 US Census
- 🇳🇱 PDOK
- 🇨🇭 geo.admin.ch
- 🌍 HERE Maps (fallback)