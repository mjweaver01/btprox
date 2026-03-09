export interface AppConfig {
  scanIntervalMs: number;
  nearThresholdMeters: number;
  farThresholdMeters: number;
  txPowerCalibration: number;
  pathLossExponent: number;
  trackedDeviceIds: string[];
  notificationsEnabled: boolean;
  notifyOnNear: boolean;
  notifyOnFar: boolean;
}

export interface BtDevice {
  id: string;
  name: string | null;
  rssi: number;
  txPower: number | null;
  estimatedDistance: number;
  deviceType: string;
  lastSeen: string;
  services: string[];
  manufacturerData: Record<string, string>;
  isTracked: boolean;
  proximity: 'near' | 'far' | 'unknown';
}

export interface DeviceSighting {
  id: string;
  deviceId: string;
  deviceName: string | null;
  rssi: number;
  estimatedDistance: number;
  proximity: 'near' | 'far' | 'unknown';
  timestamp: string;
}
