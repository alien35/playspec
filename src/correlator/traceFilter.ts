import type { NetworkTraceEvent } from '../collector/traceArtifact.ts';

const STATIC_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.css',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

const FRAMEWORK_NOISE_PATHS = [
  '/_next/',
  '/__vite_ping',
  '/sockjs-node',
  '/socket.io',
  '/hot-update',
  '/manifest.json',
  '/robots.txt',
  '/favicon.ico',
];

export function isStaticOrFrameworkNoise(event: NetworkTraceEvent): boolean {
  const pathLower = (event.path || '').toLowerCase();

  for (const noise of FRAMEWORK_NOISE_PATHS) {
    if (pathLower.includes(noise)) {
      return true;
    }
  }

  const dotIdx = pathLower.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = pathLower.slice(dotIdx);
    if (STATIC_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  // Preflight OPTIONS requests don't represent business interactions
  if (event.method === 'OPTIONS') {
    return true;
  }

  return false;
}

export function filterNetworkEvents(
  events: NetworkTraceEvent[],
  apiPrefixes: string[] = ['/api/', '/graphql', '/trpc/']
): NetworkTraceEvent[] {
  return events.filter((ev) => {
    if (isStaticOrFrameworkNoise(ev)) {
      return false;
    }
    // If apiPrefixes is specified and non-empty, check if path matches any prefix
    if (apiPrefixes.length > 0) {
      return apiPrefixes.some((prefix) => ev.path.startsWith(prefix) || ev.url.includes(prefix));
    }
    return true;
  });
}
