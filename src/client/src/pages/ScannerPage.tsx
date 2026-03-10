import { useState } from 'react';
import { useBluetooth } from '../context/BluetoothContext';
import { DeviceCard } from '../components/DeviceCard';
import { ProximityMap } from '../components/ProximityMap';

export function ScannerPage() {
  const { scannerEnabled, setScannerEnabled, devices, isScanning, error, startScanning } =
    useBluetooth();
  const [view, setView] = useState<'map' | 'grid'>('map');

  const sortedDevices = [...devices].sort((a, b) => {
    if (a.isTracked && !b.isTracked) return -1;
    if (!a.isTracked && b.isTracked) return 1;
    return a.estimatedDistance - b.estimatedDistance;
  });

  return (
    <div className="space-y-6">
      {!scannerEnabled && !error && (
        <div className="text-center">
          <button
            onClick={async () => {
              setScannerEnabled(true);
              await startScanning();
            }}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Start Scanning
          </button>
          <p className="mt-4 text-sm text-zinc-500">
            Uses server-side Bluetooth to detect nearby devices
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {scannerEnabled && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Discovered Devices
              </h2>
              <p className="text-sm text-zinc-500">
                {devices.length} device{devices.length !== 1 ? 's' : ''} nearby
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                <button
                  onClick={() => setView('map')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  Grid
                </button>
              </div>
              <button
                onClick={() => setScannerEnabled(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Stop
              </button>
            </div>
          </div>

          {devices.length === 0 && isScanning ? (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-full bg-blue-500/20" />
              <p className="text-zinc-400">Scanning for BLE devices...</p>
              <p className="mt-2 text-sm text-zinc-600">
                Make sure Bluetooth devices are nearby and advertising
              </p>
            </div>
          ) : view === 'map' ? (
            <ProximityMap devices={sortedDevices} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedDevices.map(device => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
