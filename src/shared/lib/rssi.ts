export function estimateDistance(
  rssi: number,
  txPower: number,
  pathLossExponent: number
): number {
  if (rssi === 0) return -1;
  const ratio = (txPower - rssi) / (10 * pathLossExponent);
  return Math.pow(10, ratio);
}

export function classifyProximity(
  distance: number,
  nearThreshold: number,
  farThreshold: number
): 'near' | 'far' | 'unknown' {
  if (distance < 0) return 'unknown';
  if (distance <= nearThreshold) return 'near';
  if (distance >= farThreshold) return 'far';
  return 'unknown';
}

export function normalizeRssi(rssi: number, minRssi = -100, maxRssi = -30): number {
  return Math.max(0, Math.min(1, (rssi - minRssi) / (maxRssi - minRssi)));
}
