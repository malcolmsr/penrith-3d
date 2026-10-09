import maplibregl, { type Map as MlMap } from 'maplibre-gl';
import { MY_UNIT } from '../data/penrith';
import { unitPoint } from '../data/geometry';
import { CATEGORY_BY_ID, PLACES, formatDistance, walkMinutes, type CategoryId, type Place } from '../data/nearby';

const unitLngLat = unitPoint(MY_UNIT.stack, MY_UNIT.floor).lngLat;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

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

/** HTML markers for every nearby place, toggled per category. */
export function createPlaceMarkers(map: MlMap) {
  const popup = new maplibregl.Popup({ offset: 14, closeButton: false, maxWidth: '260px', className: 'place-popup' });
  const entries = PLACES.map((p) => {
    const cat = CATEGORY_BY_ID[p.cat];
    const el = document.createElement('div');
    const isKey = cat.keySubs.includes(p.sub);
    el.className = `place-marker place-${p.cat} sub-${p.sub}${isKey ? ' key' : ''}`;
    el.style.setProperty('--c', cat.color);
    el.innerHTML = `<i>${p.sub === 'mrt' ? 'M' : p.sub === 'bus' ? '' : cat.icon}</i><span>${esc(p.name)}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.setLngLat([p.lng, p.lat]).setHTML(placeDetailHtml(p)).addTo(map);
    });
    const marker = new maplibregl.Marker({ element: el, anchor: 'left', offset: [-10, 0] }).setLngLat([p.lng, p.lat]).addTo(map);
    return { p, el, marker };
  });

  // Declutter: when zoomed out, only key places (MRT, hawkers, supermarkets…) stay visible.
  const container = map.getContainer();
  const onZoom = () => container.classList.toggle('places-zoomed-out', map.getZoom() < 15.5);
  map.on('zoom', onZoom);
  onZoom();

  let focused: HTMLElement | null = null;

  return {
    setVisible(cats: CategoryId[]) {
      const on = new Set(cats);
      for (const e of entries) e.el.style.display = on.has(e.p.cat) ? '' : 'none';
      if (!popup.isOpen()) return;
      const open = entries.find((e) => popup.getLngLat()?.lng === e.p.lng && popup.getLngLat()?.lat === e.p.lat);
      if (open && !on.has(open.p.cat)) popup.remove();
    },
    /** Looking out from the unit: markers behind the camera get mirrored onto the screen, so hide them. */
    setFacing(bearing: number | null) {
      const from = unitLngLat;
      for (const e of entries) {
        let hide = false;
        if (bearing != null) {
          const dE = (e.p.lng - from[0]) * Math.cos((from[1] * Math.PI) / 180);
          const dN = e.p.lat - from[1];
          const b = (Math.atan2(dE, dN) * 180) / Math.PI;
          const diff = Math.abs(((b - bearing + 540) % 360) - 180);
          hide = diff > 75;
        }
        e.el.classList.toggle('behind', hide);
      }
    },
    focus(p: Place) {
      focused?.classList.remove('focused');
      const e = entries.find((x) => x.p === p);
      if (e) {
        e.el.classList.add('focused');
        focused = e.el;
      }
      popup.setLngLat([p.lng, p.lat]).setHTML(placeDetailHtml(p)).addTo(map);
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
