import type { BtDevice } from '@shared/types';
import { DEVICE_STALE_TIMEOUT } from '@shared/constants';
import { estimateDistance, classifyProximity } from '@shared/lib/rssi';
import { identifyDeviceType } from '@shared/lib/deviceTypes';
import { getConfig } from '../config';
import { upsertDevice, saveSighting } from '../devices';
import { logger } from '@shared/logger';

interface RawDevice {
  id: string;
  name: string | null;
  rssi: number;
  txPower: number | null;
  manufacturerData: Record<string, string>;
  serviceUUIDs: string[];
  lastSeen: number;
}

let noble: any = null;
let scanning = false;
let bluetoothState = 'unknown';
let scannerError: string | null = null;
let rawDevices = new Map<string, RawDevice>();
let pruneTimer: ReturnType<typeof setInterval> | null = null;

function parseManufacturerData(data: Buffer | undefined): Record<string, string> {
  if (!data || data.length < 2) return {};
  // Noble provides raw manufacturer data as a Buffer
  // First 2 bytes are company ID (little-endian)
  const companyId = data[0] | (data[1] << 8);
  const payload = data.subarray(2);
  const hexString = Array.from(payload)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
  return { [companyId.toString()]: hexString };
}

function handleDiscover(peripheral: any): void {
  const { id, rssi, advertisement } = peripheral;

  // Skip invalid RSSI
  if (rssi === 127 || rssi === 0) return;

  const name: string | null = advertisement.localName || null;
  const txPower: number | null = advertisement.txPowerLevel ?? null;
  const manufacturerData = parseManufacturerData(advertisement.manufacturerData);
  const serviceUUIDs: string[] = (advertisement.serviceUuids || []).map((s: string) => s.toLowerCase());

  const raw: RawDevice = {
    id,
    name,
    rssi,
    txPower,
    manufacturerData,
    serviceUUIDs,
    lastSeen: Date.now(),
  };
  rawDevices.set(raw.id, raw);

  // Persist to database
  upsertDevice(raw.id, raw.name, identifyDeviceType(raw.serviceUUIDs, raw.manufacturerData, raw.name));
}

function pruneStaleDevices(): void {
  const now = Date.now();
  for (const [id, device] of rawDevices) {
    if (now - device.lastSeen > DEVICE_STALE_TIMEOUT) {
      rawDevices.delete(id);
    }
  }
}

export async function startScanner(): Promise<void> {
  if (scanning) return;

  try {
    // Dynamic import to avoid issues if noble fails to load
    if (!noble) {
      const nobleModule = await import('@stoprocent/noble');
      noble = nobleModule.default || nobleModule;
    }

    scannerError = null;
    rawDevices.clear();

    noble.on('stateChange', (state: string) => {
      bluetoothState = state;
      logger(`[Scanner] Bluetooth state: ${state}`);

      if (state === 'poweredOn') {
        noble.startScanning([], true); // [] = all services, true = allow duplicates
        scanning = true;
        logger('[Scanner] Scanning started');
      } else {
        scanning = false;
        if (state === 'poweredOff') {
          scannerError = 'Bluetooth is powered off';
        } else if (state === 'unauthorized') {
          scannerError = 'Bluetooth permission denied. Grant access in System Settings > Privacy & Security > Bluetooth';
        }
      }
    });

    noble.on('discover', handleDiscover);

    // If already powered on, start scanning immediately
    if (noble.state === 'poweredOn') {
      bluetoothState = 'poweredOn';
      noble.startScanning([], true);
      scanning = true;
      logger('[Scanner] Scanning started (already powered on)');
    }

    // Start pruning timer
    if (pruneTimer) clearInterval(pruneTimer);
    pruneTimer = setInterval(pruneStaleDevices, 5000);

    logger('[Scanner] Initialized');
  } catch (err) {
    scannerError = err instanceof Error ? err.message : 'Failed to initialize BLE scanner';
    logger('[Scanner] Error:', scannerError);
  }
}

export function stopScanner(): void {
  if (noble) {
    try {
      noble.stopScanning();
      noble.removeAllListeners('stateChange');
      noble.removeAllListeners('discover');
    } catch {
      // ignore
    }
  }
  scanning = false;
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
  rawDevices.clear();
  bluetoothState = 'unknown';
  scannerError = null;
  logger('[Scanner] Stopped');
}

export function getDiscoveredDevices(browserId: string | null): BtDevice[] {
  const config = getConfig(browserId);
  const devices: BtDevice[] = [];

  for (const raw of rawDevices.values()) {
    const effectiveTxPower = (raw.txPower != null && raw.txPower < 0) ? raw.txPower : config.txPowerCalibration;
    const distance = estimateDistance(raw.rssi, effectiveTxPower, config.pathLossExponent);
    const proximity = classifyProximity(distance, config.nearThresholdMeters, config.farThresholdMeters);
    const deviceType = identifyDeviceType(raw.serviceUUIDs, raw.manufacturerData, raw.name);
    const isTracked = config.trackedDeviceIds.includes(raw.id);

    devices.push({
      id: raw.id,
      name: raw.name,
      rssi: raw.rssi,
      txPower: raw.txPower,
      estimatedDistance: distance,
      deviceType,
      lastSeen: new Date(raw.lastSeen).toISOString(),
      services: raw.serviceUUIDs,
      manufacturerData: raw.manufacturerData,
      isTracked,
      proximity,
    });

    // Save sighting for tracked devices
    if (isTracked) {
      saveSighting(raw.id, raw.rssi, distance, proximity);
    }
  }

  return devices;
}

export function getScannerStatus() {
  return {
    isScanning: scanning,
    bluetoothState,
    deviceCount: rawDevices.size,
    error: scannerError,
  };
}
