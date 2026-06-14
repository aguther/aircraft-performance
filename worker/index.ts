import { normalizeOpenAipAirport, type OpenAipAirport, type OpenAipAirportList } from "../src/flight-data/openAip";

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  OPENAIP_API_KEY?: string;
};

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const OPENAIP_BASE_URL = "https://api.core.openaip.net/api";
const CACHE_CONTROL = "public, max-age=300, s-maxage=3600";

function json(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": status === 200 ? CACHE_CONTROL : "no-store",
      ...headers,
    },
  });
}

async function cached(request: Request, context: WorkerContext, load: () => Promise<Response>) {
  const cache = typeof caches === "undefined" ? undefined : (caches as CacheStorage & { default?: Cache }).default;
  const cachedResponse = await cache?.match(request);
  if (cachedResponse) return cachedResponse;
  const response = await load();
  if (response.ok && cache) context.waitUntil(cache.put(request, response.clone()));
  return response;
}

async function openAip(path: string, apiKey: string) {
  return fetch(`${OPENAIP_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "x-openaip-api-key": apiKey,
    },
  });
}

async function upstreamJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  if (response.status === 401 || response.status === 403) throw new Error("Der OpenAIP API-Key fehlt oder ist ungültig.");
  if (response.status === 429) throw new Error("OpenAIP hat das Anfrage-Limit erreicht. Bitte später erneut versuchen.");
  throw new Error(`OpenAIP ist derzeit nicht erreichbar (${response.status}).`);
}

export async function handleApiRequest(request: Request, env: Env, context: WorkerContext) {
  if (!env.OPENAIP_API_KEY) return json({ error: "OpenAIP ist noch nicht konfiguriert. Das Worker-Secret OPENAIP_API_KEY fehlt." }, 503);
  const url = new URL(request.url);

  try {
    if (url.pathname === "/api/airports") {
      const search = url.searchParams.get("search")?.trim() ?? "";
      if (search.length < 2) return json({ error: "Bitte mindestens zwei Zeichen für die Flugplatzsuche eingeben." }, 400);
      if (search.length > 80) return json({ error: "Die Flugplatzsuche ist zu lang." }, 400);
      return cached(request, context, async () => {
        const params = new URLSearchParams({ search, searchOptLwc: "true", limit: "15" });
        const result = await upstreamJson<OpenAipAirportList>(await openAip(`/airports?${params}`, env.OPENAIP_API_KEY!));
        const items = (result.items ?? []).map(normalizeOpenAipAirport).filter((airport) => airport !== null);
        return json({ items, totalCount: result.totalCount ?? items.length });
      });
    }

    const match = url.pathname.match(/^\/api\/airports\/([^/]+)$/);
    if (match) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(match[1])) return json({ error: "Ungültige Flugplatz-ID." }, 400);
      return cached(request, context, async () => {
        const airport = normalizeOpenAipAirport(await upstreamJson<OpenAipAirport>(await openAip(`/airports/${encodeURIComponent(match[1])}`, env.OPENAIP_API_KEY!)));
        return airport ? json(airport) : json({ error: "OpenAIP lieferte unvollständige Flugplatzdaten." }, 502);
      });
    }

    return json({ error: "API-Endpunkt nicht gefunden." }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Flugplatzdaten konnten nicht geladen werden." }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env, context: WorkerContext) {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApiRequest(request, env, context);
    return env.ASSETS.fetch(request);
  },
};
