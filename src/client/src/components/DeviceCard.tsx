import type { BtDevice } from '@shared/types';
import { SignalStrengthBar } from './SignalStrengthBar';
import { useBluetooth } from '../context/BluetoothContext';
import { API_BASE } from '@shared/constants';
import { getBrowserId } from '../lib/browserId';

interface DeviceCardProps {
  device: BtDevice;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const { config, handleSaveConfig } = useBluetooth();

  const toggleTracking = async () => {
    const newTracked = !device.isTracked;

    await fetch(`${API_BASE}/devices/${device.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Browser-Id': getBrowserId(),
      },
      body: JSON.stringify({ isTracked: newTracked }),
    }).catch(() => {});

    const newTrackedIds = newTracked
      ? [...config.trackedDeviceIds, device.id]
      : config.trackedDeviceIds.filter(id => id !== device.id);

    await handleSaveConfig({ trackedDeviceIds: newTrackedIds });
  };

  const getProximityColor = () => {
    if (device.proximity === 'near') return 'text-emerald-400 bg-emerald-500/10';
    if (device.proximity === 'far') return 'text-red-400 bg-red-500/10';
    return 'text-zinc-400 bg-zinc-500/10';
  };

  const getBorderColor = () => {
    if (device.proximity === 'near') return 'border-emerald-500/30';
    if (device.proximity === 'far') return 'border-red-500/30';
    return 'border-zinc-700/50';
  };

  const timeSince = (timestamp: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    );
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <button
      onClick={toggleTracking}
      className={`w-full rounded-lg border ${getBorderColor()} bg-zinc-900/50 p-4 text-left transition-all hover:bg-zinc-900/80 hover:border-emerald-500/50`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-100 truncate">
            {device.name || 'Unknown Device'}
          </h3>
          <p className="text-sm text-zinc-500 truncate">{device.deviceType}</p>
        </div>
        {device.isTracked && (
          <div className="flex-shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            Tracked
          </div>
        )}
      </div>

      <SignalStrengthBar rssi={device.rssi} className="mb-3" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-400">
            {device.estimatedDistance >= 0
              ? `~${device.estimatedDistance.toFixed(1)}m`
              : 'Unknown distance'}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${getProximityColor()}`}
          >
            {device.proximity}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{timeSince(device.lastSeen)}</span>
      </div>

      <div className="mt-2 text-xs text-zinc-600 font-mono truncate">
        {device.id}
      </div>
    </button>
  );
}
