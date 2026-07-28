import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

/**
 * Server-side proxy for OpenStreetMap's Nominatim.
 *
 * The browser used to call Nominatim directly from every visitor. That breaks
 * OSM's usage policy on two counts — no identifying User-Agent, and no way to
 * stay under the 1 request/second cap once more than one person is on the site —
 * and the practical result is being blocked.
 *
 * Proxying adds a proper User-Agent, a shared in-process cache, and a global
 * request spacer, so the whole site behaves as one well-behaved client.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REQUEST_SPACING_MS = 1100;
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  body: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
let lastRequestAt = 0;

function readCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.body;
}

function writeCache(key: string, body: unknown) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Cheap eviction: drop the oldest inserted key.
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Serialises outbound calls so we never exceed one request per second. */
async function spaceRequests() {
  const wait = lastRequestAt + MIN_REQUEST_SPACING_MS - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

async function callNominatim(path: string): Promise<unknown> {
  await spaceRequests();

  const res = await fetch(`${NOMINATIM}${path}`, {
    headers: {
      // Nominatim requires a genuine identifying agent with contact details.
      'User-Agent': process.env.NOMINATIM_USER_AGENT
        || 'SchoolFinder/1.0 (+https://schoolfinder.co.ug; contact@schoolfinder.co.ug)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  const limit = rateLimit(request, 'geocode', { limit: 30, windowMs: 60 * 1000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') === 'reverse' ? 'reverse' : 'search';

  let path: string;
  let cacheKey: string;

  if (mode === 'reverse') {
    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: 'Valid lat and lon are required' }, { status: 400 });
    }

    // Rounded to ~10m, which massively improves the cache hit rate without
    // changing the answer anyone gets.
    const roundedLat = lat.toFixed(4);
    const roundedLon = lon.toFixed(4);
    path = `/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLon}&addressdetails=1`;
    cacheKey = `reverse:${roundedLat},${roundedLon}`;
  } else {
    const query = (searchParams.get('q') || '').trim();
    if (query.length < 3) {
      return NextResponse.json([], { status: 200 });
    }

    path = `/search?format=jsonv2&countrycodes=ug&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;
    cacheKey = `search:${query.toLowerCase()}`;
  }

  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'HIT' },
    });
  }

  try {
    const body = await callNominatim(path);
    writeCache(cacheKey, body);

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('[geocode] lookup failed:', error);
    return NextResponse.json(
      { error: 'Location lookup is unavailable right now' },
      { status: 503 }
    );
  }
}
