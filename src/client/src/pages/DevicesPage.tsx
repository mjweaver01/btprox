import { useState, useEffect } from 'react';
import type { DeviceSighting } from '@shared/types';
import { API_BASE } from '@shared/constants';
import { useBluetooth } from '../context/BluetoothContext';
import { useDevicesVersion } from '../lib/devicesVersion';
import type { DeviceRow } from '../../../server/devices';
import { SignalStrengthBar } from '../components/SignalStrengthBar';

export function DevicesPage() {
  const { config } = useBluetooth();
  const [trackedDevices, setTrackedDevices] = useState<DeviceRow[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [sightings, setSightings] = useState<DeviceSighting[]>([]);
  const [loading, setLoading] = useState(false);
  const version = useDevicesVersion();

  useEffect(() => {
    fetch(`${API_BASE}/devices?tracked=true`)
      .then(r => r.json())
      .then(setTrackedDevices)
      .catch(() => {});
  }, [version, config.trackedDeviceIds]);

  useEffect(() => {
    if (!selectedDevice) {
      setSightings([]);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/sightings?deviceId=${selectedDevice}&limit=50`)
      .then(r => r.json())
      .then(setSightings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDevice]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (trackedDevices.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">
            No Tracked Devices
          </h2>
          <p className="text-sm text-zinc-500">
            Click on a device in the Scanner view to start tracking it
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Tracked Devices
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trackedDevices.map(device => (
            <button
              key={device.id}
              onClick={() =>
                setSelectedDevice(selectedDevice === device.id ? null : device.id)
              }
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedDevice === device.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
              }`}
            >
              <h3 className="mb-1 font-medium text-zinc-100 truncate">
                {device.name || 'Unknown Device'}
              </h3>
              <p className="mb-2 text-sm text-zinc-500">{device.device_type}</p>
              <p className="text-xs text-zinc-600">
                Last seen: {formatTimestamp(device.last_seen)}
              </p>
              <p className="mt-1 text-xs text-zinc-600 font-mono truncate">
                {device.id}
              </p>
            </button>
          ))}
        </div>
      </div>

      {selectedDevice && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">
            Sighting History
          </h3>

          {loading ? (
            <div className="py-8 text-center text-zinc-500">Loading...</div>
          ) : sightings.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No sightings recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {sightings.map(sighting => (
                <div
                  key={sighting.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-zinc-400">
                      {formatTimestamp(sighting.timestamp)}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        sighting.proximity === 'near'
                          ? 'bg-blue-500/20 text-blue-400'
                          : sighting.proximity === 'far'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {sighting.proximity}
                    </span>
                  </div>
                  <SignalStrengthBar rssi={sighting.rssi} className="mb-2" />
                  <div className="text-sm text-zinc-500">
                    Distance: ~{sighting.estimatedDistance.toFixed(1)}m
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
