const SERVICE_UUID_TYPES: Record<string, string> = {
  '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate Monitor',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
  '00001810-0000-1000-8000-00805f9b34fb': 'Blood Pressure',
  '00001811-0000-1000-8000-00805f9b34fb': 'Alert Notification',
  '00001812-0000-1000-8000-00805f9b34fb': 'Human Interface Device',
  '00001816-0000-1000-8000-00805f9b34fb': 'Cycling Speed/Cadence',
  '0000181a-0000-1000-8000-00805f9b34fb': 'Environmental Sensing',
  '0000181c-0000-1000-8000-00805f9b34fb': 'User Data',
  '0000181d-0000-1000-8000-00805f9b34fb': 'Weight Scale',
  '0000fee0-0000-1000-8000-00805f9b34fb': 'Google Fast Pair',
  '0000fee7-0000-1000-8000-00805f9b34fb': 'Tile',
  '0000fd6f-0000-1000-8000-00805f9b34fb': 'Exposure Notification',
  '74278bda-b644-4520-8f0c-720eaf059935': 'AirPods',
};

const MANUFACTURER_TYPES: Record<number, string> = {
  76: 'Apple',
  6: 'Microsoft',
  117: 'Samsung',
  224: 'Google',
  89: 'Amazon',
  2456: 'Tile',
  741: 'Fitbit',
  10: 'Qualcomm',
  13: 'Texas Instruments',
  15: 'Broadcom',
};

export function identifyDeviceType(
  services: string[],
  manufacturerData: Record<string, string>,
  name: string | null
): string {
  for (const service of services) {
    const normalized = service.toLowerCase();
    if (SERVICE_UUID_TYPES[normalized]) {
      return SERVICE_UUID_TYPES[normalized];
    }
  }

  const manufacturerIds = Object.keys(manufacturerData).map(k => parseInt(k, 10));
  for (const id of manufacturerIds) {
    if (MANUFACTURER_TYPES[id]) {
      return MANUFACTURER_TYPES[id];
    }
  }

  if (name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('airpods')) return 'AirPods';
    if (lowerName.includes('iphone')) return 'iPhone';
    if (lowerName.includes('ipad')) return 'iPad';
    if (lowerName.includes('watch')) return 'Smart Watch';
    if (lowerName.includes('band')) return 'Fitness Band';
    if (lowerName.includes('tile')) return 'Tile Tracker';
    if (lowerName.includes('beacon')) return 'Beacon';
    if (lowerName.includes('heart')) return 'Heart Rate Monitor';
    if (lowerName.includes('headphone') || lowerName.includes('earbuds'))
      return 'Headphones';
    if (lowerName.includes('speaker')) return 'Speaker';
    if (lowerName.includes('keyboard')) return 'Keyboard';
    if (lowerName.includes('mouse')) return 'Mouse';
  }

  return 'Unknown BLE Device';
}
