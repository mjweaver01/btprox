import { useEffect, useState } from 'react';
import type { AppConfig } from '@shared/types';

interface ConfigurationProps {
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => Promise<void>;
  embedded?: boolean;
}

export function Configuration({ config, onSave, embedded }: ConfigurationProps) {
  const [nearThresholdMeters, setNearThresholdMeters] = useState(
    config.nearThresholdMeters
  );
  const [farThresholdMeters, setFarThresholdMeters] = useState(
    config.farThresholdMeters
  );
  const [txPowerCalibration, setTxPowerCalibration] = useState(
    config.txPowerCalibration
  );
  const [pathLossExponent, setPathLossExponent] = useState(
    config.pathLossExponent
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    config.notificationsEnabled
  );
  const [notifyOnNear, setNotifyOnNear] = useState(config.notifyOnNear);
  const [notifyOnFar, setNotifyOnFar] = useState(config.notifyOnFar);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNearThresholdMeters(config.nearThresholdMeters);
    setFarThresholdMeters(config.farThresholdMeters);
    setTxPowerCalibration(config.txPowerCalibration);
    setPathLossExponent(config.pathLossExponent);
    setNotificationsEnabled(config.notificationsEnabled);
    setNotifyOnNear(config.notifyOnNear);
    setNotifyOnFar(config.notifyOnFar);
    setNotificationError(null);
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nearThresholdMeters,
        farThresholdMeters,
        txPowerCalibration,
        pathLossExponent,
        notificationsEnabled,
        notifyOnNear,
        notifyOnFar,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationError(null);
    if (enabled && typeof Notification !== 'undefined') {
      if (Notification.permission === 'denied') {
        setNotificationError(
          'Notifications were previously blocked. Enable them in your browser settings.'
        );
        return;
      }
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setNotificationError(
            perm === 'denied'
              ? 'Notifications blocked. Enable them in browser settings to use this feature.'
              : 'Could not request notification permission.'
          );
          return;
        }
      }
    }
    if (enabled && typeof Notification === 'undefined') {
      setNotificationError('Notifications are not supported in this browser.');
      return;
    }
    setNotificationsEnabled(enabled);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        embedded ? '' : 'rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-700/50'
      }
    >
      {!embedded && (
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">
          Configuration
        </h2>
      )}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="nearThreshold"
            className="mb-1 block text-sm text-zinc-400"
          >
            Near Threshold (meters)
          </label>
          <input
            id="nearThreshold"
            type="number"
            min={0.1}
            max={50}
            step={0.1}
            value={nearThresholdMeters}
            onChange={e => setNearThresholdMeters(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Devices within this distance are considered "near"
          </p>
        </div>

        <div>
          <label
            htmlFor="farThreshold"
            className="mb-1 block text-sm text-zinc-400"
          >
            Far Threshold (meters)
          </label>
          <input
            id="farThreshold"
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={farThresholdMeters}
            onChange={e => setFarThresholdMeters(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Devices beyond this distance are considered "far"
          </p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-300">
            Advanced Calibration
          </h3>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="txPower"
                className="mb-1 block text-sm text-zinc-400"
              >
                TX Power Calibration (dBm)
              </label>
              <input
                id="txPower"
                type="number"
                min={-100}
                max={0}
                step={1}
                value={txPowerCalibration}
                onChange={e => setTxPowerCalibration(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Expected RSSI at 1 meter (default: -59)
              </p>
            </div>

            <div>
              <label
                htmlFor="pathLoss"
                className="mb-1 block text-sm text-zinc-400"
              >
                Path Loss Exponent
              </label>
              <input
                id="pathLoss"
                type="number"
                min={1.5}
                max={4}
                step={0.1}
                value={pathLossExponent}
                onChange={e => setPathLossExponent(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Environment factor: 2.0 (free space), 2.7-4.3 (indoor)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <button
            type="button"
            onClick={() => handleNotificationsToggle(!notificationsEnabled)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md py-1 text-left transition-colors hover:bg-zinc-700/50"
          >
            <span className="text-sm font-medium text-zinc-100">
              Push notifications
            </span>
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                notificationsEnabled ? 'bg-blue-600' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
          {notificationError && (
            <p className="text-xs text-amber-400">{notificationError}</p>
          )}
          {notificationsEnabled && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Get notified when tracked devices change proximity
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-md py-1 px-2 transition-colors hover:bg-zinc-700/50">
                <input
                  type="checkbox"
                  checked={notifyOnNear}
                  onChange={e => setNotifyOnNear(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">Notify when near</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md py-1 px-2 transition-colors hover:bg-zinc-700/50">
                <input
                  type="checkbox"
                  checked={notifyOnFar}
                  onChange={e => setNotifyOnFar(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-300">Notify when far</span>
              </label>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
