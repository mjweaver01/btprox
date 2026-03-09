import type { Request } from 'bun';
import { getSightings, saveSighting } from '../devices';

export async function sightingsApi(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const deviceId = url.searchParams.get('deviceId');
    const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);

    if (!deviceId) {
      return new Response(JSON.stringify({ error: 'deviceId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sightings = await getSightings(deviceId, limit);
    return new Response(JSON.stringify(sightings), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as
        | {
            deviceId: string;
            rssi: number;
            estimatedDistance: number;
            proximity: 'near' | 'far' | 'unknown';
          }
        | {
            deviceId: string;
            rssi: number;
            estimatedDistance: number;
            proximity: 'near' | 'far' | 'unknown';
          }[];

      const sightings = Array.isArray(body) ? body : [body];

      for (const sighting of sightings) {
        if (
          !sighting.deviceId ||
          typeof sighting.rssi !== 'number' ||
          typeof sighting.estimatedDistance !== 'number'
        ) {
          continue;
        }
        await saveSighting(
          sighting.deviceId,
          sighting.rssi,
          sighting.estimatedDistance,
          sighting.proximity
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to save sightings' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
