import maplibregl, { type FilterSpecification, type JumpToOptions, type Map as MlMap } from 'maplibre-gl';
import { MY_UNIT, SITE_ROTATION_DEG, floorBase } from '../data/penrith';
import { unitPoint } from '../data/geometry';

/** Stack 12 sits on the south-east corner of Block 72; its main façade faces plan-south. */
export const UNIT_DEFAULT_BEARING = Math.round(180 + SITE_ROTATION_DEG);
export const UNIT_PITCH_RANGE: [number, number] = [55, 80];
const EYE_HEIGHT = 1.6;

export interface Look {
  bearing: number;
  pitch: number;
}

const NO_PAD = { top: 0, bottom: 0, left: 0, right: 0 };

/** Camera placed at eye level inside #39-12, looking out along `look.bearing`. */
export function unitCamera(map: MlMap, look: Look): JumpToOptions {
  const { lngLat } = unitPoint(MY_UNIT.stack, MY_UNIT.floor);
  const eye = floorBase(MY_UNIT.floor) + EYE_HEIGHT;
  // Aim at the ground point where a line of sight at `pitch` from the eye lands.
  const d = eye * Math.tan((look.pitch * Math.PI) / 180);
  const b = (look.bearing * Math.PI) / 180;
  const lat = lngLat[1] + (d * Math.cos(b)) / 110_574;
  const lng = lngLat[0] + (d * Math.sin(b)) / (111_320 * Math.cos((lngLat[1] * Math.PI) / 180));
  const cam = map.calculateCameraOptionsFromTo(
    new maplibregl.LngLat(lngLat[0], lngLat[1]), eye, new maplibregl.LngLat(lng, lat), 0,
  );
  return { ...cam, padding: NO_PAD };
}

/** Hide our own tower's upper floors and core so they don't wall in the camera. */
export const HIDE_OWN_TOWER_TOP: FilterSpecification = ['!', ['all',
  ['==', ['get', 'block'], MY_UNIT.block],
  ['any', ['>=', ['get', 'floor'], MY_UNIT.floor - 8], ['==', ['get', 'kind'], 'core']],
]];

const HANDLERS = ['dragPan', 'scrollZoom', 'boxZoom', 'doubleClickZoom', 'keyboard', 'touchZoomRotate'] as const;

export function lockNavigation(map: MlMap, locked: boolean) {
  for (const h of HANDLERS) {
    if (locked) map[h].disable();
    else map[h].enable();
  }
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compassPoint = (bearing: number) => POINTS[Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16];
