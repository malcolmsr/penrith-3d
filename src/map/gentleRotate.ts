import type { Map as MlMap } from 'maplibre-gl';

/**
 * Replaces MapLibre's built-in right-drag / ctrl+drag rotate-and-tilt, whose speed is
 * hardcoded (0.8° bearing, 0.5° pitch per pixel), with a slower version.
 */
export function enableGentleRotate(map: MlMap, { bearingPerPx = 0.3, pitchPerPx = 0.18 } = {}) {
  map.dragRotate.disable();
  const canvas = map.getCanvasContainer();
  let last: { x: number; y: number } | null = null;
  let pending = { bearing: 0, pitch: 0 };
  let frame = 0;

  const flush = () => {
    frame = 0;
    map.jumpTo({
      bearing: map.getBearing() + pending.bearing,
      pitch: Math.min(map.getMaxPitch(), Math.max(map.getMinPitch(), map.getPitch() + pending.pitch)),
    });
    pending = { bearing: 0, pitch: 0 };
  };

  const onMove = (e: MouseEvent) => {
    if (!last) return;
    pending.bearing += (e.clientX - last.x) * bearingPerPx;
    pending.pitch -= (e.clientY - last.y) * pitchPerPx;
    last = { x: e.clientX, y: e.clientY };
    if (!frame) frame = requestAnimationFrame(flush);
  };

  const onUp = () => {
    last = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };

  canvas.addEventListener('mousedown', (e) => {
    const isRotate = e.button === 2 || (e.button === 0 && e.ctrlKey);
    if (!isRotate) return;
    e.preventDefault();
    e.stopPropagation(); // keep the pan handler out of a ctrl+left drag
    map.stop();
    last = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, true);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
