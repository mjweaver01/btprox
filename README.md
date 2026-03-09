# btprox

A browser-based Bluetooth proximity sensor that passively discovers nearby BLE devices, displays them in a live grid with distance estimates, and triggers alerts when tracked devices enter or leave proximity thresholds.

## Tech Stack

- **Backend**: Bun (HTTP server + SQLite)
- **Frontend**: React 19, Tailwind CSS v4 (via bun-plugin-tailwind)
- **Bluetooth**: Web Bluetooth Scanning API (experimental)
- **Distance estimation**: RSSI-based calculation with configurable path loss

## Requirements

- **Browser**: Chrome or Chromium-based browser
- **Experimental flag**: `chrome://flags/#enable-experimental-web-platform-features` must be enabled
- **HTTPS**: Web Bluetooth requires secure context (self-signed cert script included)
- **Bluetooth**: Device must have Bluetooth hardware

## Project Setup

```bash
bun install
```

## Generate HTTPS Certificate (Required)

Web Bluetooth requires HTTPS. Generate a self-signed certificate for local development:

```bash
bun run cert:generate
```

This creates `certs/cert.pem` and `certs/key.pem`.

## Development

Run the Bun server (serves API and client with hot reload):

```bash
bun run dev
```

- **Server**: https://localhost:4222 (HTTPS required for Web Bluetooth)

## Production

Build and start the server:

```bash
bun run start
```

The server runs on port 4222 with automatic TLS if certificates are present.

## Configuration

- **Near Threshold**: Distance in meters to classify a device as "near" (default: 2m)
- **Far Threshold**: Distance in meters to classify a device as "far" (default: 10m)
- **TX Power Calibration**: Expected RSSI at 1 meter (default: -59 dBm)
- **Path Loss Exponent**: Environment factor - 2.0 for free space, 2.7-4.3 for indoor (default: 2.0)
- **Notifications**: Browser push notifications when tracked devices change proximity

Config is persisted per-browser in `config.json` and can be changed via the web UI.

## API

| Endpoint              | Method | Description                                     |
| --------------------- | ------ | ----------------------------------------------- |
| `/api/config`         | GET    | Get current config                              |
| `/api/config`         | POST   | Update config                                   |
| `/api/devices`        | GET    | List all discovered devices                     |
| `/api/devices`        | POST   | Upsert a device                                 |
| `/api/devices/:id`    | GET    | Get device by ID                                |
| `/api/devices/:id`    | PATCH  | Update device (tracking status, name)           |
| `/api/sightings`      | GET    | Get sighting history for a device (deviceId param) |
| `/api/sightings`      | POST   | Log device sightings (batch supported)          |

## How It Works

1. Click "Start Scanning" to request BLE scan permission
2. Browser passively listens for BLE advertisements from nearby devices
3. RSSI (signal strength) is converted to estimated distance using the formula:
   ```
   distance = 10 ^ ((txPower - rssi) / (10 * pathLossExponent))
   ```
4. Devices are displayed in a live grid, sorted by distance
5. Click any device to track it
6. Tracked devices trigger notifications when they cross near/far thresholds
7. Sighting history is logged to SQLite for tracked devices

## Troubleshooting

**"Bluetooth Not Supported"**: Use Chrome or a Chromium-based browser.

**"Failed to start BLE scanning"**: Enable experimental Web Bluetooth features at `chrome://flags/#enable-experimental-web-platform-features`

**Certificate warnings**: The self-signed certificate will show a warning in the browser. Click "Advanced" and "Proceed to localhost" to continue.

**No devices detected**: Ensure nearby BLE devices are advertising (not all devices advertise continuously).
