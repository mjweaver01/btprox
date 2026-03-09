import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return version;
}

export function incrementDevicesVersion() {
  version += 1;
  listeners.forEach(l => l());
}

export function useDevicesVersion() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
