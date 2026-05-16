const PRODUCT_NAME = "BananaMediaPlayer";
const CLIENT_ID = "0f9bd6f5-4632-46b0-b4ac-5bb16030eaa1";

function baseHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    "X-Plex-Product": PRODUCT_NAME,
    "X-Plex-Client-Identifier": CLIENT_ID,
    Accept: "application/json",
  };
  if (token) h["X-Plex-Token"] = token;
  return h;
}

export interface PlexPin {
  id: number;
  code: string;
  expiresAt: string;
}

export interface PlexConnection {
  uri: string;
  local: boolean;
  relay: boolean;
  https: boolean;
}

export interface PlexServer {
  clientIdentifier: string;
  name: string;
  connections: PlexConnection[];
  token: string;
}

/** Step 1 — ask plex.tv for a one-time PIN. */
export async function requestPin(): Promise<PlexPin> {
  const res = await fetch("https://plex.tv/api/v2/pins?strong=true", {
    method: "POST",
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error(`PIN request failed: HTTP ${res.status}`);
  const json = await res.json();
  return {
    id: json.id as number,
    code: json.code as string,
    expiresAt: json.expiresAt as string,
  };
}

/** Step 2 — build the URL the user must visit to approve access. */
export function buildAuthUrl(code: string): string {
  return (
    "https://app.plex.tv/auth#?" +
    `clientID=${encodeURIComponent(CLIENT_ID)}&` +
    `code=${encodeURIComponent(code)}&` +
    `context[device][product]=${encodeURIComponent(PRODUCT_NAME)}`
  );
}

/**
 * Step 3 — poll plex.tv until the user has approved the PIN.
 * Resolves with the auth token; rejects with AbortError if cancelled or if
 * the PIN expires before the user approves.
 */
export function pollForToken(
  pinId: number,
  signal: AbortSignal,
  expiresAt: string,
  intervalMs = 2000,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onAbort = () => {
      if (timer !== null) clearTimeout(timer);
      reject(new DOMException("Polling cancelled", "AbortError"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    const expiry = new Date(expiresAt).getTime();

    const tick = async () => {
      if (signal.aborted) return;

      // Stop polling once the PIN has expired.
      if (Date.now() >= expiry) {
        signal.removeEventListener("abort", onAbort);
        reject(new Error("Plex PIN expired. Please try again."));
        return;
      }

      try {
        const res = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
          headers: baseHeaders(),
          signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.authToken) {
          signal.removeEventListener("abort", onAbort);
          resolve(json.authToken as string);
          return;
        }
      } catch (err: unknown) {
        if (signal.aborted) return; // already rejected by onAbort
        signal.removeEventListener("abort", onAbort);
        reject(err);
        return;
      }
      if (!signal.aborted) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    tick();
  });
}

/** Step 4 — fetch the list of Plex Media Servers owned by the account. */
export async function fetchServers(token: string): Promise<PlexServer[]> {
  const res = await fetch(
    "https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1",
    { headers: baseHeaders(token) },
  );
  if (!res.ok) throw new Error(`Failed to fetch servers: HTTP ${res.status}`);
  const json = (await res.json()) as Array<Record<string, unknown>>;
  return json
    .filter(
      (r) => typeof r.provides === "string" && r.provides.includes("server"),
    )
    .map((r) => ({
      clientIdentifier: r.clientIdentifier as string,
      name: r.name as string,
      token: r.accessToken as string,
      connections: (
        (r.connections as Array<Record<string, unknown>>) ?? []
      ).map((c) => ({
        uri: c.uri as string,
        local: Boolean(c.local),
        relay: Boolean(c.relay),
        https: (c.uri as string)?.startsWith("https") ?? false,
      })),
    }));
}

/**
 * Pick the best connection URI from a server's connection list.
 * Preference: non-relay HTTPS > non-relay HTTP > relay HTTPS > relay HTTP.
 */
export function pickBestConnection(server: PlexServer): string {
  const { connections: conns } = server;
  const nonLocal = conns.filter((c) => !c.local);
  const nonRelay = nonLocal.filter((c) => !c.relay);
  const nonRelayHttps = nonRelay.filter((c) => c.https);
  if (nonRelayHttps.length) return nonRelayHttps[0]!.uri;
  if (nonRelay.length) return nonRelay[0]!.uri;
  const relayHttps = conns.filter((c) => c.relay && c.https);
  if (relayHttps.length) return relayHttps[0]!.uri;
  return conns[0]?.uri ?? "";
}
