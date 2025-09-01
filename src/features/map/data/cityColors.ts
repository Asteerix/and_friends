// City colors for placeholder backgrounds
export const CITY_COLORS: { [key: string]: string } = {
  // France
  Paris: '#FF6B6B',
  Lyon: '#4ECDC4',
  Marseille: '#45B7D1',
  Nice: '#96CEB4',
  Bordeaux: '#DDA0DD',

  // USA
  'New York': '#FFD93D',
  'Los Angeles': '#FF6BCB',
  'San Francisco': '#4ECDC4',
  Miami: '#FF6B9D',
  Chicago: '#C44569',
  'Las Vegas': '#F8B500',
  Boston: '#786FA6',
  Seattle: '#546DE5',
  Austin: '#F0932B',

  // UK
  London: '#EB3B5A',
  Edinburgh: '#2D3561',
  Manchester: '#6C5CE7',

  // Spain
  Barcelona: '#FA8231',
  Madrid: '#FD79A8',
  Seville: '#FDCB6E',

  // Italy
  Rome: '#E17055',
  Milan: '#A29BFE',
  Venice: '#74B9FF',
  Florence: '#81ECEC',

  // Germany
  Berlin: '#636E72',
  Munich: '#00B894',
  Hamburg: '#0984E3',

  // Netherlands
  Amsterdam: '#E84393',

  // Belgium
  Brussels: '#6C5CE7',

  // Switzerland
  Zurich: '#2D3436',
  Geneva: '#00CEC9',

  // Austria
  Vienna: '#B2BEC3',

  // Portugal
  Lisbon: '#55A3FF',

  // Greece
  Athens: '#5F9EA0',

  // Turkey
  Istanbul: '#FF7675',

  // Russia
  Moscow: '#D63031',

  // Japan
  Tokyo: '#FF6348',
  Kyoto: '#7BED9F',
  Osaka: '#5352ED',

  // China
  Beijing: '#FF4757',
  Shanghai: '#3742FA',
  'Hong Kong': '#2F3542',

  // South Korea
  Seoul: '#FF6B81',

  // Australia
  Sydney: '#1E90FF',
  Melbourne: '#5352ED',

  // Canada
  Toronto: '#FF4757',
  Montreal: '#3742FA',
  Vancouver: '#2ED573',

  // Mexico
  'Mexico City': '#FFA502',

  // Brazil
  'Rio de Janeiro': '#12CBC4',
  'São Paulo': '#FDA7DF',

  // UAE
  Dubai: '#F0932B',

  // Singapore
  Singapore: '#EB3B5A',

  // Thailand
  Bangkok: '#FA8231',

  // Indonesia
  Bali: '#20BF6B',
  Jakarta: '#FD79A8',

  // Morocco
  Marrakech: '#E55039',

  // Egypt
  Cairo: '#F39C12',

  // South Africa
  'Cape Town': '#4834D4',

  // Default
  default: '#95A5A6',
};

export const getCityColor = (cityName: string): string => {
  return CITY_COLORS[cityName] || CITY_COLORS.default || '#95A5A6';
};
