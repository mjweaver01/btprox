import type { Request } from 'bun';
import {
  getDevices,
  getDevice,
  upsertDevice,
  updateDeviceTracking,
  updateDeviceName,
} from '../devices';

export async function devicesApi(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const trackedOnly = url.searchParams.get('tracked') === 'true';
    const devices = await getDevices(trackedOnly);
    return new Response(JSON.stringify(devices), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as {
        id: string;
        name?: string | null;
        deviceType?: string;
      };

      if (!body.id) {
        return new Response(JSON.stringify({ error: 'Device ID required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await upsertDevice(
        body.id,
        body.name ?? null,
        body.deviceType ?? 'Unknown'
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to upsert device' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

export async function devicesIdApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const deviceId = pathParts[pathParts.length - 1];

  if (!deviceId) {
    return new Response(JSON.stringify({ error: 'Device ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'GET') {
    const device = await getDevice(deviceId);
    if (!device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(device), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'PATCH') {
    try {
      const body = (await req.json()) as {
        isTracked?: boolean;
        name?: string;
      };

      if (body.isTracked !== undefined) {
        await updateDeviceTracking(deviceId, body.isTracked);
      }

      if (body.name !== undefined) {
        await updateDeviceName(deviceId, body.name);
      }

      const device = await getDevice(deviceId);
      return new Response(JSON.stringify(device), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to update device' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
