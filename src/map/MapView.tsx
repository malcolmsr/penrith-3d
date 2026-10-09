import { useEffect, useRef } from 'react';
import maplibregl, { type ExpressionSpecification, type Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BLOCKS, MY_UNIT, OSM_PENRITH_IDS, SITE_ANCHOR, STACK_COLORS, type BlockId } from '../data/penrith';
import { blockTop, buildGroundFeatures, buildTowerFeatures, stackTop, unitPoint } from '../data/geometry';
import { DISTANCE_RINGS, type CategoryId, type Place } from '../data/nearby';
import { createPlaceMarkers, distanceRings } from './places';
import { sgDateAt, sunPosition } from './sun';
import { enableGentleRotate } from './gentleRotate';

export interface Selection {
  block: BlockId | null;
  stack: string | null;
  floor: number | null;
}

const PAD = () => ({ top: 70, bottom: 20, left: 20, right: window.innerWidth > 720 ? 360 : 20 });

export type FlyTarget = { kind: 'overview' | 'site' | 'myUnit' | 'block' | 'topDown'; block?: BlockId; nonce: number };

interface Props {
  selection: Selection;
  onSelect: (s: Selection) => void;
  showContext: boolean;
  showLabels: boolean;
  activeCats: CategoryId[];
  showRings: boolean;
  focusPlace: { place: Place; nonce: number } | null;
  sunHour: number;
  fly: FlyTarget;
}

const SITE_VIEW = { center: aimAt([SITE_ANCHOR.lng, SITE_ANCHOR.lat], 60, 60, -30), zoom: 16.7, pitch: 60, bearing: -30 };
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const MY_COLOR = '#ff3d71';
const DIM_COLOR = '#d9dde3';

type Label = { el: HTMLDivElement; lngLat: [number, number]; alt: number; visible: () => boolean; side?: boolean };

