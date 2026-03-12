import { BleClient, type ScanResult } from '@capacitor-community/bluetooth-le';
import type { BtDevice, AppConfig } from '@shared/types';
import { DEVICE_STALE_TIMEOUT, HYSTERESIS_MARGIN } from '@shared/constants';
import { estimateDistance, classifyProximity } from '@shared/lib/rssi';
import { pushRssi, computeSmoothedRssi } from '@shared/lib/rssiFilter';
import { identifyDeviceType } from '@shared/lib/deviceTypes';

interface RawDevice {
  id: string;
  name: string | null;
  rssi: number;
  smoothedRssi: number;
  rssiHistory: number[];
  emaValue: number | null;
  lastProximity: 'near' | 'far' | 'unknown';
  txPower: number | null;
  manufacturerData: Record<string, string>;
  serviceUUIDs: string[];
  lastSeen: number;
}

export class LocalScanner {
  private rawDevices = new Map<string, RawDevice>();
  private scanning = false;
  private error: string | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private onUpdate: (() => void) | null = null;

  setOnUpdate(cb: () => void): void {
    this.onUpdate = cb;
  }

  async start(): Promise<void> {
    try {
      this.error = null;
      await BleClient.initialize({ androidNeverForLocation: true });

      await BleClient.requestLEScan(
        { allowDuplicates: true },
        (result: ScanResult) => this.handleDiscover(result)
      );

      this.scanning = true;

      if (this.pruneTimer) clearInterval(this.pruneTimer);
      this.pruneTimer = setInterval(() => this.pruneStaleDevices(), 5000);

      this.onUpdate?.();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to initialize BLE scanner';
      this.scanning = false;
      this.onUpdate?.();
    }
  }

  async stop(): Promise<void> {
    this.stopPolling();
    try {
      await BleClient.stopLEScan();
    } catch {
      // ignore
    }
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    this.rawDevices.clear();
    this.scanning = false;
    this.error = null;
    this.onUpdate?.();
  }

  get isScanning(): boolean {
    return this.scanning;
  }

  get scanError(): string | null {
    return this.error;
  }

  getDevices(config: AppConfig): BtDevice[] {
    const devices: BtDevice[] = [];

    for (const raw of this.rawDevices.values()) {
      const effectiveTxPower =
        raw.txPower != null && raw.txPower < 0 ? raw.txPower : config.txPowerCalibration;
      const distance = estimateDistance(raw.smoothedRssi, effectiveTxPower, config.pathLossExponent);
      const proximity = classifyProximity(
        distance,
        config.nearThresholdMeters,
        config.farThresholdMeters,
        raw.lastProximity,
        HYSTERESIS_MARGIN
      );
      raw.lastProximity = proximity;
      const deviceType = identifyDeviceType(raw.serviceUUIDs, raw.manufacturerData, raw.name);
      const isTracked = config.trackedDeviceIds.includes(raw.id);

      devices.push({
        id: raw.id,
        name: raw.name,
        rssi: raw.rssi,
        smoothedRssi: raw.smoothedRssi,
        txPower: raw.txPower,
        estimatedDistance: distance,
        deviceType,
        lastSeen: new Date(raw.lastSeen).toISOString(),
        services: raw.serviceUUIDs,
        manufacturerData: raw.manufacturerData,
        isTracked,
        proximity,
      });
    }

    return devices;
  }

  startPolling(intervalMs: number): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (this.scanning) {
        this.onUpdate?.();
      }
    }, intervalMs || 1000);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  destroy(): void {
    this.stopPolling();
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    try {
      BleClient.stopLEScan();
    } catch {
      // ignore
    }
  }

  private handleDiscover(result: ScanResult): void {
    const id = result.device.deviceId;
    const rssi = result.rssi ?? 0;

    if (rssi === 127 || rssi === 0) return;

    const name = result.localName || null;
    const txPower = result.txPower ?? null;
    const manufacturerData = this.parseManufacturerData(result.manufacturerData);
    const serviceUUIDs = (result.uuids || []).map(s => s.toLowerCase());

    const existing = this.rawDevices.get(id);
    const rssiHistory = pushRssi(existing?.rssiHistory ?? [], rssi);
    const { smoothedRssi, emaValue } = computeSmoothedRssi(
      rssiHistory,
      existing?.emaValue ?? null
    );

    this.rawDevices.set(id, {
      id,
      name: name || existing?.name || null,
      rssi,
      smoothedRssi,
      rssiHistory,
      emaValue,
      lastProximity: existing?.lastProximity ?? 'unknown',
      txPower,
      manufacturerData,
      serviceUUIDs,
      lastSeen: Date.now(),
    });
  }

  private parseManufacturerData(data?: Record<string, DataView>): Record<string, string> {
    if (!data) return {};
    const result: Record<string, string> = {};
    for (const [companyId, dataView] of Object.entries(data)) {
      const bytes = new Uint8Array(dataView.buffer);
      result[companyId] = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return result;
  }

  private pruneStaleDevices(): void {
    const now = Date.now();
    for (const [id, device] of this.rawDevices) {
      if (now - device.lastSeen > DEVICE_STALE_TIMEOUT) {
        this.rawDevices.delete(id);
      }
    }
  }
}
