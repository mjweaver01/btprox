import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AppConfig, BtDevice } from '@shared/types';
import { API_BASE, DEFAULT_CONFIG } from '@shared/constants';
import { getBrowserId } from '../lib/browserId';
import { useBluetoothScanner } from '../hooks/useBluetoothScanner';
import { incrementDevicesVersion } from '../lib/devicesVersion';

const SCANNER_ENABLED_KEY = 'btprox:scannerEnabled';

function getStoredScannerEnabled(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(SCANNER_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function setStoredScannerEnabled(v: boolean) {
  try {
    if (v) sessionStorage.setItem(SCANNER_ENABLED_KEY, '1');
    else sessionStorage.removeItem(SCANNER_ENABLED_KEY);
  } catch {
    // ignore
  }
}

interface BluetoothStatus {
  connected: boolean;
  isScanning: boolean;
  error: string | null;
}

const defaultStatus: BluetoothStatus = {
  connected: false,
  isScanning: false,
  error: null,
};

interface BluetoothContextValue {
  status: BluetoothStatus;
  scannerEnabled: boolean;
  setScannerEnabled: (v: boolean) => void;
  devices: BtDevice[];
  isScanning: boolean;
  error: string | null;
  supported: boolean;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  handleSaveConfig: (updates: Partial<AppConfig>) => Promise<void>;
  startScanning: () => Promise<void>;
}

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BluetoothStatus>(defaultStatus);
  // Don't persist scanner state - can't auto-resume without user gesture
  const [scannerEnabled, setScannerEnabledState] = useState(false);
  const [config, setConfig] = useState<AppConfig>(() => ({
    ...DEFAULT_CONFIG,
  }));

  const setScannerEnabled = useCallback((v: boolean) => {
    setScannerEnabledState(v);
    // Don't persist to sessionStorage
  }, []);

  const handleDeviceDiscovered = useCallback(
    async (device: BtDevice) => {
      await fetch(`${API_BASE}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Browser-Id': getBrowserId(),
        },
        body: JSON.stringify({
          id: device.id,
          name: device.name,
          deviceType: device.deviceType,
        }),
      }).catch(() => {});

      if (device.isTracked) {
        await fetch(`${API_BASE}/sightings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Browser-Id': getBrowserId(),
          },
          body: JSON.stringify({
            deviceId: device.id,
            rssi: device.rssi,
            estimatedDistance: device.estimatedDistance,
            proximity: device.proximity,
          }),
        }).catch(() => {});
      }

      incrementDevicesVersion();
    },
    []
  );

  const { devices, isScanning, error, supported, startScanning } = useBluetoothScanner({
    enabled: scannerEnabled,
    txPowerCalibration: config.txPowerCalibration,
    pathLossExponent: config.pathLossExponent,
    nearThresholdMeters: config.nearThresholdMeters,
    farThresholdMeters: config.farThresholdMeters,
    trackedDeviceIds: config.trackedDeviceIds,
    notificationsEnabled: config.notificationsEnabled,
    notifyOnNear: config.notifyOnNear,
    notifyOnFar: config.notifyOnFar,
    onDeviceDiscovered: handleDeviceDiscovered,
  });

  useEffect(() => {
    setStatus({
      connected: scannerEnabled && !error,
      isScanning,
      error: error ?? null,
    });
  }, [scannerEnabled, isScanning, error]);

  useEffect(() => {
    const browserId = getBrowserId();
    fetch(`${API_BASE}/config`, {
      headers: { 'X-Browser-Id': browserId },
    })
      .then(r => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const handleSaveConfig = useCallback(
    async (updates: Partial<AppConfig>) => {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Browser-Id': getBrowserId(),
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      setConfig(data);
    },
    []
  );

  const value: BluetoothContextValue = {
    status,
    scannerEnabled,
    setScannerEnabled,
    devices,
    isScanning,
    error,
    supported,
    config,
    setConfig,
    handleSaveConfig,
    startScanning,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const ctx = useContext(BluetoothContext);
  if (!ctx) {
    throw new Error('useBluetooth must be used within BluetoothProvider');
  }
  return ctx;
}