export default function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const labelsRef = useRef<Label[]>([]);
  const readyRef = useRef(false);
  const placesRef = useRef<ReturnType<typeof createPlaceMarkers> | null>(null);

  // ---- init once -------------------------------------------------------------
  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current!,
      style: STYLE_URL,
      ...SITE_VIEW,
      maxPitch: 80,
      antialias: true,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.setPadding(PAD()); // keep the subject clear of the side panel
    if (import.meta.env.DEV) (window as unknown as { __map: MlMap }).__map = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    enableGentleRotate(map);

    map.on('load', () => {
      // Quiet the basemap so the 3D massing reads like the reference "clay" model.
      for (const l of map.getStyle().layers ?? []) {
        if (l.type === 'symbol' && /poi|housenumber/.test(l.id)) map.setLayoutProperty(l.id, 'visibility', 'none');
        if (l.id === 'building' || l.id === 'building-top') map.setLayoutProperty(l.id, 'visibility', 'none');
      }
      const firstSymbol = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;

      map.addSource('penrith-ground', { type: 'geojson', data: buildGroundFeatures() });
      map.addLayer({
        id: 'penrith-ground', type: 'fill', source: 'penrith-ground',
        paint: {
          'fill-color': ['match', ['get', 'kind'], 'pool', '#9fd6ef', 'court', '#b9d9b2', '#e7f0e2'],
          'fill-outline-color': '#b6c7ad',
        },
      }, firstSymbol);
      map.addLayer({
        id: 'penrith-site-outline', type: 'line', source: 'penrith-ground',
        filter: ['==', ['get', 'kind'], 'site'],
        paint: { 'line-color': '#ff3d71', 'line-width': 1.5, 'line-dasharray': [3, 2] },
      }, firstSymbol);

      map.addSource('rings', { type: 'geojson', data: distanceRings([SITE_ANCHOR.lng, SITE_ANCHOR.lat], DISTANCE_RINGS) });
      map.addLayer({
        id: 'rings-line', type: 'line', source: 'rings', filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#2f5bea', 'line-width': 2.5, 'line-opacity': 0.85, 'line-dasharray': [3, 2] },
      }, firstSymbol);
      map.addLayer({
        id: 'rings-label', type: 'symbol', source: 'rings', filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 },
        paint: { 'text-color': '#2f5bea', 'text-halo-color': '#fff', 'text-halo-width': 2 },
      });

      // Surrounding city: every OSM building extruded in neutral grey.
      map.addLayer({
        id: 'context-buildings', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building',
        minzoom: 13,
        filter: ['!', ['in', ['id'], ['literal', OSM_PENRITH_IDS]]],
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6],
            0, '#f6f7f9', 150, '#eef0f4'],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': false,
        },
      });

      map.addSource('penrith', { type: 'geojson', data: buildTowerFeatures() });
      map.addLayer({
        id: 'penrith-towers', type: 'fill-extrusion', source: 'penrith',
        paint: {
          'fill-extrusion-color': towerColor(propsRef.current.selection),
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base'],
          'fill-extrusion-opacity': 1,
          'fill-extrusion-vertical-gradient': false,
        },
      });

      // Zero-draw custom layer: gives us the camera matrix each frame so HTML labels
      // can be pinned to 3D points (tower tops, my unit) — markers only do ground level.
      map.addLayer({
        id: 'label-projector', type: 'custom', renderingMode: '3d',
        render: (_gl, matrix) => positionLabels(map, matrix as unknown as number[], labelsRef.current),
      });

      map.on('click', 'penrith-towers', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { kind: string; block: BlockId; stack: string; floor: number };
        if (p.kind === 'unit') propsRef.current.onSelect({ block: p.block, stack: p.stack, floor: p.floor });
        else propsRef.current.onSelect({ block: p.block, stack: null, floor: null });
      });
      map.on('mouseenter', 'penrith-towers', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'penrith-towers', () => (map.getCanvas().style.cursor = ''));

      buildLabels(map, labelsRef, propsRef);
      placesRef.current = createPlaceMarkers(map);
      readyRef.current = true;
      applyAll(map, propsRef.current, placesRef.current);
    });

    return () => {
      readyRef.current = false;
      map.remove();
    };
  }, []);

  // ---- react to prop changes ---------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) applyAll(map, props, placesRef.current);
  }, [props.selection, props.showContext, props.showLabels, props.activeCats, props.showRings, props.sunHour]);

  useEffect(() => {
    const map = mapRef.current;
    const fp = props.focusPlace;
    if (!map || !fp) return;
    if (!props.activeCats.includes(fp.place.cat)) return;
    placesRef.current?.focus(fp.place);
    map.flyTo({ center: [fp.place.lng, fp.place.lat], zoom: Math.max(map.getZoom(), 16.5), duration: 1400 });
  }, [props.focusPlace?.nonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || props.fly.nonce === 0) return;
    const f = props.fly;
    if (f.kind === 'topDown') {
      // Toggle: flat north-up plan view, or back to a tilted 3D view from the same spot.
      const flat = map.getPitch() < 5 && Math.abs(map.getBearing()) < 1;
      map.easeTo(flat ? { pitch: 60, bearing: -30, duration: 1000 } : { pitch: 0, bearing: 0, duration: 1000 });
    } else if (f.kind === 'overview') {
      map.flyTo({ center: [SITE_ANCHOR.lng, SITE_ANCHOR.lat - 0.0025], zoom: 14.8, pitch: 55, bearing: -20, padding: PAD(), duration: 2200 });
    } else if (f.kind === 'site') {
      map.flyTo({ ...SITE_VIEW, padding: PAD(), duration: 1800 });
    } else if (f.kind === 'block' && f.block) {
      const t = blockTop(f.block);
      const bearing = map.getBearing();
      map.flyTo({ center: aimAt(t.lngLat, 70, 60, bearing), zoom: 17.2, pitch: 60, bearing, padding: PAD(), duration: 1600 });
    } else if (f.kind === 'myUnit') {
      // Look at the unit's south-east façade from roughly level-ish, so the 39th floor
      // lands mid-screen rather than the tower base.
      const t = unitPoint(MY_UNIT.stack, MY_UNIT.floor);
      map.flyTo({ center: aimAt(t.lngLat, t.alt, 66, -40), zoom: 17.0, pitch: 66, bearing: -40, padding: PAD(), duration: 2200 });
    }
  }, [props.fly.nonce]);

  return <div ref={container} className="map" />;
}

// ------------------------------------------------------------------------------

/**
 * Map centre (a ground point) that puts a point `alt` metres up at screen centre: the
 * camera's line of sight through that point hits the ground alt·tan(pitch) further on.
 */
function aimAt([lng, lat]: [number, number], alt: number, pitch: number, bearing: number): [number, number] {
  const d = alt * Math.tan((pitch * Math.PI) / 180);
  const b = (bearing * Math.PI) / 180;
  const dN = d * Math.cos(b);
  const dE = d * Math.sin(b);
  return [lng + dE / (111_320 * Math.cos((lat * Math.PI) / 180)), lat + dN / 110_574];
}

