// Nearby amenities from OpenStreetMap, snapshotted by scripts/fetch-nearby.mjs.
// Distances (`d`, metres) are straight-line from the middle of the Penrith site.
import raw from './nearby.json';

export type CategoryId = 'transport' | 'food' | 'grocery' | 'education' | 'health' | 'leisure' | 'shopping' | 'services';

export interface Place {
  name: string;
  cat: CategoryId;
  sub: string;
  lat: number;
  lng: number;
  d: number;
  cuisine?: string;
  hours?: string;
  routes?: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
  defaultOn: boolean;
  /** Sub-type labels, in the order they're listed. */
  subs: Record<string, string>;
  /** Sub-types important enough to show their name on the map without hovering. */
  keySubs: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'transport', label: 'Transport', icon: '🚇', color: '#0a8f4a', defaultOn: true,
    subs: { mrt: 'MRT station', bus: 'Bus stop' }, keySubs: ['mrt'],
  },
  {
    id: 'food', label: 'Food', icon: '🍜', color: '#e8590c', defaultOn: true,
    subs: { hawker: 'Hawker / food court', restaurant: 'Restaurant', cafe: 'Café', fast_food: 'Fast food', bar: 'Bar' },
    keySubs: ['hawker'],
  },
  {
    id: 'grocery', label: 'Groceries', icon: '🛒', color: '#2f9e44', defaultOn: true,
    subs: { supermarket: 'Supermarket', wet_market: 'Wet market', convenience: 'Convenience store', speciality: 'Bakery / speciality' },
    keySubs: ['supermarket', 'wet_market'],
  },
  {
    id: 'education', label: 'Schools', icon: '🎓', color: '#5f3dc4', defaultOn: false,
    subs: { primary: 'Primary school', secondary: 'Secondary school', preschool: 'Preschool', international: 'International school', tertiary: 'Tertiary', library: 'Library', other: 'Other school' },
    keySubs: ['primary', 'secondary', 'library'],
  },
  {
    id: 'health', label: 'Healthcare', icon: '✚', color: '#d6336c', defaultOn: false,
    subs: { polyclinic: 'Polyclinic', hospital: 'Hospital', clinic: 'GP / clinic', dental: 'Dental', pharmacy: 'Pharmacy' },
    keySubs: ['polyclinic', 'hospital'],
  },
  {
    id: 'leisure', label: 'Parks & fitness', icon: '🌳', color: '#37b24d', defaultOn: false,
    subs: { park: 'Park / playground', sport: 'Gym / sports / pool' }, keySubs: ['park', 'sport'],
  },
  {
    id: 'shopping', label: 'Malls', icon: '🛍', color: '#1c7ed6', defaultOn: false,
    subs: { mall: 'Shopping mall' }, keySubs: ['mall'],
  },
  {
    id: 'services', label: 'Community', icon: '🏛', color: '#868e96', defaultOn: false,
    subs: { community: 'Community centre', post_office: 'Post office', bank: 'Bank', atm: 'ATM', worship: 'Place of worship' },
    keySubs: ['community'],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

const HAWKER_NAME = /hawker|food ?court|food cent|market|kopitiam|eating house|coffee ?shop|canteen/i;

export const PLACES: Place[] = (raw as Place[])
  .filter((p) => p.cat in CATEGORY_BY_ID)
  // OSM sometimes tags ordinary restaurants as food courts.
  .map((p) => (p.sub === 'hawker' && !HAWKER_NAME.test(p.name) ? { ...p, sub: 'restaurant' } : p));

/** Rough walking time: straight-line distance × 1.3 detour factor at ~80 m/min. */
export const walkMinutes = (d: number) => Math.max(1, Math.round((d * 1.3) / 80));

export const formatDistance = (d: number) => (d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`);

export const DISTANCE_RINGS = [500, 1000, 2000];
