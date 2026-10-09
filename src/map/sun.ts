// Approximate solar position (NOAA simplified), good to ~1° — enough to aim the scene light.
const rad = Math.PI / 180;

/** Returns azimuth (deg clockwise from north) and altitude (deg above horizon). */
export function sunPosition(date: Date, lat: number, lng: number) {
  const dayMs = 86_400_000;
  const jd = date.getTime() / dayMs + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = (gmst * 15 + lng) * rad;
  const ha = lst - ra;
  const phi = lat * rad;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(ha));
  return { azimuth: ((az / rad) + 360) % 360, altitude: alt / rad };
}

/** Today in Singapore (UTC+8) at a fractional local hour. */
export function sgDateAt(hour: number): Date {
  const now = new Date();
  const sg = new Date(now.getTime() + 8 * 3600_000);
  const utcMidnightOfSgDay = Date.UTC(sg.getUTCFullYear(), sg.getUTCMonth(), sg.getUTCDate());
  return new Date(utcMidnightOfSgDay + (hour - 8) * 3600_000);
}
