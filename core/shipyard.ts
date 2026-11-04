import { systemOf } from "../utils.ts";
import { api } from "./api.ts";
import { listShips } from "./ships.ts";
import { listWaypoints } from "./systems.ts";
import type { Shipyard, ShipType, Agent, Ship, ShipyardTransaction } from "./types.ts";

export type BuyShipResult = {
    agent: Agent;
    ship: Ship;
    transaction: ShipyardTransaction;
};

export function getShipyard(waypoint: string): Promise<Shipyard> {
    return api<Shipyard>(`/systems/${systemOf(waypoint)}/waypoints/${waypoint}/shipyard`);
}

export async function listShipyards(system: string): Promise<Shipyard[]> {
    const waypoints = await listWaypoints(system, "SHIPYARD");
    const yards: Shipyard[] = [];
    for (const w of waypoints) yards.push(await getShipyard(w.symbol));
    return yards;
}

export async function buyShip(shipType: ShipType, waypoint: string): Promise<BuyShipResult> {
    return api<BuyShipResult>("/my/ships", {
        method: "POST",
        body: {shipType, waypointSymbol: waypoint },
    });
}