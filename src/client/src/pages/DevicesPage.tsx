import { useBluetooth } from '../context/BluetoothContext';

export function DevicesPage() {
  const { config, handleSaveConfig, devices } = useBluetooth();

  const trackedIds = config.trackedDeviceIds;

  // Show currently visible tracked devices with live data
  const trackedDevices = devices.filter(d => trackedIds.includes(d.id));

  // IDs that are tracked but not currently visible
  const offlineIds = trackedIds.filter(id => !devices.find(d => d.id === id));

  const removeTracking = async (deviceId: string) => {
    await handleSaveConfig({
      trackedDeviceIds: trackedIds.filter(id => id !== deviceId),
    });
  };

  if (trackedIds.length === 0) {
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
            <div
              key={device.id}
              className="rounded-lg border border-blue-500/30 bg-zinc-900/50 p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-medium text-zinc-100 truncate">
                    {device.name || 'Unknown Device'}
                  </h3>
                  <p className="text-sm text-zinc-500">{device.deviceType}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    device.proximity === 'near'
                      ? 'bg-blue-500/20 text-blue-400'
                      : device.proximity === 'far'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-zinc-500/20 text-zinc-400'
                  }`}
                >
                  {device.proximity}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mb-2">
                ~{device.estimatedDistance.toFixed(1)}m away
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600 font-mono truncate">
                  {device.id}
                </p>
                <button
                  onClick={() => removeTracking(device.id)}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Untrack
                </button>
              </div>
            </div>
          ))}

          {offlineIds.map(id => (
            <div
              key={id}
              className="rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-4 opacity-60"
            >
              <h3 className="font-medium text-zinc-400 mb-1">Not in range</h3>
              <p className="text-xs text-zinc-600 font-mono truncate mb-2">{id}</p>
              <button
                onClick={() => removeTracking(id)}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Untrack
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
