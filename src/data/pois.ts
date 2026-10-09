// Nearby landmarks, geocoded once via OneMap (onemap.gov.sg) search.
export type PoiKind = 'mrt' | 'food' | 'mall' | 'school' | 'landmark' | 'health' | 'sport';

export interface Poi {
  name: string;
  kind: PoiKind;
  lng: number;
  lat: number;
}

export const POIS: Poi[] = [
  { name: 'Queenstown MRT (EW19)', kind: 'mrt', lat: 1.294551, lng: 103.806077 },
  { name: 'Commonwealth MRT (EW20)', kind: 'mrt', lat: 1.302502, lng: 103.798228 },
  { name: 'Redhill MRT (EW18)', kind: 'mrt', lat: 1.289635, lng: 103.81674 },
  { name: 'Margaret Drive Hawker Centre', kind: 'food', lat: 1.297426, lng: 103.80471 },
  { name: 'Mei Ling Market & Food Centre', kind: 'food', lat: 1.293236, lng: 103.802903 },
  { name: 'Queensway Shopping Centre', kind: 'mall', lat: 1.287595, lng: 103.803397 },
  { name: 'Anchorpoint', kind: 'mall', lat: 1.288615, lng: 103.805009 },
  { name: 'IKEA Alexandra', kind: 'mall', lat: 1.287974, lng: 103.805808 },
  { name: 'Queenstown Primary School', kind: 'school', lat: 1.295594, lng: 103.807548 },
  { name: 'Queenstown Secondary School', kind: 'school', lat: 1.293521, lng: 103.81319 },
  { name: "Crescent Girls' School", kind: 'school', lat: 1.293319, lng: 103.817544 },
  { name: 'Alexandra Hospital', kind: 'health', lat: 1.285481, lng: 103.80018 },
  { name: 'Queenstown Stadium', kind: 'sport', lat: 1.296206, lng: 103.802226 },
  { name: 'SkyVille @ Dawson', kind: 'landmark', lat: 1.295794, lng: 103.809264 },
  { name: 'SkyTerrace @ Dawson', kind: 'landmark', lat: 1.295121, lng: 103.81115 },
];

export const POI_ICON: Record<PoiKind, string> = {
  mrt: 'M', food: '🍜', mall: '🛍', school: '🎓', landmark: '🏢', health: '✚', sport: '⚽',
};
