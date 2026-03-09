# Getting Started with btprox

btprox is a browser-based Bluetooth proximity sensor that lets you discover nearby BLE devices, track their distance, and receive alerts when they enter or leave proximity zones.

## Quick Start

### 1. Prerequisites

- **Chrome or Chromium-based browser** (Edge, Brave, etc.)
- **Bluetooth hardware** on your device
- **Bun runtime** (install from [bun.sh](https://bun.sh))

### 2. Install Dependencies

```bash
bun install
```

### 3. Enable Experimental Web Bluetooth Features

btprox uses the experimental Web Bluetooth Scanning API. You must enable it in Chrome:

1. Open a new tab and go to: `chrome://flags/#enable-experimental-web-platform-features`
2. Set it to **Enabled**
3. Click **Relaunch** to restart Chrome

### 4. Generate HTTPS Certificate

Web Bluetooth requires HTTPS. Generate a self-signed certificate for local development:

```bash
bun run cert:generate
```

This creates `certs/cert.pem` and `certs/key.pem`.

### 5. Start the Server

```bash
bun run dev
```

The server will start at: **https://localhost:4222**

⚠️ **Important**: Use HTTPS, not HTTP! Your browser will show a certificate warning (because it's self-signed). Click "Advanced" → "Proceed to localhost" to continue.

## Using btprox

### Scanning for Devices

1. Click **"Start Scanning"** on the Scanner page
2. Grant Bluetooth permission when prompted
3. Nearby BLE devices will appear in the grid automatically
4. Devices are sorted by distance (closest first)

### Understanding the Display

Each device card shows:
- **Device name** (or "Unknown Device" if not advertising a name)
- **Device type** (iPhone, AirPods, Heart Rate Monitor, etc.)
- **Signal strength bar** (green = strong, yellow = medium, red = weak)
- **Estimated distance** in meters
- **Proximity badge** (near/far/unknown)
- **Last seen** timestamp
- **Device ID** (Bluetooth address)

### Tracking Devices

1. **Click any device card** to track it
2. Tracked devices show a green "Tracked" badge
3. Navigate to the **Devices** page to see all tracked devices
4. Click a tracked device to view its sighting history

### Setting Up Alerts

1. Click the **⚙️ Settings** icon in the header
2. Enable **Push notifications**
3. Grant notification permission when prompted
4. Check **"Notify when near"** and/or **"Notify when far"**
5. Click **Save**

You'll now get browser notifications when tracked devices cross proximity thresholds!

### Configuring Proximity Thresholds

In Settings, you can adjust:

- **Near Threshold** (default: 2m) - Devices within this distance are "near"
- **Far Threshold** (default: 10m) - Devices beyond this distance are "far"

### Advanced Calibration

For more accurate distance estimates, adjust these settings:

- **TX Power Calibration** (default: -59 dBm)
  - Expected RSSI at 1 meter
  - Device-specific; may need adjustment per device type
  
- **Path Loss Exponent** (default: 2.0)
  - Environment factor:
    - 2.0 = Free space (outdoors)
    - 2.7-3.5 = Office/home (typical indoor)
    - 4.0+ = Dense obstacles (walls, furniture)

## Troubleshooting

### "Bluetooth Not Supported"

**Solution**: Use Chrome, Edge, Brave, or another Chromium-based browser. Safari and Firefox don't support Web Bluetooth Scanning.

### "Failed to start BLE scanning"

**Solutions**:
1. Enable the experimental flag: `chrome://flags/#enable-experimental-web-platform-features`
2. Make sure you're using **HTTPS** (not HTTP)
3. Check that Bluetooth is enabled on your device
4. Restart your browser after enabling the flag

### "This site can't provide a secure connection"

**Solution**: This is normal with self-signed certificates. Click "Advanced" → "Proceed to localhost (unsafe)" to continue. Your connection is still encrypted; it's just not verified by a certificate authority.

### No Devices Detected

**Possible causes**:
- No BLE devices nearby are advertising
- Some devices only advertise intermittently to save battery
- The device might require pairing before advertising
- Try bringing a phone or smartwatch closer

**Tip**: iPhones and Apple devices advertise most actively when unlocked or in use.

### Distance Seems Inaccurate

**Solutions**:
1. Adjust **TX Power Calibration** for your specific device type
2. Increase **Path Loss Exponent** for indoor environments
3. RSSI-based distance is an estimate - expect ±30% accuracy
4. Metal objects and walls significantly affect signal

### Browser Says "Not Secure"

**Solution**: This is expected with self-signed certificates. Your connection is still encrypted. For production use, get a real certificate from Let's Encrypt.

## Tips & Best Practices

### Battery Monitoring
BLE scanning can use battery. The scanning is passive (no active connections), but continuous monitoring will drain battery faster than normal browsing.

### Privacy
btprox only sees devices that are actively advertising. It cannot:
- Connect to devices without permission
- Access any data on the devices
- Identify specific individuals (only device types)

### Performance
- The scanner automatically prunes devices not seen in 30 seconds
- Scanning is passive and lightweight
- Use tracked devices sparingly for best performance

### What Can You Track?

Great candidates:
- Your phone (find it when you lose it!)
- Fitness trackers and smartwatches
- Wireless headphones (AirPods, etc.)
- Tile trackers
- Bluetooth beacons
- Smart home devices

## Architecture

btprox consists of:
- **Frontend**: React 19 + Tailwind CSS
- **Backend**: Bun server + SQLite
- **Scanning**: Web Bluetooth Scanning API
- **Distance**: RSSI-based estimation

All processing happens locally - no cloud services required!

## API Endpoints

If you want to integrate with btprox:

- `GET /api/devices` - List all discovered devices
- `GET /api/devices?tracked=true` - List only tracked devices
- `GET /api/sightings?deviceId={id}` - Get sighting history
- `PATCH /api/devices/{id}` - Update device tracking/name
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration

## Need Help?

Check the README.md for additional technical details or troubleshooting steps.

Happy tracking! 📡
