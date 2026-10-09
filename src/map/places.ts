import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import { MY_UNIT } from '../data/penrith';
import { unitPoint } from '../data/geometry';
import { CATEGORIES, CATEGORY_BY_ID, PLACES, formatDistance, walkMinutes, type CategoryId, type Place } from '../data/nearby';

const unitLngLat = unitPoint(MY_UNIT.stack, MY_UNIT.floor).lngLat;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const iconFor = (p: Place) => (p.sub === 'mrt' ? 'M' : p.sub === 'bus' ? '🚌' : CATEGORY_BY_ID[p.cat].icon);

export function placeDetailHtml(p: Place): string {
  const cat = CATEGORY_BY_ID[p.cat];
  const extra = [
    p.routes && `<div class="pp-row"><b>Buses</b> ${esc(p.routes)}</div>`,
    p.cuisine && `<div class="pp-row"><b>Cuisine</b> ${esc(p.cuisine)}</div>`,
    p.hours && `<div class="pp-row"><b>Hours</b> ${esc(p.hours)}</div>`,
  ].filter(Boolean).join('');
  return `<div class="pp">
    <div class="pp-type" style="color:${cat.color}">${cat.icon} ${esc(cat.subs[p.sub] ?? p.sub)}</div>
    <div class="pp-name">${esc(p.name)}</div>
    <div class="pp-dist">${formatDistance(p.d)} from Penrith · ~${walkMinutes(p.d)} min walk</div>
    ${extra}
  </div>`;
}

/** Everything in a group, listed by category then distance. */
function groupListHtml(anchor: Place, members: Place[]): string {
  const sections = CATEGORIES.map((c) => {
    const items = members.filter((m) => m.cat === c.id).sort((a, b) => a.d - b.d);
    if (!items.length) return '';
    const rows = items.map((m) => {
      const detail = m.routes ? `Buses ${m.routes}` : m.cuisine ?? c.subs[m.sub] ?? m.sub;
      return `<li><span class="gl-name">${esc(m.name)}</span><span class="gl-sub">${esc(detail)}</span></li>`;
    }).join('');
    return `<div class="gl-sec"><div class="gl-head" style="color:${c.color}">${c.icon} ${c.label} · ${items.length}</div><ul>${rows}</ul></div>`;
  }).join('');
  return `<div class="pp gl">
    <div class="pp-name">${esc(anchor.name)}</div>
    <div class="pp-dist">${members.length} place${members.length === 1 ? '' : 's'} here · ${formatDistance(anchor.d)} from Penrith · ~${walkMinutes(anchor.d)} min walk</div>
    <div class="gl-body">${sections}</div>
  </div>`;
}

/** Which place should name a group: malls first, then hawker centres, MRT, supermarkets… */
function priority(p: Place): number {
  const order: Record<string, number> = {
    mall: 0, mrt: 1, hawker: 2, supermarket: 3, wet_market: 3, polyclinic: 4, hospital: 4, primary: 5,
    secondary: 6, community: 6, library: 6, park: 7, sport: 7,
  };
  return order[p.sub] ?? 10;
}

