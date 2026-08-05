// Rescue Relay — Geofence utilities
// Pure geometry functions (no dependencies, no I/O). Used by the check-in
// flow to verify a driver is physically near the pickup point.

const EARTH_RADIUS_M = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates in meters (haversine formula).
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * True when the second point falls within `radiusM` meters of the first.
 */
export function withinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusM: number
): boolean {
  return haversineDistanceMeters(lat1, lng1, lat2, lng2) <= radiusM;
}
