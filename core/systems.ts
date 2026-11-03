import { api, apiAll} from "./api.ts";
import { systemOf } from "../utils.ts";
import type { System, Waypoint, WaypointTraitSymbol } from "./types.ts"

export function listSystems(): Promise<System[]> {
    return api<System[]>("/systems");
}

export function getSystem(systemSymbol: string): Promise<System> {
    return api<System>(`/systems/${systemOf(systemSymbol)}`);
}

export function listWaypoints(system: string, trait?: WaypointTraitSymbol): Promise<Waypoint[]> {
    const query = trait ? `?traits=${trait}` : "";
    return apiAll<Waypoint>(`/systems/${systemOf(system)}/waypoints${query}`);
}

export function getWaypoint(waypoint: string): Promise<Waypoint> {
    return api<Waypoint>(`/systems/${systemOf(waypoint)}/waypoints/${waypoint}`);
}