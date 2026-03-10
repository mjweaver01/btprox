import { Database } from 'bun:sqlite';
import { join } from 'path';
import type { DeviceSighting } from '@shared/types';
import { logger } from '@shared/logger';
import { PROJECT_ROOT } from '@shared/root';

const DB_PATH = join(PROJECT_ROOT, 'devices.sqlite');

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    throw new Error(
      'Device DB not initialized. Call initDeviceDb() at startup.'
    );
  }
  return db;
}

export async function initDeviceDb(): Promise<void> {
  if (db) return;
  db = new Database(DB_PATH, { create: true });

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT,
      device_type TEXT NOT NULL DEFAULT 'Unknown',
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      is_tracked INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      rssi REAL NOT NULL,
      estimated_distance REAL NOT NULL,
      proximity TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  logger('[DeviceDB] Initialized');
}

export interface DeviceRow {
  id: string;
  name: string | null;
  device_type: string;
  first_seen: string;
  last_seen: string;
  is_tracked: number;
}

export async function upsertDevice(
  id: string,
  name: string | null,
  deviceType: string
): Promise<void> {
  const database = getDb();
  const now = new Date().toISOString();

  const existing = database
    .query('SELECT id FROM devices WHERE id = ?')
    .get(id) as { id: string } | null;

  if (existing) {
    database
      .prepare(
        'UPDATE devices SET name = ?, device_type = ?, last_seen = ? WHERE id = ?'
      )
      .run(name, deviceType, now, id);
  } else {
    database
      .prepare(
        'INSERT INTO devices (id, name, device_type, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)'
      )
      .run(id, name, deviceType, now, now);
  }
}

export async function getDevices(trackedOnly = false): Promise<DeviceRow[]> {
  const database = getDb();
  const query = trackedOnly
    ? 'SELECT * FROM devices WHERE is_tracked = 1 ORDER BY last_seen DESC'
    : 'SELECT * FROM devices ORDER BY last_seen DESC';

  return database.query(query).all() as DeviceRow[];
}

export async function getDevice(id: string): Promise<DeviceRow | null> {
  const database = getDb();
  return database
    .query('SELECT * FROM devices WHERE id = ?')
    .get(id) as DeviceRow | null;
}

export async function updateDeviceTracking(
  id: string,
  isTracked: boolean
): Promise<void> {
  const database = getDb();
  database
    .prepare('UPDATE devices SET is_tracked = ? WHERE id = ?')
    .run(isTracked ? 1 : 0, id);
}

export async function updateDeviceName(
  id: string,
  name: string
): Promise<void> {
  const database = getDb();
  database.prepare('UPDATE devices SET name = ? WHERE id = ?').run(name, id);
}

export async function saveSighting(
  deviceId: string,
  rssi: number,
  estimatedDistance: number,
  proximity: 'near' | 'far' | 'unknown'
): Promise<void> {
  const database = getDb();
  const now = new Date().toISOString();

  database
    .prepare(
      'INSERT INTO sightings (device_id, rssi, estimated_distance, proximity, timestamp) VALUES (?, ?, ?, ?, ?)'
    )
    .run(deviceId, rssi, estimatedDistance, proximity, now);
}

export async function getSightings(
  deviceId: string,
  limit = 100
): Promise<DeviceSighting[]> {
  const database = getDb();

  const rows = database
    .query(
      `SELECT 
        s.id,
        s.device_id,
        d.name as device_name,
        s.rssi,
        s.estimated_distance,
        s.proximity,
        s.timestamp
      FROM sightings s
      LEFT JOIN devices d ON s.device_id = d.id
      WHERE s.device_id = ?
      ORDER BY s.timestamp DESC
      LIMIT ?`
    )
    .all(deviceId, limit) as {
    id: number;
    device_id: string;
    device_name: string | null;
    rssi: number;
    estimated_distance: number;
    proximity: string;
    timestamp: string;
  }[];

  return rows.map(r => ({
    id: r.id.toString(),
    deviceId: r.device_id,
    deviceName: r.device_name,
    rssi: r.rssi,
    estimatedDistance: r.estimated_distance,
    proximity: r.proximity as 'near' | 'far' | 'unknown',
    timestamp: r.timestamp,
  }));
}
