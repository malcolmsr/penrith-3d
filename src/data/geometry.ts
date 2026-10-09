import type { Feature, FeatureCollection, Polygon } from 'geojson';
import {
  BLOCKS, MY_UNIT, PLAN_ORIGIN, PLAN_PX_PER_M, POOL, ROOF_GARDENS, SITE_ANCHOR, SITE_BOUNDARY,
  SITE_ROTATION_DEG, SLAB_GAP, STACKS, STOREYS, TENNIS_COURT, floorBase, floorTop, type Pt,
} from './penrith';

const M_PER_DEG_LAT = 110_574;
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Plan pixel → [lng, lat]. Plan y grows downward (south). */
export function planToLngLat([px, py]: Pt): [number, number] {
  const east = (px - PLAN_ORIGIN[0]) / PLAN_PX_PER_M;
  const north = -(py - PLAN_ORIGIN[1]) / PLAN_PX_PER_M;
  const r = (SITE_ROTATION_DEG * Math.PI) / 180;
  const e = east * Math.cos(r) + north * Math.sin(r);
  const n = -east * Math.sin(r) + north * Math.cos(r);
  return [SITE_ANCHOR.lng + e / mPerDegLng(SITE_ANCHOR.lat), SITE_ANCHOR.lat + n / M_PER_DEG_LAT];
}

const ring = (pts: Pt[]) => {
  const r = pts.map(planToLngLat);
  r.push(r[0]);
  return [r];
};

const poly = (pts: Pt[], properties: Record<string, unknown>): Feature<Polygon> => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Polygon', coordinates: ring(pts) },
});

export const centroid = (pts: Pt[]): Pt => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];

/** One extrusion per stack × storey, plus lobby slabs, cores and roof gardens. */
export function buildTowerFeatures(): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];
  for (const s of STACKS) {
    features.push(poly(s.footprint, {
      kind: 'lobby', block: s.block, stack: s.id, floor: 1, base: 0, height: floorTop(1) - SLAB_GAP,
    }));
    for (let f = 2; f <= s.topFloor; f++) {
      features.push(poly(s.footprint, {
        kind: 'unit',
        block: s.block,
        stack: s.id,
        floor: f,
        mine: s.block === MY_UNIT.block && s.id === MY_UNIT.stack && f === MY_UNIT.floor,
        base: floorBase(f),
        height: floorTop(f) - SLAB_GAP,
      }));
    }
  }
  for (const b of BLOCKS) {
    features.push(poly(b.core, {
      kind: 'core', block: b.id, stack: '', floor: 0, base: 0, height: floorTop(STOREYS) + 3,
    }));
  }
  for (const g of ROOF_GARDENS) {
    const top = floorTop(39);
    features.push(poly(g.footprint, {
      kind: 'roof', block: g.block, stack: '', floor: 40, base: top, height: top + 1.2,
    }));
  }
  return { type: 'FeatureCollection', features };
}

export function buildGroundFeatures(): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: [
      poly(SITE_BOUNDARY, { kind: 'site' }),
      poly(POOL, { kind: 'pool' }),
      poly(TENNIS_COURT, { kind: 'court' }),
    ],
  };
}

export function sitePolygonLngLat(): [number, number][] {
  return ring(SITE_BOUNDARY)[0];
}

export function stackTop(stackId: string): { lngLat: [number, number]; alt: number } {
  const s = STACKS.find((x) => x.id === stackId)!;
  return { lngLat: planToLngLat(centroid(s.footprint)), alt: floorTop(s.topFloor) + 2 };
}

export function blockTop(blockId: string): { lngLat: [number, number]; alt: number } {
  const b = BLOCKS.find((x) => x.id === blockId)!;
  return { lngLat: planToLngLat(centroid(b.core)), alt: floorTop(STOREYS) + 14 };
}

export function unitPoint(stackId: string, floor: number): { lngLat: [number, number]; alt: number } {
  const s = STACKS.find((x) => x.id === stackId)!;
  return { lngLat: planToLngLat(centroid(s.footprint)), alt: (floorBase(floor) + floorTop(floor)) / 2 };
}
