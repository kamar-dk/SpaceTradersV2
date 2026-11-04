import { api } from "./api.ts";
import { secondsUntil, sleep } from "../utils.ts";
import type { ShipNav, ShipFuel, Agent, MarketTransaction, Ship, Waypoint } from "./types.ts";
import { getShip } from "./ships.ts";

export type FlightMode = "CRUISE" | "BURN" | "DRIFT" | "STEALTH";

const TIME_MULTIPLIER: Record<FlightMode, number> = {
    BURN: 12.5,
    CRUISE: 25,
    STEALTH: 30,
    DRIFT: 250,
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function fuelCost(dist: number, mode: FlightMode): number {
    const d = Math.max(1, Math.round(dist));
    switch (mode) {
        case "DRIFT":   return 1;
        case "BURN":    return 2 * d;
        case "CRUISE":
        case "STEALTH": return d;
    }
}

function travelSeconds(dist: number, speed: number, mode: FlightMode): number {
    return Math.round((Math.max(1, Math.round(dist)) * TIME_MULTIPLIER[mode]) / speed) + 15;
}

type RouteEstimate = {
    mode: FlightMode;
    fuel: number;
    seconds: number;
    possible: boolean; // enough fuel in the tank right now?
};

export function nextArrival(ships: Ship[]): Ship | undefined {
    return ships
        .filter((s) => s.nav.status === "IN_TRANSIT")
        .sort((a, b) => secondsUntil(a.nav.route.arrival) - secondsUntil(b.nav.route.arrival))[0];
}

export async function orbit(ship: string): Promise<ShipNav> {
    const data = await api<{ nav: ShipNav }>(`/my/ships/${ship}/orbit`, { method: "POST" });
    return data.nav;
}

export async function ensureOrbit(ship: string): Promise<void> {
    const s = await getShip(ship);
    if (s.nav.status === "DOCKED") await orbit(ship);
}

export async function dock(ship: string): Promise<ShipNav> {
    const data = await api<{ nav: ShipNav }>(`/my/ships/${ship}/dock`, { method: "POST" });
    return data.nav;
}

export async function ensureDocked(ship: string): Promise<void> {
    const s = await getShip(ship);
    if (s.nav.status === "IN_ORBIT") await dock(ship);
}

export async function navigate(ship: string, waypoint: string) {
    const data = await api<{ nav: ShipNav; fuel: ShipFuel }>(`/my/ships/${ship}/navigate`, {
        method: "POST",
        body: { waypointSymbol: waypoint },
    });
    return { ...data, secondsLeft: secondsUntil(data.nav.route.arrival) };
}

export function refuel(ship: string) {
    return api<{ agent: Agent, fuel: ShipFuel, transaction: MarketTransaction}>(`/my/ships/${ship}/refuel`, {method: "POST"});
}

export async function setFlightMode(ship: string, flightMode: FlightMode): Promise<ShipNav> {
    const data = await api<ShipNav | { nav: ShipNav }>(`/my/ships/${ship}/nav`, {
        method: "PATCH",
        body: { flightMode },
    });
    // Some API versions return the nav directly, others wrap it as { nav }
    return "nav" in data ? data.nav : data;
}

export function estimateRoute(ship: Ship, from: Waypoint, to: Waypoint): { distance: number, options: RouteEstimate[] } {
    const dist = distance(from, to);
    const modes = Object.keys(TIME_MULTIPLIER) as FlightMode[];

    return {
        distance: dist,
        options: modes.map((mode) => {
            const fuel = fuelCost(dist, mode);
            return {
                mode,
                fuel,
                seconds: travelSeconds(dist, ship.engine.speed, mode),
                // Solar ships like the probe have no fuel tank and can always fly
                possible: ship.fuel.capacity === 0 || fuel <= ship.fuel.current,
            }; 
        })
    }
}

export type FlyOptions = {
    wait?: (seconds: number, label: string) => Promise<void>;
    onDepart?: (info: { destination: string; fuel: ShipFuel; seconds: number }) => void;
};

export async function flyTo(ship: string, waypoint: string, options: FlyOptions = {}): Promise<void> {
    const { wait = sleep, onDepart = () => {} } = options;

    let s = await getShip(ship);
    if (s.nav.status === "IN_TRANSIT") {
        await wait(secondsUntil(s.nav.route.arrival) + 1, "Arriving in");
        s = await getShip(ship);
    }
    if (s.nav.waypointSymbol === waypoint) return;

    await ensureOrbit(ship);
    const { fuel, secondsLeft } = await navigate(ship, waypoint);
    onDepart({ destination: waypoint, fuel, seconds: secondsLeft });
    await wait(secondsLeft + 1, "Arriving in");
}