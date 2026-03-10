import {
  startScanner,
  stopScanner,
  getDiscoveredDevices,
  getScannerStatus,
} from '../scanner/index';

function getBrowserId(req: Request): string | null {
  return req.headers.get('X-Browser-Id') ?? new URL(req.url).searchParams.get('browserId');
}

export const scannerStatusApi = {
  GET: () => Response.json(getScannerStatus()),
};

export const scannerStartApi = {
  POST: async () => {
    await startScanner();
    return Response.json({ success: true });
  },
};

export const scannerStopApi = {
  POST: () => {
    stopScanner();
    return Response.json({ success: true });
  },
};

export const scannerDevicesApi = {
  GET: (req: Request) => Response.json(getDiscoveredDevices(getBrowserId(req))),
};
