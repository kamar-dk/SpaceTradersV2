import { createServer, type ServerResponse } from "node:http";
import { ApiError } from "../core/api.ts";
import { getAgent } from "../core/agent.ts";
import { listShips } from "../core/ships.ts";
import { listWaypoints } from "../core/systems.ts";
import { dock, orbit } from "../core/navigation.ts";
import type { Waypoint } from "../core/types.ts";

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
});