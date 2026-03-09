import { useState, useEffect, useCallback, useRef } from 'react';
import type { BtDevice } from '@shared/types';
import { DEVICE_STALE_TIMEOUT } from '@shared/constants';
import { estimateDistance, classifyProximity } from '../lib/rssi';
import { identifyDeviceType } from '../lib/deviceTypes';
import { logger } from '@shared/logger';

interface BluetoothScannerOptions {
  enabled: boolean;
  txPowerCalibration: number;
  pathLossExponent: number;
  nearThresholdMeters: number;
  farThresholdMeters: number;
  trackedDeviceIds: string[];
  notificationsEnabled: boolean;
  notifyOnNear: boolean;
  notifyOnFar: boolean;
  onDeviceDiscovered?: (device: BtDevice) => void;
}

interface BluetoothAdvertisementEvent extends Event {
  device: BluetoothDevice;
  rssi: number;
  txPower?: number;
  serviceData?: Map<string, DataView>;
  manufacturerData?: Map<number, DataView>;
}

interface BluetoothDevice {
  id: string;
  name?: string;
}

interface Bluetooth extends EventTarget {
  requestLEScan(options: { acceptAllAdvertisements: boolean }): Promise<{
    stop: () => void;
  }>;
}

declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
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
  const [devices, setDevices] = useState<Map<string, BtDevice>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const scanRef = useRef<{ stop: () => void } | null>(null);
  const devicesMapRef = useRef<Map<string, BtDevice>>(new Map());
  const proximityStateRef = useRef<Map<string, 'near' | 'far' | 'unknown'>>(
    new Map()
  );

  const {
    enabled,
    txPowerCalibration,
    pathLossExponent,
    nearThresholdMeters,
    farThresholdMeters,
    trackedDeviceIds,
    notificationsEnabled,
    notifyOnNear,
    notifyOnFar,
    onDeviceDiscovered,
  } = options;

  useEffect(() => {
    const hasRequestLEScan = !!(
      navigator.bluetooth &&
      typeof (navigator.bluetooth as any).requestLEScan === 'function'
    );
    setSupported(hasRequestLEScan);
  }, []);

  const startScanning = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth not supported in this browser');
      return;
    }

    // Check if requestLEScan is available
    if (typeof navigator.bluetooth.requestLEScan !== 'function') {
      setError(
        'Bluetooth Scanning API not available. Please enable chrome://flags/#enable-experimental-web-platform-features and restart Chrome completely.'
      );
      return;
    }

    // Must be called within a user gesture
    try {
      setError(null);
      setIsScanning(true);
      console.log('[BLE] Requesting LE Scan, supported check:', {
        hasNavigatorBluetooth: !!navigator.bluetooth,
        hasRequestLEScan: typeof navigator.bluetooth?.requestLEScan === 'function',
      });
      logger('[BLE] Requesting LE Scan...');

      const scan = await navigator.bluetooth.requestLEScan({
        acceptAllAdvertisements: true,
      });

      scanRef.current = scan;
      console.log('[BLE] Scan started successfully');
      console.log('[BLE] Scan object:', scan);
      console.log('[BLE] Scan active:', scan.active);
      
      // Check if events are being dispatched
      console.log('[BLE] navigator.bluetooth:', navigator.bluetooth);
      console.log('[BLE] Testing if bluetooth object can receive events...');

      const handleAdvertisement = (event: Event) => {
        console.log('[BLE] Advertisement received:', event);
        const bleEvent = event as BluetoothAdvertisementEvent;
        const { device, rssi, txPower } = bleEvent;

        console.log('[BLE] Device detected:', {
          id: device.id,
          name: device.name,
          rssi,
          txPower,
        });

        const deviceId = device.id;
        const deviceName = device.name || null;

        const effectiveTxPower = txPower ?? txPowerCalibration;
        const distance = estimateDistance(rssi, effectiveTxPower, pathLossExponent);
        const proximity = classifyProximity(
          distance,
          nearThresholdMeters,
          farThresholdMeters
        );

        const services: string[] = [];
        const manufacturerData: Record<string, string> = {};

        if (bleEvent.manufacturerData) {
          bleEvent.manufacturerData.forEach((dataView, key) => {
            const bytes = new Uint8Array(dataView.buffer);
            manufacturerData[key.toString()] = Array.from(bytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          });
        }

        const deviceType = identifyDeviceType(services, manufacturerData, deviceName);

        const isTracked = trackedDeviceIds.includes(deviceId);

        const btDevice: BtDevice = {
          id: deviceId,
          name: deviceName,
          rssi,
          txPower: txPower ?? null,
          estimatedDistance: distance,
          deviceType,
          lastSeen: new Date().toISOString(),
          services,
          manufacturerData,
          isTracked,
          proximity,
        };

        devicesMapRef.current.set(deviceId, btDevice);
        setDevices(new Map(devicesMapRef.current));

        if (isTracked && notificationsEnabled) {
          const previousProximity = proximityStateRef.current.get(deviceId);
          if (previousProximity !== proximity) {
            if (proximity === 'near' && notifyOnNear) {
              showNotification(deviceName || deviceId, 'near');
            } else if (proximity === 'far' && notifyOnFar) {
              showNotification(deviceName || deviceId, 'far');
            }
            proximityStateRef.current.set(deviceId, proximity);
          }
        }

        if (onDeviceDiscovered) {
          onDeviceDiscovered(btDevice);
        }
      };

      navigator.bluetooth.addEventListener(
        'advertisementreceived',
        handleAdvertisement as EventListener
      );

      console.log('[BLE] Event listener registered');
      console.log('[BLE] Bluetooth listeners count:', 
        (navigator.bluetooth as any).listenerCount?.('advertisementreceived') || 'unknown');
      
      // Try to trigger a test to see if events work
      setTimeout(() => {
        console.log('[BLE] 5 seconds elapsed. If you see no devices:');
        console.log('  1. Check Chrome DevTools > More Tools > Bluetooth Internals');
        console.log('  2. Ensure devices are within 10m range');
        console.log('  3. Try turning Bluetooth OFF then ON on your phone');
        console.log('  4. Devices found so far:', devicesMapRef.current.size);
      }, 5000);

      const pruneInterval = setInterval(() => {
        const now = Date.now();
        let hasChanges = false;

        devicesMapRef.current.forEach((device, id) => {
          const lastSeenTime = new Date(device.lastSeen).getTime();
          if (now - lastSeenTime > DEVICE_STALE_TIMEOUT) {
            devicesMapRef.current.delete(id);
            proximityStateRef.current.delete(id);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          setDevices(new Map(devicesMapRef.current));
        }
      }, 5000);

      return () => {
        clearInterval(pruneInterval);
        navigator.bluetooth?.removeEventListener(
          'advertisementreceived',
          handleAdvertisement as EventListener
        );
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start BLE scanning';
      setError(message);
      setIsScanning(false);
      logger('[BLE] Error:', message, err);
    }
  }, [
    txPowerCalibration,
    pathLossExponent,
    nearThresholdMeters,
    farThresholdMeters,
    trackedDeviceIds,
    notificationsEnabled,
    notifyOnNear,
    notifyOnFar,
    onDeviceDiscovered,
  ]);

  const stopScanning = useCallback(() => {
    if (scanRef.current) {
      scanRef.current.stop();
      scanRef.current = null;
    }
    setIsScanning(false);
    devicesMapRef.current.clear();
    proximityStateRef.current.clear();
    setDevices(new Map());
    logger('[BLE] Scanning stopped');
  }, []);

  useEffect(() => {
    // Don't auto-start scanning - must be triggered by user gesture
    if (!enabled && isScanning) {
      stopScanning();
    }
  }, [enabled, isScanning, stopScanning]);

  return {
    devices: Array.from(devices.values()),
    isScanning,
    error,
    supported,
    startScanning,
    stopScanning,
  };
}