// Approximate on-screen size of a marker (icon + always-visible name), for overlap tests.
const LABEL_PX_PER_CHAR = 6.3;
const boxFor = (pt: { x: number; y: number }, label: string) => {
  const w = 24 + 12 + label.length * LABEL_PX_PER_CHAR;
  return { x0: pt.x - 12, x1: pt.x - 12 + w, y0: pt.y - 13, y1: pt.y + 13 };
};
type Box = ReturnType<typeof boxFor>;
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Nearby places as always-labelled HTML markers. Places whose labels would collide on
 * screen are grouped under one marker (named after the most important member, e.g. the
 * mall they're in); clicking a group lists everything in it. Regrouped after every move.
 */
export function createPlaceMarkers(map: MlMap) {
  const popup = new maplibregl.Popup({ offset: 14, closeButton: true, maxWidth: '300px', className: 'place-popup' });
  const ranked = [...PLACES].sort((a, b) => priority(a) - priority(b) || a.d - b.d);
  let visibleCats = new Set<CategoryId>();
  let facing: number | null = null;
  let focusedPlace: Place | null = null;
  let markers: maplibregl.Marker[] = [];

  const isBehind = (p: Place) => {
    if (facing == null) return false;
    const dE = (p.lng - unitLngLat[0]) * Math.cos((unitLngLat[1] * Math.PI) / 180);
    const dN = p.lat - unitLngLat[1];
    const b = (Math.atan2(dE, dN) * 180) / Math.PI;
    return Math.abs(((b - facing + 540) % 360) - 180) > 75;
  };

  const rebuild = () => {
    for (const m of markers) m.remove();
    markers = [];
    // `ghost`: a mall that isn't itself toggled on, kept only to name the group of places inside it.
    const groups: { anchor: Place; members: Place[]; box: Box; ghost: boolean }[] = [];
    const canvas = map.getCanvas();
    const W = canvas.clientWidth, H = canvas.clientHeight;

    for (const p of ranked) {
      const ghost = !visibleCats.has(p.cat);
      if ((ghost && p.sub !== 'mall') || isBehind(p)) continue;
      const pt = map.project([p.lng, p.lat]);
      if (pt.x < -200 || pt.y < -50 || pt.x > W + 50 || pt.y > H + 50) continue;
      const box = boxFor(pt, p.name);
      // The focused place always keeps its own marker so it's easy to spot.
      const host = p === focusedPlace ? undefined : groups.find((g) => overlaps(g.box, box));
      if (host) {
        if (!ghost) host.members.push(p);
      } else {
        groups.push({ anchor: p, members: ghost ? [] : [p], box: boxFor(pt, `${p.name} +99`), ghost });
      }
    }

    for (const g of groups) {
      const { anchor: a, members } = g;
      if (g.ghost && members.length === 0) continue;
      const cat = CATEGORY_BY_ID[a.cat];
      const el = document.createElement('div');
      const extra = g.ghost ? members.length : members.length - 1;
      el.className = `place-marker sub-${a.sub}${extra ? ' group' : ''}${a === focusedPlace ? ' focused' : ''}`;
      el.style.setProperty('--c', cat.color);
      el.innerHTML = `<i>${iconFor(a)}</i><span>${esc(a.name)}${extra ? `<em>+${extra}</em>` : ''}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const html = g.ghost || extra ? groupListHtml(a, members) : placeDetailHtml(a);
        popup.setLngLat([a.lng, a.lat]).setHTML(html).addTo(map);
      });
      markers.push(new maplibregl.Marker({ element: el, anchor: 'left', offset: [-12, 0] }).setLngLat([a.lng, a.lat]).addTo(map));
    }
  };

  map.on('moveend', rebuild);

  return {
    setVisible(cats: CategoryId[]) {
      visibleCats = new Set(cats);
      if (focusedPlace && !visibleCats.has(focusedPlace.cat)) {
        focusedPlace = null;
        popup.remove();
      }
      rebuild();
    },
    /** Looking out from the unit: markers behind the camera get mirrored onto the screen, so hide them. */
    setFacing(bearing: number | null) {
      facing = bearing; // applied on the next moveend (every camera change ends with one)
    },
    focus(p: Place) {
      focusedPlace = p;
      popup.setLngLat([p.lng, p.lat]).setHTML(placeDetailHtml(p)).addTo(map);
      rebuild();
    },
  };
}

/** Circles (as polygons) at fixed walking-distance radii around a centre. */
export function distanceRings(center: [number, number], radii: number[]): GeoJSON.FeatureCollection {
  const [lng, lat] = center;
  const mLat = 110_574;
  const mLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const features: GeoJSON.Feature[] = [];
  for (const r of radii) {
    const ring: [number, number][] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * 2 * Math.PI;
      ring.push([lng + (r * Math.sin(a)) / mLng, lat + (r * Math.cos(a)) / mLat]);
    }
    features.push({ type: 'Feature', properties: { r }, geometry: { type: 'LineString', coordinates: ring } });
    features.push({
      type: 'Feature',
      properties: { r, label: r >= 1000 ? `${r / 1000} km` : `${r} m` },
      geometry: { type: 'Point', coordinates: [lng, lat + r / mLat] },
    });
  }
  return { type: 'FeatureCollection', features };
}
