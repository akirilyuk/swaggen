import type { LandingExample } from './types';

export const iotTelemetryExample: LandingExample = {
  id: 'iot',
  title: 'IoT telemetry',
  tagline:
    'Devices streaming readings with alerts — narrow entities, high-volume reads.',
  category: 'IoT',
  entities: [
    {
      name: 'Device',
      fields: [
        { name: 'hardwareId', type: 'string' },
        { name: 'firmware', type: 'string' },
        { name: 'lastSeenAt', type: 'date' },
      ],
    },
    {
      name: 'Reading',
      fields: [
        { name: 'metric', type: 'string' },
        { name: 'value', type: 'number' },
        { name: 'recordedAt', type: 'date' },
      ],
    },
    {
      name: 'AlertRule',
      fields: [
        { name: 'threshold', type: 'number' },
        { name: 'channel', type: 'enum' },
      ],
    },
  ],
  relations: [
    { from: 'Device', label: '1 — N', to: 'Reading' },
    { from: 'Device', label: '1 — N', to: 'AlertRule' },
  ],
  operations: [
    {
      method: 'POST',
      path: '/devices/{id}/readings',
      summary: 'Ingest batch',
    },
    {
      method: 'GET',
      path: '/devices/{id}/readings',
      summary: 'Time-range query',
    },
    {
      method: 'GET',
      path: '/alerts/open',
      summary: 'Ops dashboard',
    },
  ],
  snippetTitle: 'Middleware hook (conceptual)',
  snippet: `// Global middleware: rate-limit + API key
export async function middleware(req: NextRequest) {
  const key = req.headers.get('x-api-key');
  if (!await validateDeviceKey(key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return rateLimit(req, { max: 1000, window: '1m' });
}`,
};
