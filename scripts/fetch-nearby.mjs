// Fetches nearby amenities around Penrith from OpenStreetMap (Overpass API) and writes
// src/data/nearby.json. Run occasionally: `node scripts/fetch-nearby.mjs`.
import { writeFileSync } from 'node:fs';

const LAT = 1.295953, LNG = 103.808726;
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const around = (r) => `(around:${r},${LAT},${LNG})`;
const query = `[out:json][timeout:90];
(
  nwr["railway"="station"]["station"~"subway|light_rail"]${around(2500)};
  nwr["public_transport"="station"]["subway"="yes"]${around(2500)};
  node["highway"="bus_stop"]${around(600)};
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|ice_cream)$"]${around(1200)};
  nwr["shop"~"^(supermarket|convenience|greengrocer|bakery|butcher|seafood)$"]${around(1500)};
  nwr["amenity"="marketplace"]${around(1500)};
  nwr["amenity"~"^(school|kindergarten|childcare|library|university|college)$"]${around(2000)};
  nwr["amenity"~"^(clinic|doctors|hospital|pharmacy|dentist)$"]${around(1500)};
  nwr["shop"="chemist"]${around(1500)};
  nwr["leisure"~"^(park|fitness_centre|sports_centre|swimming_pool|stadium|playground)$"]["name"]${around(1500)};
  nwr["shop"="mall"]${around(2500)};
  nwr["amenity"~"^(community_centre|place_of_worship|post_office|bank|atm)$"]["name"]${around(1000)};
);
out center tags;`;

let data;
for (const url of ENDPOINTS) {
  try {
    const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'User-Agent': 'penrith-3d/0.1' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    console.log('ok from', url);
    break;
  } catch (e) {
    console.warn(url, e.message);
  }
}
if (!data) process.exit(1);

const R = 6371000;
const dist = (lat, lng) => {
  const dLat = ((lat - LAT) * Math.PI) / 180, dLng = ((lng - LNG) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((LAT * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

function classify(t) {
  if (t.railway === 'station' || (t.public_transport === 'station' && t.subway === 'yes')) return ['transport', 'mrt'];
  if (t.highway === 'bus_stop') return ['transport', 'bus'];
  if (/hawker|food ?court|food cent|market|kopitiam|eating house|coffee ?shop|canteen/i.test(t.name ?? '') && ['food_court', 'restaurant', 'fast_food', 'cafe'].includes(t.amenity)) return ['food', 'hawker'];
  if (t.amenity === 'food_court') return ['food', 'restaurant'];
  if (t.amenity === 'cafe' || t.amenity === 'ice_cream') return ['food', 'cafe'];
  if (t.amenity === 'fast_food') return ['food', 'fast_food'];
  if (t.amenity === 'restaurant') return ['food', 'restaurant'];
  if (t.amenity === 'bar' || t.amenity === 'pub') return ['food', 'bar'];
  if (t.shop === 'supermarket') return ['grocery', /7.?eleven|cheers/i.test(t.name ?? t.brand ?? '') ? 'convenience' : 'supermarket'];
  if (t.amenity === 'marketplace') return ['grocery', 'wet_market'];
  if (t.shop === 'convenience') return ['grocery', 'convenience'];
  if (['greengrocer', 'bakery', 'butcher', 'seafood'].includes(t.shop)) return ['grocery', 'speciality'];
  if (t.amenity === 'school') {
    const n = t.name ?? '';
    if (/primary/i.test(n)) return ['education', 'primary'];
    if (/secondary|high school|gan eng seng school/i.test(n)) return ['education', 'secondary'];
    if (/pre-?school|kindergarten|skool|kidz|baby|sparkletots|mindchamps|beaver|playgroup|childcare/i.test(n)) return ['education', 'preschool'];
    if (/international|tanglin trust|nlcs|collegiate|\bISS\b|tanglin school/i.test(n)) return ['education', 'international'];
    return ['education', 'other'];
  }
  if (['kindergarten', 'childcare'].includes(t.amenity)) return ['education', 'preschool'];
  if (['university', 'college'].includes(t.amenity)) return ['education', 'tertiary'];
  if (t.amenity === 'library') return ['education', 'library'];
  if (t.amenity === 'hospital') return ['health', /urgent care/i.test(t.name ?? '') ? 'clinic' : 'hospital'];
  if (['clinic', 'doctors', 'dentist'].includes(t.amenity)) return ['health', /polyclinic/i.test(t.name ?? '') ? 'polyclinic' : /dental/i.test(t.name ?? '') || t.amenity === 'dentist' ? 'dental' : 'clinic'];
  if (t.amenity === 'pharmacy' || t.shop === 'chemist') return ['health', 'pharmacy'];
  if (t.leisure === 'park' || t.leisure === 'playground') return ['leisure', 'park'];
  if (['fitness_centre', 'sports_centre', 'swimming_pool', 'stadium'].includes(t.leisure)) return ['leisure', 'sport'];
  if (t.shop === 'mall') return ['shopping', 'mall'];
  if (t.amenity === 'community_centre') return ['services', 'community'];
  if (['post_office', 'bank', 'atm'].includes(t.amenity)) return ['services', t.amenity];
  if (t.amenity === 'place_of_worship') return ['services', 'worship'];
  return null;
}

// Junk / non-useful entries seen in OSM around here.
const EXCLUDE = /^(class room \d+|pharmacy|kids playground|kindergarden playground|infant library|junior library|senior library|sitorus library|casual poet library)$|mortuary|nursing training|tutors|dive centre|baking school|school of the arts|academy|management|institute/i;

const out = [];
const seen = new Set();
for (const el of data.elements) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
  if (lat == null) continue;
  const c = classify(t);
  if (!c) continue;
  let name = t['name:en'] ?? t.name ?? t.brand ?? (c[1] === 'bus' && t.ref ? `Bus stop ${t.ref}` : null);
  if (!name || EXCLUDE.test(name)) continue;
  if (c[1] === 'bus' && t.ref && !name.includes(t.ref)) name = `${name} (${t.ref})`;
  const key = `${c[1]}|${name}`;
  if (seen.has(key)) continue; // MRT stations are mapped several times; keep one
  seen.add(key);
  out.push({
    name, cat: c[0], sub: c[1], lat: +lat.toFixed(6), lng: +lng.toFixed(6), d: dist(lat, lng),
    ...(t.cuisine ? { cuisine: t.cuisine.replace(/_/g, ' ').replace(/;/g, ', ') } : {}),
    ...(t.opening_hours ? { hours: t.opening_hours } : {}),
    ...(t.route_ref ? { routes: t.route_ref.replace(/;/g, ', ') } : {}),
  });
}
out.sort((a, b) => a.d - b.d);
writeFileSync(new URL('../src/data/nearby.json', import.meta.url), JSON.stringify(out, null, 0));
const counts = {};
for (const p of out) counts[`${p.cat}/${p.sub}`] = (counts[`${p.cat}/${p.sub}`] ?? 0) + 1;
console.log(out.length, 'places', counts);
