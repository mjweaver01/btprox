import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AppConfig, BtDevice } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/constants';
import { loadLocalConfig, saveLocalConfig } from '../lib/localConfig';
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

  const { devices, isScanning, error, startScanning } = useBluetoothScanner({
    enabled: scannerEnabled,
    scanIntervalMs: config.scanIntervalMs,
    trackedDeviceIds: config.trackedDeviceIds,
    notificationsEnabled: config.notificationsEnabled,
    notifyOnNear: config.notifyOnNear,
    notifyOnFar: config.notifyOnFar,
    config,
  });

  useEffect(() => {
    setStatus({
      connected: scannerEnabled && !error,
      isScanning,
      error: error ?? null,
    });
  }, [scannerEnabled, isScanning, error]);

  // Load config from local storage on mount
  useEffect(() => {
    loadLocalConfig().then(setConfig).catch(() => {});
  }, []);

  const handleSaveConfig = useCallback(
    async (updates: Partial<AppConfig>) => {
      const merged = { ...config, ...updates };
      await saveLocalConfig(merged);
      setConfig(merged);
    },
    [config]
  );

  const value: BluetoothContextValue = {
    status,
    scannerEnabled,
    setScannerEnabled,
    devices,
    isScanning,
    error,
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
