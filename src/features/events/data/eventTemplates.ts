export interface EventTemplate {
  id: string;
  name: string;
  image: any; // Will be require() statements for local images
}

export interface EventCategory {
  id: string;
  name: string;
  templates: EventTemplate[];
}

export const EVENT_TEMPLATE_CATEGORIES: EventCategory[] = [
  // NIGHTLIFE & CLUBBING
  {
    id: 'nightlife',
    name: 'Nightlife & Clubs',
    templates: [
      {
        id: 'night-1',
        name: 'After Hours',
        image: require('@/assets/images/event-covers/nightlife/after-hours.jpg'),
      },
      {
        id: 'night-2',
        name: 'Bar Crawl',
        image: require('@/assets/images/event-covers/nightlife/bar-crawl.jpg'),
      },
      {
        id: 'night-4',
        name: 'Bottle Service',
        image: require('@/assets/images/event-covers/nightlife/bottle-service.jpg'),
      },
      {
        id: 'night-5',
        name: 'Club Opening',
        image: require('@/assets/images/event-covers/nightlife/club-opening.jpg'),
      },
      {
        id: 'night-7',
        name: 'Electro Night',
        image: require('@/assets/images/event-covers/nightlife/electro-night.jpg'),
      },
      {
        id: 'night-8',
        name: 'Friday Night Out',
        image: require('@/assets/images/event-covers/nightlife/friday-night-out.jpg'),
      },
      {
        id: 'night-9',
        name: 'Hip Hop Night',
        image: require('@/assets/images/event-covers/nightlife/hip-hop-night.jpg'),
      },
      {
        id: 'night-10',
        name: 'House Party',
        image: require('@/assets/images/event-covers/nightlife/house-party.jpg'),
      },
      {
        id: 'night-11',
        name: 'Karaoke Night',
        image: require('@/assets/images/event-covers/nightlife/karaoke-night.jpg'),
      },
      {
        id: 'night-12',
        name: 'Ladies Night',
        image: require('@/assets/images/event-covers/nightlife/ladies-night.jpg'),
      },
      {
        id: 'night-13',
        name: 'Latin Night',
        image: require('@/assets/images/event-covers/nightlife/latin-night.jpg'),
      },
      {
        id: 'night-14',
        name: 'Live DJ',
        image: require('@/assets/images/event-covers/nightlife/live-dj.jpg'),
      },
      {
        id: 'night-15',
        name: 'Lounge Night',
        image: require('@/assets/images/event-covers/nightlife/lounge-night.jpg'),
      },
      {
        id: 'night-16',
        name: 'Night Out',
        image: require('@/assets/images/event-covers/nightlife/night-out.jpg'),
      },
      {
        id: 'night-17',
        name: 'Pre Party',
        image: require('@/assets/images/event-covers/nightlife/pre-party.jpg'),
      },
      {
        id: 'night-18',
        name: 'Pub Crawl',
        image: require('@/assets/images/event-covers/nightlife/pub-crawl.jpg'),
      },
      {
        id: 'night-20',
        name: 'Rooftop Bar',
        image: require('@/assets/images/event-covers/nightlife/rooftop-bar.jpg'),
      },
      {
        id: 'night-21',
        name: 'Saturday Night',
        image: require('@/assets/images/event-covers/nightlife/saturday-night.jpg'),
      },
      {
        id: 'night-24',
        name: 'VIP Night',
        image: require('@/assets/images/event-covers/nightlife/vip-night.jpg'),
      },
      {
        id: 'night-25',
        name: 'Wine Bar',
        image: require('@/assets/images/event-covers/nightlife/wine-bar.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // APARTMENT & HOME PARTIES
  {
    id: 'apartment',
    name: 'Apartment & Home',
    templates: [
      {
        id: 'apt-1',
        name: 'Apartment Warming',
        image: require('@/assets/images/event-covers/apartment/apartment-warming.jpg'),
      },
      {
        id: 'apt-2',
        name: 'Balcony Party',
        image: require('@/assets/images/event-covers/apartment/balcony-party.jpg'),
      },
      {
        id: 'apt-4',
        name: 'Book Club',
        image: require('@/assets/images/event-covers/apartment/book-club.jpg'),
      },
      {
        id: 'apt-6',
        name: 'Cozy Night In',
        image: require('@/assets/images/event-covers/apartment/cozy-night-in.jpg'),
      },
      {
        id: 'apt-7',
        name: 'Flatmate Party',
        image: require('@/assets/images/event-covers/apartment/flatmate-party.jpg'),
      },
      {
        id: 'apt-8',
        name: 'Friends Gathering',
        image: require('@/assets/images/event-covers/apartment/friends-gathering.jpg'),
      },
      {
        id: 'apt-9',
        name: 'Game Night',
        image: require('@/assets/images/event-covers/apartment/game-night.jpg'),
      },
      {
        id: 'apt-11',
        name: 'Kitchen Party',
        image: require('@/assets/images/event-covers/apartment/kitchen-party.jpg'),
      },
      {
        id: 'apt-12',
        name: 'Living Room Party',
        image: require('@/assets/images/event-covers/apartment/living-room-party.jpg'),
      },
      {
        id: 'apt-13',
        name: 'Movie Marathon',
        image: require('@/assets/images/event-covers/apartment/movie-marathon.jpg'),
      },
      {
        id: 'apt-15',
        name: 'Pajama Party',
        image: require('@/assets/images/event-covers/apartment/pajama-party.jpg'),
      },
      {
        id: 'apt-16',
        name: 'Potluck Party',
        image: require('@/assets/images/event-covers/apartment/potluck-party.jpg'),
      },
      {
        id: 'apt-17',
        name: 'Roommate Reunion',
        image: require('@/assets/images/event-covers/apartment/roommate-reunion.jpg'),
      },
      {
        id: 'apt-19',
        name: 'Study Group',
        image: require('@/assets/images/event-covers/apartment/study-group.jpg'),
      },
      {
        id: 'apt-20',
        name: 'TV Series Finale',
        image: require('@/assets/images/event-covers/apartment/tv-series-finale.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // OUTDOOR ACTIVITIES
  {
    id: 'outdoor',
    name: 'Outdoor',
    templates: [
      {
        id: 'out-1',
        name: 'BBQ Party',
        image: require('@/assets/images/event-covers/outdoor/bbq-party.jpg'),
      },
      {
        id: 'out-2',
        name: 'Beach Day',
        image: require('@/assets/images/event-covers/outdoor/beach-day.jpg'),
      },
      {
        id: 'out-3',
        name: 'Camping Trip',
        image: require('@/assets/images/event-covers/outdoor/camping-trip.jpg'),
      },
      {
        id: 'out-4',
        name: 'Festival',
        image: require('@/assets/images/event-covers/outdoor/festival.jpg'),
      },
      {
        id: 'out-5',
        name: 'Garden Party',
        image: require('@/assets/images/event-covers/outdoor/garden-party.jpg'),
      },
      {
        id: 'out-6',
        name: 'Hiking Adventure',
        image: require('@/assets/images/event-covers/outdoor/hiking-adventure.jpg'),
      },
      {
        id: 'out-7',
        name: 'Music Festival',
        image: require('@/assets/images/event-covers/outdoor/music-festival.jpg'),
      },
      {
        id: 'out-8',
        name: 'Park Hangout',
        image: require('@/assets/images/event-covers/outdoor/park-hangout.jpg'),
      },
      {
        id: 'out-9',
        name: 'Picnic',
        image: require('@/assets/images/event-covers/outdoor/picnic.jpg'),
      },
      {
        id: 'out-10',
        name: 'Pool Party',
        image: require('@/assets/images/event-covers/outdoor/pool-party.jpg'),
      },
      {
        id: 'out-12',
        name: 'Street Fair',
        image: require('@/assets/images/event-covers/outdoor/street-fair.jpg'),
      },
      {
        id: 'out-13',
        name: 'Summer BBQ',
        image: require('@/assets/images/event-covers/outdoor/summer-bbq.jpg'),
      },
      {
        id: 'out-14',
        name: 'Terrace Party',
        image: require('@/assets/images/event-covers/outdoor/terrace-party.jpg'),
      },
      {
        id: 'out-15',
        name: 'Walking Tour',
        image: require('@/assets/images/event-covers/outdoor/walking-tour.jpg'),
      },
      {
        id: 'out-16',
        name: 'Weekend Getaway',
        image: require('@/assets/images/event-covers/outdoor/weekend-getaway.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // ACTIVITIES & SPORTS
  {
    id: 'activities',
    name: 'Activities',
    templates: [
      {
        id: 'act-1',
        name: 'Arcade Night',
        image: require('@/assets/images/event-covers/activities/arcade-night.jpg'),
      },
      {
        id: 'act-2',
        name: 'Billards Night',
        image: require('@/assets/images/event-covers/activities/billards-night.jpg'),
      },
      {
        id: 'act-3',
        name: 'Bowling Night',
        image: require('@/assets/images/event-covers/activities/bowling-night.jpg'),
      },
      {
        id: 'act-4',
        name: 'Card Game Night',
        image: require('@/assets/images/event-covers/activities/card-game-night.jpg'),
      },
      {
        id: 'act-5',
        name: 'Cycling Group',
        image: require('@/assets/images/event-covers/activities/cycling-group.jpg'),
      },
      {
        id: 'act-9',
        name: 'Laser Game',
        image: require('@/assets/images/event-covers/activities/laser-game.jpg'),
      },
      {
        id: 'act-10',
        name: 'Mini Golf',
        image: require('@/assets/images/event-covers/activities/mini-golf.jpg'),
      },
      {
        id: 'act-12',
        name: 'Quiz Night',
        image: require('@/assets/images/event-covers/activities/quiz-night.jpg'),
      },
      {
        id: 'act-13',
        name: 'Sports Game',
        image: require('@/assets/images/event-covers/activities/sports-game.jpg'),
      },
      {
        id: 'act-14',
        name: 'Swimming',
        image: require('@/assets/images/event-covers/activities/swimming.jpg'),
      },
      {
        id: 'act-16',
        name: 'Video Game Tournament',
        image: require('@/assets/images/event-covers/activities/video-game-tournament.jpg'),
      },
      {
        id: 'act-17',
        name: 'Yoga Session',
        image: require('@/assets/images/event-covers/activities/yoga-session.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // CULTURAL
  {
    id: 'cultural',
    name: 'Cultural',
    templates: [
      {
        id: 'cult-1',
        name: 'Art Exhibition',
        image: require('@/assets/images/event-covers/cultural/art-exhibition.jpg'),
      },
      {
        id: 'cult-3',
        name: 'Book Launch',
        image: require('@/assets/images/event-covers/cultural/book-launch.jpg'),
      },
      {
        id: 'cult-4',
        name: 'Comedy Night',
        image: require('@/assets/images/event-covers/cultural/comedy-night.jpg'),
      },
      {
        id: 'cult-5',
        name: 'Concert',
        image: require('@/assets/images/event-covers/cultural/concert.jpg'),
      },
      {
        id: 'cult-6',
        name: 'Film Screening',
        image: require('@/assets/images/event-covers/cultural/film-screening.jpg'),
      },
      {
        id: 'cult-7',
        name: 'Jazz Night',
        image: require('@/assets/images/event-covers/cultural/jazz-night.jpg'),
      },
      {
        id: 'cult-8',
        name: 'Museum Visit',
        image: require('@/assets/images/event-covers/cultural/museum-visit.jpg'),
      },
      {
        id: 'cult-9',
        name: 'Open Mic',
        image: require('@/assets/images/event-covers/cultural/open-mic.jpg'),
      },
      {
        id: 'cult-10',
        name: 'Poetry Night',
        image: require('@/assets/images/event-covers/cultural/poetry-night.jpg'),
      },
      {
        id: 'cult-11',
        name: 'Stand Up Comedy',
        image: require('@/assets/images/event-covers/cultural/stand-up-comedy.jpg'),
      },
      {
        id: 'cult-12',
        name: 'Theater Play',
        image: require('@/assets/images/event-covers/cultural/theater-play.jpg'),
      },
      {
        id: 'cult-13',
        name: 'Vernissage',
        image: require('@/assets/images/event-covers/cultural/vernissage.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // SOCIAL MEETUPS
  {
    id: 'meetup',
    name: 'Meetups',
    templates: [
      {
        id: 'meet-2',
        name: 'Book Club',
        image: require('@/assets/images/event-covers/meetup/book-club.jpg'),
      },
      {
        id: 'meet-3',
        name: 'Community Meetup',
        image: require('@/assets/images/event-covers/meetup/community-meetup.jpg'),
      },
      {
        id: 'meet-4',
        name: 'Language Exchange',
        image: require('@/assets/images/event-covers/meetup/language-exchange.jpg'),
      },
      {
        id: 'meet-5',
        name: 'Networking Event',
        image: require('@/assets/images/event-covers/meetup/networking-event.jpg'),
      },
      {
        id: 'meet-6',
        name: 'Professional Meetup',
        image: require('@/assets/images/event-covers/meetup/professional-meetup.jpg'),
      },
      {
        id: 'meet-7',
        name: 'Social Club',
        image: require('@/assets/images/event-covers/meetup/social-club.jpg'),
      },
      {
        id: 'meet-8',
        name: 'Speed Dating',
        image: require('@/assets/images/event-covers/meetup/speed-dating.jpg'),
      },
      {
        id: 'meet-9',
        name: 'Student Meetup',
        image: require('@/assets/images/event-covers/meetup/student-meetup.jpg'),
      },
      {
        id: 'meet-10',
        name: 'Support Group',
        image: require('@/assets/images/event-covers/meetup/support-group.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // CASUAL HANGOUTS
  {
    id: 'casual',
    name: 'Casual',
    templates: [
      {
        id: 'cas-1',
        name: 'After Work',
        image: require('@/assets/images/event-covers/casual/after-work.jpg'),
      },
      {
        id: 'cas-2',
        name: 'Brunch',
        image: require('@/assets/images/event-covers/casual/brunch.jpg'),
      },
      {
        id: 'cas-3',
        name: 'Coffee Morning',
        image: require('@/assets/images/event-covers/casual/coffee-morning.jpg'),
      },
      {
        id: 'cas-4',
        name: 'Happy Hour',
        image: require('@/assets/images/event-covers/casual/happy-hour.jpg'),
      },
      {
        id: 'cas-6',
        name: 'Lunch Break',
        image: require('@/assets/images/event-covers/casual/lunch-break.jpg'),
      },
      {
        id: 'cas-7',
        name: 'Shopping Day',
        image: require('@/assets/images/event-covers/casual/shopping-day.jpg'),
      },
      {
        id: 'cas-8',
        name: 'Spa Day',
        image: require('@/assets/images/event-covers/casual/spa-day.jpg'),
      },
      {
        id: 'cas-9',
        name: 'Weekend Brunch',
        image: require('@/assets/images/event-covers/casual/weekend-brunch.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // DINING EXPERIENCES
  {
    id: 'dining',
    name: 'Dining',
    templates: [
      {
        id: 'dine-1',
        name: 'Cheese & Wine',
        image: require('@/assets/images/event-covers/dining/cheese-wine.jpg'),
      },
      {
        id: 'dine-2',
        name: 'Cocktail Night',
        image: require('@/assets/images/event-covers/dining/cocktail-night.jpg'),
      },
      {
        id: 'dine-3',
        name: 'Cooking Class',
        image: require('@/assets/images/event-covers/dining/cooking-class.jpg'),
      },
      {
        id: 'dine-4',
        name: 'Dinner Party',
        image: require('@/assets/images/event-covers/dining/dinner-party.jpg'),
      },
      {
        id: 'dine-5',
        name: 'Food Festival',
        image: require('@/assets/images/event-covers/dining/food-festival.jpg'),
      },
      {
        id: 'dine-7',
        name: 'Pizza Night',
        image: require('@/assets/images/event-covers/dining/pizza-night.jpg'),
      },
      {
        id: 'dine-8',
        name: 'Potluck',
        image: require('@/assets/images/event-covers/dining/potluck.jpg'),
      },
      {
        id: 'dine-9',
        name: 'Restaurant Week',
        image: require('@/assets/images/event-covers/dining/restaurant-week.jpg'),
      },
      {
        id: 'dine-10',
        name: 'Sushi Night',
        image: require('@/assets/images/event-covers/dining/sushi-night.jpg'),
      },
      {
        id: 'dine-11',
        name: 'Taco Tuesday',
        image: require('@/assets/images/event-covers/dining/taco-tuesday.jpg'),
      },
      {
        id: 'dine-12',
        name: 'Wine Tasting',
        image: require('@/assets/images/event-covers/dining/wine-tasting.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // ENTERTAINMENT
  {
    id: 'entertainment',
    name: 'Entertainment',
    templates: [
      {
        id: 'ent-1',
        name: 'Amusement Park',
        image: require('@/assets/images/event-covers/entertainment/amusement-park.jpg'),
      },
      {
        id: 'ent-4',
        name: 'Comedy Show',
        image: require('@/assets/images/event-covers/entertainment/comedy-show.jpg'),
      },
      {
        id: 'ent-5',
        name: 'Magic Show',
        image: require('@/assets/images/event-covers/entertainment/magic-show.jpg'),
      },
      {
        id: 'ent-6',
        name: 'Movie Night',
        image: require('@/assets/images/event-covers/entertainment/movie-night.jpg'),
      },
      {
        id: 'ent-7',
        name: 'Theme Park',
        image: require('@/assets/images/event-covers/entertainment/theme-park.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // SPECIAL OCCASIONS
  {
    id: 'party',
    name: 'Parties & Celebrations',
    templates: [
      {
        id: 'party-2',
        name: 'Baby Shower',
        image: require('@/assets/images/event-covers/party/baby-shower.jpg'),
      },
      {
        id: 'party-4',
        name: 'Bachelorette Party',
        image: require('@/assets/images/event-covers/party/bachelorette-party.jpg'),
      },
      {
        id: 'party-5',
        name: 'Birthday Party',
        image: require('@/assets/images/event-covers/party/birthday-party.jpg'),
      },
      {
        id: 'party-7',
        name: 'Farewell Party',
        image: require('@/assets/images/event-covers/party/farewell-party.jpg'),
      },
      {
        id: 'party-8',
        name: 'Gender Reveal',
        image: require('@/assets/images/event-covers/party/gender-reveal.jpg'),
      },
      {
        id: 'party-10',
        name: 'Retirement Party',
        image: require('@/assets/images/event-covers/party/retirement-party.jpg'),
      },
      {
        id: 'party-11',
        name: 'Surprise Party',
        image: require('@/assets/images/event-covers/party/surprise-party.jpg'),
      },
      {
        id: 'party-12',
        name: 'Welcome Party',
        image: require('@/assets/images/event-covers/party/welcome-party.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // WEDDINGS
  {
    id: 'wedding',
    name: 'Weddings',
    templates: [
      {
        id: 'wed-1',
        name: 'Barn Wedding',
        image: require('@/assets/images/event-covers/wedding/barn-wedding.jpg'),
      },
      {
        id: 'wed-2',
        name: 'Beach Wedding',
        image: require('@/assets/images/event-covers/wedding/beach-wedding.jpg'),
      },
      {
        id: 'wed-3',
        name: 'Castle Wedding',
        image: require('@/assets/images/event-covers/wedding/castle-wedding.jpg'),
      },
      {
        id: 'wed-4',
        name: 'Church Wedding',
        image: require('@/assets/images/event-covers/wedding/church-wedding.jpg'),
      },
      {
        id: 'wed-5',
        name: 'City Wedding',
        image: require('@/assets/images/event-covers/wedding/city-wedding.jpg'),
      },
      {
        id: 'wed-6',
        name: 'Dancing Wedding',
        image: require('@/assets/images/event-covers/wedding/dancing-wedding.jpg'),
      },
      {
        id: 'wed-8',
        name: 'Engagement Party',
        image: require('@/assets/images/event-covers/wedding/engagement-party.jpg'),
      },
      {
        id: 'wed-9',
        name: 'Garden Wedding',
        image: require('@/assets/images/event-covers/wedding/garden-wedding.jpg'),
      },
      {
        id: 'wed-11',
        name: 'Rehearsal Dinner',
        image: require('@/assets/images/event-covers/wedding/rehearsal-dinner.jpg'),
      },
      {
        id: 'wed-12',
        name: 'Rustic Wedding',
        image: require('@/assets/images/event-covers/wedding/rustic-wedding.jpg'),
      },
      {
        id: 'wed-13',
        name: 'Traditional Wedding',
        image: require('@/assets/images/event-covers/wedding/traditional-wedding.jpg'),
      },
      {
        id: 'wed-14',
        name: 'Vineyard Wedding',
        image: require('@/assets/images/event-covers/wedding/vineyard-wedding.jpg'),
      },
      {
        id: 'wed-15',
        name: 'Wedding Ceremony',
        image: require('@/assets/images/event-covers/wedding/wedding-ceremony.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // SEASONAL EVENTS
  {
    id: 'seasonal',
    name: 'Seasonal',
    templates: [
      {
        id: 'season-1',
        name: 'Black Friday',
        image: require('@/assets/images/event-covers/seasonal/black-friday.jpg'),
      },
      {
        id: 'season-4',
        name: 'Halloween',
        image: require('@/assets/images/event-covers/seasonal/halloween.jpg'),
      },
      {
        id: 'season-5',
        name: 'New Year Eve',
        image: require('@/assets/images/event-covers/seasonal/new-year-eve.jpg'),
      },
      {
        id: 'season-7',
        name: 'Spring Festival',
        image: require('@/assets/images/event-covers/seasonal/spring-festival.jpg'),
      },
      {
        id: 'season-8',
        name: 'Summer Beach',
        image: require('@/assets/images/event-covers/seasonal/summer-beach.jpg'),
      },
      {
        id: 'season-9',
        name: 'Thanksgiving',
        image: require('@/assets/images/event-covers/seasonal/thanksgiving.jpg'),
      },
      {
        id: 'season-10',
        name: "Valentine's Day",
        image: require('@/assets/images/event-covers/seasonal/valentines-day.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // SPORTS
  {
    id: 'sports',
    name: 'Sports & Games',
    templates: [
      {
        id: 'sport-2',
        name: 'Basketball Game',
        image: require('@/assets/images/event-covers/sports/basketball-game.jpg'),
      },
      {
        id: 'sport-3',
        name: 'Beach Volleyball',
        image: require('@/assets/images/event-covers/sports/beach-volleyball.jpg'),
      },
      {
        id: 'sport-4',
        name: 'Boxing Match',
        image: require('@/assets/images/event-covers/sports/boxing-match.jpg'),
      },
      {
        id: 'sport-6',
        name: 'Golf Tournament',
        image: require('@/assets/images/event-covers/sports/golf-tournament.jpg'),
      },
      {
        id: 'sport-7',
        name: 'Hockey Game',
        image: require('@/assets/images/event-covers/sports/hockey-game.jpg'),
      },
      {
        id: 'sport-8',
        name: 'Marathon',
        image: require('@/assets/images/event-covers/sports/marathon.jpg'),
      },
      {
        id: 'sport-9',
        name: 'Soccer Match',
        image: require('@/assets/images/event-covers/sports/soccer-match.jpg'),
      },
      {
        id: 'sport-10',
        name: 'Sports Watch Party',
        image: require('@/assets/images/event-covers/sports/sports-watch-party.jpg'),
      },
      {
        id: 'sport-11',
        name: 'Tennis Match',
        image: require('@/assets/images/event-covers/sports/tennis-match.jpg'),
      },
      {
        id: 'sport-12',
        name: 'Volleyball Game',
        image: require('@/assets/images/event-covers/sports/volleyball-game.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // CORPORATE EVENTS
  {
    id: 'corporate',
    name: 'Corporate',
    templates: [
      {
        id: 'corp-1',
        name: 'Annual Meeting',
        image: require('@/assets/images/event-covers/corporate/annual-meeting.jpg'),
      },
      {
        id: 'corp-2',
        name: 'Conference',
        image: require('@/assets/images/event-covers/corporate/conference.jpg'),
      },
      {
        id: 'corp-3',
        name: 'Corporate Dinner',
        image: require('@/assets/images/event-covers/corporate/corporate-dinner.jpg'),
      },
      {
        id: 'corp-4',
        name: 'Grand Opening',
        image: require('@/assets/images/event-covers/corporate/grand-opening.jpg'),
      },
      {
        id: 'corp-5',
        name: 'Hackathon',
        image: require('@/assets/images/event-covers/corporate/hackathon.jpg'),
      },
      {
        id: 'corp-6',
        name: 'Holiday Party',
        image: require('@/assets/images/event-covers/corporate/holiday-party.jpg'),
      },
      {
        id: 'corp-8',
        name: 'Product Launch',
        image: require('@/assets/images/event-covers/corporate/product-launch.jpg'),
      },
      {
        id: 'corp-9',
        name: 'Team Building',
        image: require('@/assets/images/event-covers/corporate/team-building.jpg'),
      },
      {
        id: 'corp-10',
        name: 'Trade Show',
        image: require('@/assets/images/event-covers/corporate/trade-show.jpg'),
      },
      {
        id: 'corp-11',
        name: 'Training Workshop',
        image: require('@/assets/images/event-covers/corporate/training-workshop.jpg'),
      },
      {
        id: 'corp-12',
        name: 'Webinar',
        image: require('@/assets/images/event-covers/corporate/webinar.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // TRAVEL & ADVENTURES
  {
    id: 'travel',
    name: 'Travel & Adventures',
    templates: [
      {
        id: 'travel-1',
        name: 'City Tour',
        image: require('@/assets/images/event-covers/travel/city-tour.jpg'),
      },
      {
        id: 'travel-2',
        name: 'Group Trip',
        image: require('@/assets/images/event-covers/travel/group-trip.jpg'),
      },
      {
        id: 'travel-3',
        name: 'Local Fair',
        image: require('@/assets/images/event-covers/travel/local-fair.jpg'),
      },
      {
        id: 'travel-4',
        name: 'Road Trip',
        image: require('@/assets/images/event-covers/travel/road-trip.jpg'),
      },
      {
        id: 'travel-5',
        name: 'Ski Trip',
        image: require('@/assets/images/event-covers/travel/ski-trip.jpg'),
      },
      {
        id: 'travel-6',
        name: 'Weekend Trip',
        image: require('@/assets/images/event-covers/travel/weekend-trip.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },

  // WELLNESS
  {
    id: 'wellness',
    name: 'Wellness & Health',
    templates: [
      {
        id: 'well-1',
        name: 'Fitness Class',
        image: require('@/assets/images/event-covers/wellness/fitness-class.jpg'),
      },
      {
        id: 'well-3',
        name: 'Running Club',
        image: require('@/assets/images/event-covers/wellness/running-club.jpg'),
      },
      {
        id: 'well-4',
        name: 'Wellness Retreat',
        image: require('@/assets/images/event-covers/wellness/wellness-retreat.jpg'),
      },
      {
        id: 'well-5',
        name: 'Yoga Class',
        image: require('@/assets/images/event-covers/wellness/yoga-class.jpg'),
      },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  },
];

// Export TEMPLATES as an alias for EVENT_TEMPLATE_CATEGORIES for backward compatibility
export const TEMPLATES = EVENT_TEMPLATE_CATEGORIES;

// Export other constants that might be needed
export const FONTS = [
  { id: '1', name: 'Classic Invite', value: 'System' },
  { id: '2', name: 'Handwriting', value: 'System' },
  { id: '3', name: 'AFTERPARTY', value: 'System' },
  { id: '4', name: 'Modern', value: 'System' },
  { id: '5', name: 'Elegant', value: 'System' },
  { id: '6', name: 'Fun Script', value: 'System' },
  { id: '7', name: 'Bold Impact', value: 'System' },
];

export const BACKGROUNDS = [
  {
    id: '1',
    type: 'gradient',
    colors: ['#FFB6C1', '#E6E6FA'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    id: '2',
    type: 'gradient',
    colors: ['#87CEEB', '#98FB98'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    id: '3',
    type: 'gradient',
    colors: ['#4169E1', '#00CED1'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    id: '4',
    type: 'gradient',
    colors: ['#90EE90', '#FFD700'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    id: '5',
    type: 'gradient',
    colors: ['#00CED1', '#FF69B4'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    id: '6',
    type: 'gradient',
    colors: ['#FF69B4', '#FFB6C1'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    id: '7',
    type: 'gradient',
    colors: ['#E6E6FA', '#D8BFD8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
];

export const STICKER_CATEGORIES = [
  {
    id: 'party',
    name: 'Party',
    stickers: ['🎉', '🎂', '🍾', '🎆', '🎁', '🎈', '🥳', '🎊', '🪩', '🍻', '🥂', '🎪'],
  },
  {
    id: 'music',
    name: 'Music',
    stickers: ['🎤', '🎵', '🎶', '🎧', '🎸', '🥁', '🎹', '🎺', '🎷', '🎻', '🎼', '🎙️'],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    stickers: ['🍕', '🍔', '🍹', '☕', '🍺', '🍰', '🍿', '🌮', '🍝', '🍣', '🍷', '🧁'],
  },
  {
    id: 'activities',
    name: 'Activities',
    stickers: ['🏀', '⚽', '🎮', '🎨', '📸', '🎯', '🎬', '🎭', '🏖️', '🎢', '🎳', '🏕️'],
  },
  {
    id: 'decorative',
    name: 'Decorative',
    stickers: ['✨', '💫', '⭐', '💖', '❤️', '🌟', '🔥', '💥', '🌈', '☀️', '🌙', '💎'],
  },
];
