import { createServer, type ServerResponse } from "node:http";
import { ApiError } from "../core/api.ts";
import { getAgent } from "../core/agent.ts";
import { listShips } from "../core/ships.ts";
import { listWaypoints } from "../core/systems.ts";
import { dock, orbit } from "../core/navigation.ts";
import { getMarket } from "../core/market.ts";
import { getSavedMarket } from "../core/marketStore.ts";
import { getShipyard } from "../core/shipyard.ts";
import { systemOf } from "../utils.ts";
import type { Market, Shipyard, Waypoint } from "../core/types.ts";

const PORT = 3000;

// --- Cache ---

// Waypoints almost never change, so each system is fetched once and kept in memory.
// Restart the server to clear it.
const waypointCache = new Map<string, Waypoint[]>();

async function getWaypointsCached(system: string): Promise<Waypoint[]> {
    let list = waypointCache.get(system);
    if (!list) {
        list = await listWaypoints(system);
        waypointCache.set(system, list);
    }
    return list;
}

// Markets come from markets.json; a market is only fetched (and so saved) the first time it's seen.
// The saved version keeps the last live prices, with the time they were seen.
async function getMarkets(system: string): Promise<Market[]> {
    const waypoints = await getWaypointsCached(system);
    const withMarket = waypoints.filter((w) => w.traits.some((t) => t.symbol === "MARKETPLACE"));

    // One at a time, to stay within the API's rate limit
    const markets: Market[] = [];
    for (const w of withMarket) {
        markets.push(getSavedMarket(w.symbol) ?? (await getMarket(w.symbol)));
    }
    return markets;
}

// Which ships each shipyard offers rarely changes, so each system's shipyards are fetched once.
const shipyardCache = new Map<string, Shipyard[]>();

async function getShipyardsCached(system: string): Promise<Shipyard[]> {
    let shipyards = shipyardCache.get(system);
    if (!shipyards) {
        const waypoints = await getWaypointsCached(system);
        const withShipyard = waypoints.filter((w) => w.traits.some((t) => t.symbol === "SHIPYARD"));

        shipyards = [];
        for (const w of withShipyard) {
            shipyards.push(await getShipyard(w.symbol));
        }
        shipyardCache.set(system, shipyards);
    }
    return shipyards;
}

// --- Price scout ---

// Every few minutes: fetch the market wherever a ship is parked.
// With a ship present the market has live prices, and getMarket saves them to markets.json.
const SCOUT_MINUTES = 1;

async function scoutPrices(): Promise<void> {
    try {
        const ships = await listShips();
        const parkedAt = new Set(
            ships.filter((s) => s.nav.status !== "IN_TRANSIT").map((s) => s.nav.waypointSymbol),
        );

        for (const waypoint of parkedAt) {
            const waypoints = await getWaypointsCached(systemOf(waypoint));
            const w = waypoints.find((x) => x.symbol === waypoint);
            if (w?.traits.some((t) => t.symbol === "MARKETPLACE")) {
                await getMarket(waypoint);
            }
        }
    } catch (e) {
        // One failed round shouldn't stop the server; the next round tries again
        console.error(`Price scout failed: ${e instanceof Error ? e.message : e}`);
    }
}

// --- Helpers ---

function sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

// --- Routes: reading (GET) ---

// Each route is a URL path plus a function that returns the data for it.
// Add a line here for every new endpoint.
type Handler = (params: URLSearchParams) => Promise<unknown>;

const routes: Record<string, Handler> = {
    "/api/agent": () => getAgent(),
    "/api/ships": () => listShips(),
    "/api/waypoints": (params) => {
        const system = params.get("system");
        if (!system) throw new ApiError(400, "Missing ?system=");
        return getWaypointsCached(system);
    },
    "/api/markets": (params) => {
        const system = params.get("system");
        if (!system) throw new ApiError(400, "Missing ?system=");
        return getMarkets(system);
    },
    "/api/shipyards": (params) => {
        const system = params.get("system");
        if (!system) throw new ApiError(400, "Missing ?system=");
        return getShipyardsCached(system);
    },
};

// --- Routes: actions (POST) ---

// The ship symbol is part of the path, e.g. /api/ships/KAMAR-1/orbit.
// ([^/]+) captures everything up to the next slash: the ship symbol.
type ActionRoute = { pattern: RegExp; handler: (ship: string) => Promise<unknown> };

const actionRoutes: ActionRoute[] = [
    { pattern: /^\/api\/ships\/([^/]+)\/orbit$/, handler: async (ship) => ({ nav: await orbit(ship) }) },
    { pattern: /^\/api\/ships\/([^/]+)\/dock$/, handler: async (ship) => ({ nav: await dock(ship) }) },
];

// Finds the handler for a request, or undefined if there is none
function findHandler(method: string | undefined, url: URL): (() => Promise<unknown>) | undefined {
    if (method === "GET" && Object.hasOwn(routes, url.pathname)) {
        return () => routes[url.pathname](url.searchParams);
    }

    if (method === "POST") {
        for (const { pattern, handler } of actionRoutes) {
            const match = url.pathname.match(pattern);
            if (match) return () => handler(decodeURIComponent(match[1]));
        }
    }

    return undefined;
}

// --- The server ---

const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const handler = findHandler(req.method, url);

    if (!handler) {
        return sendJson(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
    }

    try {
        sendJson(res, 200, await handler());
    } catch (e) {
        // Pass the SpaceTraders status on (404 stays 404); anything else is our own failure (500)
        const status = e instanceof ApiError ? e.status : 500;
        const message = e instanceof Error ? e.message : String(e);
        console.error(`${req.method} ${url.pathname} failed: ${message}`);
        sendJson(res, status, { error: message });
    }
});

// 127.0.0.1: only this PC can reach the server, not others on the same network
server.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Start scouting prices now, and again every SCOUT_MINUTES
    scoutPrices();
    setInterval(scoutPrices, SCOUT_MINUTES * 10_000);
});