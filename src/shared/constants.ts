import type { AppConfig } from './types';

// Set to true to enable verbose [btprox] debug logs
export const DEBUG = process.env.NODE_ENV === 'development' || false;

// API base URL
export const API_BASE = '/api';

// Default config
export const DEFAULT_CONFIG: AppConfig = {
  scanIntervalMs: 1000,
  nearThresholdMeters: 2,
  farThresholdMeters: 10,
  txPowerCalibration: -59,
  pathLossExponent: 2.0,
  trackedDeviceIds: [],
  notificationsEnabled: false,
  notifyOnNear: true,
  notifyOnFar: false,
};

// RSSI thresholds (typical values)
export const MIN_RSSI = -100;
export const MAX_RSSI = -30;

// Device pruning timeout (milliseconds)
export const DEVICE_STALE_TIMEOUT = 30000;
