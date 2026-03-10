# btprox

A Bluetooth proximity sensor that uses server-side BLE scanning to discover nearby devices, displays them on an interactive radar-style proximity map, and triggers alerts when tracked devices enter or leave proximity thresholds.

## Tech Stack

- **Backend**: Bun (HTTP server + SQLite)
- **Frontend**: React 19, Tailwind CSS v4 (via bun-plugin-tailwind)
- **Bluetooth**: Server-side BLE scanning via [@stoprocent/noble](https://github.com/nicedoc/noble) (native CoreBluetooth on macOS)
- **Distance estimation**: RSSI-based path loss model, capped at 50m for indoor accuracy

## Requirements

- **Runtime**: [Bun](https://bun.sh)
- **macOS**: Bluetooth hardware + system Bluetooth permission for the terminal/IDE running the server
- **Browser**: Any modern browser (no special flags needed — scanning is server-side)

## Setup

```bash
bun install
```

On first install, `@stoprocent/noble` compiles native Bluetooth bindings. If prompted, trust the dependency:

```bash
bun pm trust @stoprocent/noble @stoprocent/bluetooth-hci-socket
bun install
```

## Generate HTTPS Certificate (Optional)

HTTPS is only needed if you want to use browser push notifications:

```bash
bun run cert:generate
```

Creates `certs/cert.pem` and `certs/key.pem`.

## Development

```bash
bun run dev
```

Opens at `http://localhost:4222` (or `https://` if certs are present). The server auto-starts BLE scanning on launch.

**Note:** macOS will prompt for Bluetooth permission on first run. Grant it to the terminal app (Terminal, iTerm, VS Code, etc.) running the server.

## Production

```bash
bun run start
```

## How It Works

1. The server starts a BLE scanner using `@stoprocent/noble`, which uses CoreBluetooth on macOS
2. The scanner listens for BLE advertisements from all nearby devices
3. RSSI (signal strength) is converted to estimated distance:
   ```
   distance = 10 ^ ((txPower - rssi) / (10 * pathLossExponent))
   ```
   - `txPower`: device-reported TX power, or calibration default (-59 dBm) if unavailable
   - `pathLossExponent`: environment factor (default 2.0; increase for cluttered indoor spaces)
   - Distances are capped at 50m (BLE is unreliable beyond this range)
4. The frontend polls the server for device data and renders an interactive proximity map
5. Devices are plotted on a radar-style visualization with concentric distance rings
6. Click any device to track it — tracked devices trigger browser notifications on proximity changes
7. Sighting history for tracked devices is logged to SQLite

## Proximity Map

The map view shows a radar-style visualization centered on the scanner:

- **Zoom**: scroll wheel or +/- buttons
- **Pan**: click and drag the background
- **Filter**: click legend items to show/hide device categories (Near, Far, Unknown, Tracked)
- **Hover**: hover a device node to see its name, distance, and signal info

## Configuration

Configurable via the web UI settings page:

| Setting | Default | Description |
|---------|---------|-------------|
| Scan Interval | 1000ms | How often the frontend polls for device updates |
| Near Threshold | 2m | Devices closer than this are classified "near" |
| Far Threshold | 10m | Devices farther than this are classified "far" |
| TX Power Calibration | -59 dBm | Expected RSSI at 1 meter (used when device doesn't report TX power) |
| Path Loss Exponent | 2.0 | Environment factor — 2.0 for open space, 2.7–4.3 for indoor walls/obstacles |
| Notifications | Off | Browser notifications for tracked device proximity changes |

Config is persisted per-browser in `config.json`.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Get current config |
| `/api/config` | POST | Update config |
| `/api/devices` | GET | List all discovered devices |
| `/api/devices` | POST | Upsert a device |
| `/api/devices/:id` | GET | Get device by ID |
| `/api/devices/:id` | PATCH | Update device (tracking status, name) |
| `/api/sightings` | GET | Get sighting history (query: `deviceId`) |
| `/api/sightings` | POST | Log device sightings (batch supported) |
| `/api/scanner/status` | GET | Scanner status (isScanning, bluetoothState, deviceCount, error) |
| `/api/scanner/start` | POST | Start BLE scanning |
| `/api/scanner/stop` | POST | Stop BLE scanning |
| `/api/scanner/devices` | GET | Get live discovered devices with RSSI/distance |

## Troubleshooting

**No devices detected**: Make sure nearby BLE devices are powered on and advertising. Not all devices advertise continuously.

**Bluetooth permission denied**: On macOS, go to System Settings > Privacy & Security > Bluetooth and grant access to your terminal app.

**Distances seem wrong**: Adjust the TX Power Calibration and Path Loss Exponent in settings. Higher path loss exponents (2.5–3.5) work better in rooms with walls and furniture.

**Server won't start (native module error)**: Re-run `bun pm trust @stoprocent/noble @stoprocent/bluetooth-hci-socket && bun install` to rebuild native bindings.
