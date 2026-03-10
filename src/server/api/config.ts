import type { AppConfig } from '@shared/types';
import { getConfig, saveConfig } from '../config';

function getBrowserId(req: Request): string | null {
  return req.headers.get('X-Browser-Id') ?? new URL(req.url).searchParams.get('browserId');
}

export const configApi = {
  GET: (req: Request) => Response.json(getConfig(getBrowserId(req))),
  POST: async (req: Request) => {
    const browserId = getBrowserId(req);
    const body = (await req.json()) as Partial<AppConfig>;
    const updates: Partial<AppConfig> = {};
    const numKeys = [
      'scanIntervalMs',
      'nearThresholdMeters',
      'farThresholdMeters',
      'txPowerCalibration',
      'pathLossExponent',
    ] as const satisfies readonly (keyof AppConfig)[];
    for (const key of numKeys) {
      const val = body[key];
      if (typeof val === 'number') updates[key] = val;
    }
    if (Array.isArray(body.trackedDeviceIds))
      updates.trackedDeviceIds = body.trackedDeviceIds;
    if (typeof body.notificationsEnabled === 'boolean')
      updates.notificationsEnabled = body.notificationsEnabled;
    if (typeof body.notifyOnNear === 'boolean')
      updates.notifyOnNear = body.notifyOnNear;
    if (typeof body.notifyOnFar === 'boolean')
      updates.notifyOnFar = body.notifyOnFar;
    const config = await saveConfig(browserId, updates);
    return Response.json(config);
  },
};