function towerColor(sel: Selection): ExpressionSpecification {
  const stackColor: ExpressionSpecification = ['match', ['get', 'stack'],
    ...Object.entries(STACK_COLORS).flat(), '#9aa3ad'] as unknown as ExpressionSpecification;
  const base: ExpressionSpecification = ['match', ['get', 'kind'],
    'core', '#c9ced6',
    'lobby', '#e9ebee',
    'roof', '#9ccf8f',
    stackColor] as unknown as ExpressionSpecification;

  const isMine: ExpressionSpecification = ['==', ['get', 'mine'], true];
  if (!sel.block) return ['case', isMine, MY_COLOR, base];

  const inBlock: ExpressionSpecification = ['==', ['get', 'block'], sel.block];
  const isStack: ExpressionSpecification = ['==', ['get', 'stack'], sel.stack ?? '__none'];
  const isFloor: ExpressionSpecification = ['all', isStack, ['==', ['get', 'floor'], sel.floor ?? -1]];
  return ['case',
    isMine, MY_COLOR,
    isFloor, '#ffd400',
    ...(sel.stack
      ? [isStack, base, ['==', ['get', 'kind'], 'unit'], DIM_COLOR]
      : [['all', ['!', inBlock], ['==', ['get', 'kind'], 'unit']], DIM_COLOR]),
    base] as unknown as ExpressionSpecification;
}

function applyAll(map: MlMap, p: Props, places: ReturnType<typeof createPlaceMarkers> | null) {
  map.setPaintProperty('penrith-towers', 'fill-extrusion-color', towerColor(p.selection));
  map.setLayoutProperty('context-buildings', 'visibility', p.showContext ? 'visible' : 'none');

  const { azimuth, altitude } = sunPosition(sgDateAt(p.sunHour), SITE_ANCHOR.lat, SITE_ANCHOR.lng);
  const polar = Math.min(85, Math.max(10, 90 - altitude));
  map.setLight({
    anchor: 'map',
    position: [1.3, azimuth, polar],
    color: altitude < 8 ? '#ffd8a8' : '#ffffff',
    intensity: altitude < 0 ? 0.15 : 0.2 + 0.15 * Math.min(1, altitude / 60),
  });

  places?.setVisible(p.activeCats);
  for (const id of ['rings-line', 'rings-label']) map.setLayoutProperty(id, 'visibility', p.showRings ? 'visible' : 'none');
  map.triggerRepaint();
}

function buildLabels(map: MlMap, labelsRef: React.MutableRefObject<Label[]>, propsRef: React.MutableRefObject<Props>) {
  const host = map.getCanvasContainer();
  const labels: Label[] = [];

  for (const b of BLOCKS) {
    const el = document.createElement('div');
    el.className = 'label3d block-label';
    el.innerHTML = `<b>Block ${b.id}</b><span>${b.stacks.length} stacks · 40 storeys</span>`;
    el.onclick = () => propsRef.current.onSelect({ block: b.id, stack: null, floor: null });
    host.appendChild(el);
    const t = blockTop(b.id);
    labels.push({ el, ...t, visible: () => propsRef.current.showLabels });

    for (const s of b.stacks) {
      const chip = document.createElement('div');
      chip.className = 'label3d stack-chip';
      chip.textContent = s;
      chip.style.setProperty('--c', STACK_COLORS[s]);
      chip.onclick = () => propsRef.current.onSelect({ block: b.id, stack: s, floor: null });
      host.appendChild(chip);
      const st = stackTop(s);
      labels.push({
        el: chip, ...st,
        visible: () => propsRef.current.selection.block === b.id,
      });
      // Keep the chip's selected state in sync without React.
      const orig = labels[labels.length - 1].visible;
      labels[labels.length - 1].visible = () => {
        chip.classList.toggle('active', propsRef.current.selection.stack === s);
        return orig();
      };
    }
  }

  const mine = document.createElement('div');
  mine.className = 'label3d my-unit-label';
  mine.innerHTML = `<span class="dot"></span>My unit #${MY_UNIT.floor}-${MY_UNIT.stack}`;
  mine.onclick = () => propsRef.current.onSelect({ block: MY_UNIT.block, stack: MY_UNIT.stack, floor: MY_UNIT.floor });
  host.appendChild(mine);
  labels.push({ el: mine, ...unitPoint(MY_UNIT.stack, MY_UNIT.floor), visible: () => propsRef.current.showLabels, side: true });

  labelsRef.current = labels;
}

/** Project 3D mercator points with the frame's matrix and move label elements there. */
function positionLabels(map: MlMap, m: number[], labels: Label[]) {
  const canvas = map.getCanvas();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  for (const l of labels) {
    if (!l.visible()) {
      l.el.style.display = 'none';
      continue;
    }
    const mc = maplibregl.MercatorCoordinate.fromLngLat(l.lngLat, l.alt);
    const x = mc.x, y = mc.y, z = mc.z;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0) {
      l.el.style.display = 'none';
      continue;
    }
    const sx = ((cx / cw + 1) / 2) * w;
    const sy = ((1 - cy / cw) / 2) * h;
    l.el.style.display = '';
    const anchor = l.side ? 'translate(10px, -50%)' : 'translate(-50%, -100%)';
    l.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) ${anchor}`;
  }
}
