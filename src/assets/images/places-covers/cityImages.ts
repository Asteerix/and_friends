// City images mapping
export const CITY_IMAGES: { [key: string]: any } = {
  // France
  Paris: require('./cities/paris.jpg'),
  Lyon: require('./cities/lyon.jpg'),
  Marseille: require('./cities/marseille.jpg'),
  Nice: require('./cities/nice.jpg'),
  Bordeaux: require('./cities/bordeaux.jpg'),

  // USA
  'New York': require('./cities/new-york.jpg'),
  'Los Angeles': require('./cities/los-angeles.jpg'),
  'San Francisco': require('./cities/san-francisco.jpg'),
  Miami: require('./cities/miami.jpg'),
  Chicago: require('./cities/chicago.jpg'),
  'Las Vegas': require('./cities/las-vegas.jpg'),
  Boston: require('./cities/boston.jpg'),
  Seattle: require('./cities/seattle.jpg'),
  Austin: require('./cities/austin.jpg'),

  // UK
  London: require('./cities/london.jpg'),
  Edinburgh: require('./cities/edinburgh.jpg'),
  Manchester: require('./cities/manchester.jpg'),

  // Spain
  Barcelona: require('./cities/barcelona.jpg'),
  Madrid: require('./cities/madrid.jpg'),
  Seville: require('./cities/seville.jpg'),

  // Italy
  Rome: require('./cities/rome.jpg'),
  Milan: require('./cities/milan.jpg'),
  Venice: require('./cities/venice.jpg'),
  Florence: require('./cities/florence.jpg'),

  // Germany
  Berlin: require('./cities/berlin.jpg'),
  Munich: require('./cities/munich.jpg'),
  Hamburg: require('./cities/hamburg.jpg'),

  // Netherlands
  Amsterdam: require('./cities/amsterdam.jpg'),

  // Belgium
  Brussels: require('./cities/brussels.jpg'),

  // Switzerland
  Zurich: require('./cities/zurich.jpg'),
  Geneva: require('./cities/geneva.jpg'),

  // Austria
  Vienna: require('./cities/vienna.jpg'),

  // Portugal
  Lisbon: require('./cities/lisbon.jpg'),

  // Greece
  Athens: require('./cities/athens.jpg'),

  // Turkey
  Istanbul: require('./cities/istanbul.jpg'),

  // Russia
  Moscow: require('./cities/moscow.jpg'),

  // Japan
  Tokyo: require('./cities/tokyo.jpg'),
  Kyoto: require('./cities/kyoto.jpg'),
  Osaka: require('./cities/osaka.jpg'),

  // China
  Beijing: require('./cities/beijing.jpg'),
  Shanghai: require('./cities/shanghai.jpg'),
  'Hong Kong': require('./cities/hong-kong.jpg'),

  // South Korea
  Seoul: require('./cities/seoul.jpg'),

  // Australia
  Sydney: require('./cities/sydney.jpg'),
  Melbourne: require('./cities/melbourne.jpg'),

  // Canada
  Toronto: require('./cities/toronto.jpg'),
  Montreal: require('./cities/montreal.jpg'),
  Vancouver: require('./cities/vancouver.jpg'),

  // Mexico
  'Mexico City': require('./cities/mexico-city.jpg'),

  // Brazil
  'Rio de Janeiro': require('./cities/rio-de-janeiro.jpg'),
  'São Paulo': require('./cities/sao-paulo.jpg'),

  // UAE
  Dubai: require('./cities/dubai.jpg'),

  // Singapore
  Singapore: require('./cities/singapore.jpg'),

  // Thailand
  Bangkok: require('./cities/bangkok.jpg'),

  // Indonesia
  Bali: require('./cities/bali.jpg'),
  Jakarta: require('./cities/jakarta.jpg'),

  // Morocco
  Marrakech: require('./cities/marrakech.jpg'),

  // Egypt
  Cairo: require('./cities/cairo.jpg'),

  // South Africa
  'Cape Town': require('./cities/cape-town.jpg'),

  // Default
  default: require('./cities/default-city.jpg'),
};

export const getCityImage = (cityName: string) => {
  return CITY_IMAGES[cityName] || CITY_IMAGES.default;
};
