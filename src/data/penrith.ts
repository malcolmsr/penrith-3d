// Penrith (70 & 72 Margaret Drive, Queenstown, Singapore) — modelled by hand because it
// is still under construction and only crudely outlined in OpenStreetMap.
//
// Footprints are traced from the developer's site plan (Form 3 Annexure B-2, BP No
// A1909-00025-2024-BP01). Coordinates below are in *plan pixels* of that drawing at the
// resolution it was traced. Scale, rotation and anchor were calibrated against the two
// Penrith tower outlines already mapped in OpenStreetMap (~90 m apart, bearing ~8.7°).
// geometry.ts converts them to metres → lng/lat using SITE_ANCHOR + SITE_ROTATION_DEG.

export type Pt = [number, number];

/** Plan pixel that maps onto SITE_ANCHOR (midpoint between the two tower footprints). */
export const PLAN_ORIGIN: Pt = [395, 585];
export const PLAN_PX_PER_M = 5.9;

/** Real-world position of PLAN_ORIGIN (midpoint of the OSM tower centroids). */
export const SITE_ANCHOR = { lng: 103.808726, lat: 1.295953 };
/** Clockwise rotation (deg) from plan "up" to true north. */
export const SITE_ROTATION_DEG = 7.5;

/** OSM building ids (OpenMapTiles) that duplicate Penrith; hidden from the context layer. */
export const OSM_PENRITH_IDS = [197231910, 1670630870, 14434435632, 4404943760, 15662220, 22972910, 74411270];

// ~6 + 39×3.3 ≈ 135 m to the 40th-storey roof; OSM records ~143–147 m incl. roof features.
export const GROUND_FLOOR_H = 6.0;
export const FLOOR_H = 3.3;
export const SLAB_GAP = 0.45; // visual gap between floors, gives the stacked-slab look
export const STOREYS = 40;

export type BlockId = '70' | '72';

export interface Stack {
  id: string; // '01'..'12'
  block: BlockId;
  /** Highest residential storey. Stacks under the roof garden stop at 39. */
  topFloor: number;
  footprint: Pt[]; // plan px
}

export interface Block {
  id: BlockId;
  core: Pt[]; // lift core, plan px
  stacks: string[];
}

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

// Units run from the 2nd storey. Stacks 01,02,06,07,08,12 reach storey 40; the others
// sit under the 40th-storey roof gardens and stop at 39. 6×39 + 6×38 = 462 units,
// matching the OTP's stated unit count.
export const STACKS: Stack[] = [
  { id: '03', block: '70', topFloor: 39, footprint: rect(283, 243, 380, 290) },
  { id: '04', block: '70', topFloor: 39, footprint: rect(380, 256, 433, 290) },
  { id: '05', block: '70', topFloor: 39, footprint: rect(433, 237, 515, 297) },
  { id: '02', block: '70', topFloor: 40, footprint: rect(290, 325, 365, 376) },
  { id: '01', block: '70', topFloor: 40, footprint: rect(365, 335, 415, 390) },
  { id: '06', block: '70', topFloor: 40, footprint: rect(415, 335, 488, 378) },

  { id: '09', block: '72', topFloor: 39, footprint: rect(283, 790, 370, 850) },
  { id: '10', block: '72', topFloor: 39, footprint: rect(370, 790, 423, 840) },
  { id: '11', block: '72', topFloor: 39, footprint: rect(423, 780, 503, 852) },
  { id: '08', block: '72', topFloor: 40, footprint: rect(278, 878, 345, 930) },
  { id: '07', block: '72', topFloor: 40, footprint: rect(345, 880, 405, 935) },
  { id: '12', block: '72', topFloor: 40, footprint: rect(405, 880, 470, 925) },
];

export const BLOCKS: Block[] = [
  { id: '70', core: rect(378, 290, 440, 335), stacks: ['01', '02', '03', '04', '05', '06'] },
  { id: '72', core: rect(365, 840, 432, 880), stacks: ['07', '08', '09', '10', '11', '12'] },
];

/** Roof gardens at the 40th storey (over the stacks that stop at 39). */
export const ROOF_GARDENS: { block: BlockId; footprint: Pt[] }[] = [
  { block: '70', footprint: rect(283, 237, 515, 297) },
  { block: '72', footprint: rect(283, 780, 503, 852) },
];

export const SITE_BOUNDARY: Pt[] = [
  [207, 175],
  [240, 140],
  [590, 212],
  [590, 1095],
  [207, 1095],
];

export const POOL: Pt[] = [
  [360, 400], [470, 395], [530, 410], [545, 460], [525, 560], [500, 640],
  [470, 710], [420, 770], [350, 770], [322, 700], [345, 610], [330, 520], [345, 450],
];

export const TENNIS_COURT: Pt[] = rect(482, 848, 578, 1000);

export const STACK_COLORS: Record<string, string> = {
  '01': '#3b6fe0', '02': '#1fa39c', '03': '#f0b429', '04': '#5f8ff0', '05': '#2bb06a', '06': '#7b61e8',
  '07': '#3b6fe0', '08': '#1fa39c', '09': '#f0b429', '10': '#5f8ff0', '11': '#2bb06a', '12': '#7b61e8',
};

export const MY_UNIT = { block: '72' as BlockId, stack: '12', floor: 39, type: '(3)a', bedrooms: 3, sqm: 73 };

export const PROJECT = {
  name: 'Penrith',
  address: '70 & 72 Margaret Drive',
  district: 'Queenstown · D03',
  towers: 2,
  storeys: STOREYS,
  units: 462,
  tenure: '99-yr lease from Nov 2024',
  vacantPossession: 'by Apr 2031',
};

export function floorBase(storey: number): number {
  return storey <= 1 ? 0 : GROUND_FLOOR_H + (storey - 2) * FLOOR_H;
}
export function floorTop(storey: number): number {
  return storey <= 1 ? GROUND_FLOOR_H : floorBase(storey) + FLOOR_H;
}
