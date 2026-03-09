import { join } from 'path';
import type { AppConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/constants';
import { PROJECT_ROOT } from '@shared/root';

const CONFIG_FILE = join(PROJECT_ROOT, 'config.json');

/** Config keyed by browserId. Fallback key for clients without browserId. */
type ConfigStore = Record<string, Partial<AppConfig>>;

function parseConfig(data: unknown): AppConfig {
  const d = data as Partial<AppConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...d,
    scanIntervalMs:
      typeof d?.scanIntervalMs === 'number'
        ? d.scanIntervalMs
        : DEFAULT_CONFIG.scanIntervalMs,
    nearThresholdMeters:
      typeof d?.nearThresholdMeters === 'number'
        ? d.nearThresholdMeters
        : DEFAULT_CONFIG.nearThresholdMeters,
    farThresholdMeters:
      typeof d?.farThresholdMeters === 'number'
        ? d.farThresholdMeters
        : DEFAULT_CONFIG.farThresholdMeters,
    txPowerCalibration:
      typeof d?.txPowerCalibration === 'number'
        ? d.txPowerCalibration
        : DEFAULT_CONFIG.txPowerCalibration,
    pathLossExponent:
      typeof d?.pathLossExponent === 'number'
        ? d.pathLossExponent
        : DEFAULT_CONFIG.pathLossExponent,
    trackedDeviceIds: Array.isArray(d?.trackedDeviceIds)
      ? d.trackedDeviceIds
      : DEFAULT_CONFIG.trackedDeviceIds,
    notificationsEnabled:
      typeof d?.notificationsEnabled === 'boolean'
        ? d.notificationsEnabled
        : DEFAULT_CONFIG.notificationsEnabled,
    notifyOnNear:
      typeof d?.notifyOnNear === 'boolean'
        ? d.notifyOnNear
        : DEFAULT_CONFIG.notifyOnNear,
    notifyOnFar:
      typeof d?.notifyOnFar === 'boolean'
        ? d.notifyOnFar
        : DEFAULT_CONFIG.notifyOnFar,
  };
}

const APP_CONFIG_KEYS = [
  'scanIntervalMs',
  'nearThresholdMeters',
  'farThresholdMeters',
  'txPowerCalibration',
  'pathLossExponent',
  'trackedDeviceIds',
] as const;

function isLegacyConfig(data: unknown): data is Partial<AppConfig> {
  if (!data || typeof data !== 'object') return false;
  return APP_CONFIG_KEYS.some(k => k in (data as object));
}

let store: ConfigStore = {};

export async function loadConfig(): Promise<void> {
  try {
    const data = (await Bun.file(CONFIG_FILE).json()) as unknown;
    if (data && typeof data === 'object') {
      if (isLegacyConfig(data)) {
        store = { default: data };
      } else {
        store = data as ConfigStore;
      }
    }
  } catch {
    store = {};
  }
}

export function getConfig(browserId: string | null): AppConfig {
  const key = browserId || 'default';
  const data = store[key];
  if (!data) return { ...DEFAULT_CONFIG };
  return parseConfig(data);
}

export async function saveConfig(
  browserId: string | null,
  updates: Partial<AppConfig>
): Promise<AppConfig> {
  const key = browserId || 'default';
  const current = getConfig(browserId);
  const merged = parseConfig({ ...current, ...updates });
  store[key] = merged;
  await Bun.write(CONFIG_FILE, JSON.stringify(store, null, 2));
  return merged;
}
