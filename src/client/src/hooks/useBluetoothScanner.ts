import { useState, useEffect, useCallback, useRef } from 'react';
import type { BtDevice } from '@shared/types';
import { API_BASE } from '@shared/constants';
import { getBrowserId } from '../lib/browserId';

interface BluetoothScannerOptions {
  enabled: boolean;
  scanIntervalMs: number;
  trackedDeviceIds: string[];
  notificationsEnabled: boolean;
  notifyOnNear: boolean;
  notifyOnFar: boolean;
}

interface ScannerStatus {
  isScanning: boolean;
  bluetoothState: string;
  deviceCount: number;
  error: string | null;
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
  const [supported] = useState(true);

  const proximityStateRef = useRef<Map<string, 'near' | 'far' | 'unknown'>>(new Map());

  const {
    enabled,
    scanIntervalMs,
    trackedDeviceIds,
    notificationsEnabled,
    notifyOnNear,
    notifyOnFar,
  } = options;

  const browserId = getBrowserId();

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      // Request notification permission early so alerts work for tracked devices
      if (notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }
      const res = await fetch(`${API_BASE}/scanner/start`, {
        method: 'POST',
        headers: { 'X-Browser-Id': browserId },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to start scanner');
      }
    } catch {
      setError('Failed to connect to server');
    }
  }, [browserId]);

  const stopScanning = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/scanner/stop`, {
        method: 'POST',
        headers: { 'X-Browser-Id': browserId },
      });
    } catch {
      // ignore
    }
    setDevices([]);
    proximityStateRef.current.clear();
  }, [browserId]);

  // Poll for devices and status when enabled
  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const poll = async () => {
      try {
        const [statusRes, devicesRes] = await Promise.all([
          fetch(`${API_BASE}/scanner/status`, {
            headers: { 'X-Browser-Id': browserId },
          }),
          fetch(`${API_BASE}/scanner/devices`, {
            headers: { 'X-Browser-Id': browserId },
          }),
        ]);

        if (!active) return;

        if (statusRes.ok) {
          const status: ScannerStatus = await statusRes.json();
          setIsScanning(status.isScanning);
          setError(status.error);

          if (status.bluetoothState === 'poweredOff') {
            setError('Bluetooth is turned off on the server machine');
          } else if (status.bluetoothState === 'unauthorized') {
            setError('Bluetooth permission denied. Grant access in System Settings > Privacy & Security > Bluetooth');
          }
        }

        if (devicesRes.ok) {
          const deviceList: BtDevice[] = await devicesRes.json();
          setDevices(deviceList);

          // Check for proximity changes on tracked devices
          if (notificationsEnabled) {
            for (const device of deviceList) {
              if (!trackedDeviceIds.includes(device.id)) continue;
              const prev = proximityStateRef.current.get(device.id);
              if (prev !== device.proximity) {
                if (device.proximity === 'near' && notifyOnNear) {
                  showNotification(device.name || device.id, 'near');
                } else if (device.proximity === 'far' && notifyOnFar) {
                  showNotification(device.name || device.id, 'far');
                }
                proximityStateRef.current.set(device.id, device.proximity);
              }
            }
          }
        }
      } catch {
        if (active) {
          setError('Failed to connect to server');
        }
      }
    };

    poll();
    const interval = setInterval(poll, scanIntervalMs || 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [enabled, scanIntervalMs, browserId, trackedDeviceIds, notificationsEnabled, notifyOnNear, notifyOnFar]);

  // Clear state when disabled
  useEffect(() => {
    if (!enabled) {
      setDevices([]);
      setIsScanning(false);
    }
  }, [enabled]);

  return {
    devices,
    isScanning,
    error,
    supported,
    startScanning,
    stopScanning,
  };
}
