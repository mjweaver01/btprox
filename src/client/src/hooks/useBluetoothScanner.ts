import { useState, useEffect, useCallback, useRef } from 'react';
import type { BtDevice, AppConfig } from '@shared/types';
import { LocalScanner } from '../scanners/LocalScanner';

interface BluetoothScannerOptions {
  enabled: boolean;
  scanIntervalMs: number;
  trackedDeviceIds: string[];
  notificationsEnabled: boolean;
  notifyOnNear: boolean;
  notifyOnFar: boolean;
  config: AppConfig;
}

function showNotification(deviceName: string, proximity: 'near' | 'far'): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification('Device proximity change', {
      body: `${deviceName || 'Unknown device'} is now ${proximity}`,
      icon: '/favicon.ico',
    });
  } catch {
    // ignore
  }
}

export function useBluetoothScanner(options: BluetoothScannerOptions) {
  const [devices, setDevices] = useState<BtDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proximityStateRef = useRef<Map<string, 'near' | 'far' | 'unknown'>>(new Map());
  const scannerRef = useRef<LocalScanner | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const {
    enabled,
    scanIntervalMs,
    config,
  } = options;

  // Create scanner once
  useEffect(() => {
    const scanner = new LocalScanner();
    scannerRef.current = scanner;

    scanner.setOnUpdate(() => {
      const opts = optionsRef.current;
      const deviceList = scanner.getDevices(opts.config);
      setDevices(deviceList);
      setIsScanning(scanner.isScanning);
      setError(scanner.scanError);

      // Check for proximity changes on tracked devices
      if (opts.notificationsEnabled) {
        for (const device of deviceList) {
          if (!opts.trackedDeviceIds.includes(device.id)) continue;
          const prev = proximityStateRef.current.get(device.id);
          if (prev !== device.proximity) {
            if (device.proximity === 'near' && opts.notifyOnNear) {
              showNotification(device.name || device.id, 'near');
            } else if (device.proximity === 'far' && opts.notifyOnFar) {
              showNotification(device.name || device.id, 'far');
            }
            proximityStateRef.current.set(device.id, device.proximity);
          }
        }
      }
    });

    return () => {
      scanner.destroy();
    };
  }, []);

  const startScanning = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    // Request notification permission early
    if (options.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {});
    }

    await scanner.start();
  }, [options.notificationsEnabled]);

  const stopScanning = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    await scanner.stop();
    proximityStateRef.current.clear();
  }, []);

  // Start/stop polling when enabled changes
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (enabled) {
      scanner.startPolling(scanIntervalMs);
    } else {
      scanner.stopPolling();
      setDevices([]);
      setIsScanning(false);
    }

    return () => {
      scanner.stopPolling();
    };
  }, [enabled, scanIntervalMs]);

  return {
    devices,
    isScanning,
    error,
    startScanning,
    stopScanning,
  };
}
