export function estimateDistance(
  rssi: number,
  txPower: number,
  pathLossExponent: number
): number {
  if (rssi === 0) return -1;
  const ratio = (txPower - rssi) / (10 * pathLossExponent);
  return Math.min(Math.pow(10, ratio), 50);
}

export function classifyProximity(
  distance: number,
  nearThreshold: number,
  farThreshold: number,
  previousProximity?: 'near' | 'far' | 'unknown',
  hysteresisMargin: number = 0.5
): 'near' | 'far' | 'unknown' {
  if (distance < 0) return 'unknown';

  // Hysteresis: require crossing threshold + margin to change state
  if (previousProximity === 'near') {
    if (distance <= nearThreshold + hysteresisMargin) return 'near';
  } else {
    if (distance <= nearThreshold) return 'near';
  }

  if (previousProximity === 'far') {
    if (distance >= farThreshold - hysteresisMargin) return 'far';
  } else {
    if (distance >= farThreshold) return 'far';
  }

  return 'unknown';
}

export function normalizeRssi(rssi: number, minRssi = -100, maxRssi = -30): number {
  return Math.max(0, Math.min(1, (rssi - minRssi) / (maxRssi - minRssi)));
}
