import { createServer, type ServerResponse } from "node:http";
import { ApiError } from "../core/api.ts";
import { getAgent } from "../core/agent.ts";
import { listShips } from "../core/ships.ts";
import { listWaypoints } from "../core/systems.ts";
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

// --- Routes ---

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

// --- The server ---

const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const handler = req.method === "GET" && Object.hasOwn(routes, url.pathname) ? routes[url.pathname] : undefined;

    if (!handler) {
        return sendJson(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
    }

    try {
        sendJson(res, 200, await handler(url.searchParams));
    } catch (e) {
        // Pass the SpaceTraders status on (404 stays 404); anything else is our own failure (500)
        const status = e instanceof ApiError ? e.status : 500;
        const message = e instanceof Error ? e.message : String(e);
        console.error(`${req.method} ${url.pathname} failed: ${message}`);
        sendJson(res, status, { error: message });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
