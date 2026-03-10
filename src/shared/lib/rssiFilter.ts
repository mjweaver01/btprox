/**
 * Two-stage RSSI smoothing: sliding window median → exponential moving average.
 * Median rejects outlier spikes; EMA smooths remaining noise.
 * Applied to raw RSSI (dBm) before the exponential distance conversion.
 */

import { RSSI_WINDOW_SIZE, EMA_ALPHA } from '../constants';

export function medianOfWindow(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function applyEma(
  currentEma: number | null,
  newValue: number,
  alpha: number = EMA_ALPHA
): number {
  if (currentEma === null) return newValue;
  return alpha * newValue + (1 - alpha) * currentEma;
}

export function computeSmoothedRssi(
  rssiHistory: number[],
  currentEma: number | null,
  alpha: number = EMA_ALPHA
): { smoothedRssi: number; emaValue: number } {
  const median = medianOfWindow(rssiHistory);
  const ema = applyEma(currentEma, median, alpha);
  return { smoothedRssi: ema, emaValue: ema };
}

export function pushRssi(history: number[], rssi: number): number[] {
  history.push(rssi);
  if (history.length > RSSI_WINDOW_SIZE) history.shift();
  return history;
}
