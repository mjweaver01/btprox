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
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [config, setConfig] = useState<AppConfig>(() => ({
    ...DEFAULT_CONFIG,
  }));

  const { devices, isScanning, error, supported, startScanning } = useBluetoothScanner({
    enabled: scannerEnabled,
    scanIntervalMs: config.scanIntervalMs,
    trackedDeviceIds: config.trackedDeviceIds,
    notificationsEnabled: config.notificationsEnabled,
    notifyOnNear: config.notifyOnNear,
    notifyOnFar: config.notifyOnFar,
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
