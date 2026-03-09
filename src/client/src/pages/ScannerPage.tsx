import { useBluetooth } from '../context/BluetoothContext';
import { DeviceCard } from '../components/DeviceCard';

export function ScannerPage() {
  const { scannerEnabled, setScannerEnabled, devices, isScanning, error, supported, startScanning } =
    useBluetooth();

  const sortedDevices = [...devices].sort((a, b) => {
    if (a.isTracked && !b.isTracked) return -1;
    if (!a.isTracked && b.isTracked) return 1;
    return a.estimatedDistance - b.estimatedDistance;
  });

  if (!supported) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-400">
            Bluetooth Scanning API Not Available
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            The experimental Bluetooth Scanning API is required for btprox to work.
          </p>
          <div className="space-y-3 text-left max-w-md mx-auto">
            <div className="rounded-lg bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-300 mb-2">
                Step 1: Enable the Flag
              </p>
              <p className="text-xs text-zinc-500 mb-2">
                Open a new tab and go to:
              </p>
              <code className="block rounded bg-zinc-800 px-2 py-1 text-xs text-blue-400">
                chrome://flags/#enable-experimental-web-platform-features
              </code>
              <p className="text-xs text-zinc-500 mt-2">
                Set it to <strong className="text-zinc-300">Enabled</strong>
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-300 mb-2">
                Step 2: Restart Chrome
              </p>
              <p className="text-xs text-zinc-500">
                Completely quit and reopen Chrome (not just refresh this page)
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-300 mb-2">
                Step 3: Refresh This Page
              </p>
              <p className="text-xs text-zinc-500">
                After restarting Chrome, reload btprox
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isScanning && !error && (
        <div className="text-center">
          <button
            onClick={async () => {
              setScannerEnabled(true);
              try {
                await startScanning();
              } catch (err) {
                console.error('[ScannerPage] startScanning() error:', err);
              }
            }}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Start Scanning
          </button>
          <p className="mt-4 text-sm text-zinc-500">
            Requires Chrome with experimental Web Bluetooth features enabled
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            chrome://flags/#enable-experimental-web-platform-features
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Make sure you've enabled experimental Web Bluetooth features in
            chrome://flags
          </p>
        </div>
      )}

      {isScanning && (
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
            <button
              onClick={() => setScannerEnabled(false)}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Stop Scanning
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-full bg-blue-500/20" />
              <p className="text-zinc-400">Scanning for BLE devices...</p>
              <p className="mt-2 text-sm text-zinc-600">
                Make sure Bluetooth devices are nearby and advertising
              </p>
            </div>
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
