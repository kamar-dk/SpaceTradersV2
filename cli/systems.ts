import * as systems from "../core/systems.ts";
import type { System, Waypoint, WaypointTraitSymbol } from "../core/types.ts";
import { header, row } from "./table.ts";

const SYSTEM_COLS = [10, 14, 14, -9];      // -9: waypoint count right-aligned
const WAYPOINT_COLS = [14, 24, 13];

const SYSTEM_HEADER = ["SYMBOL", "TYPE", "COORDS", "WAYPOINTS", "FACTIONS"];
const WAYPOINT_HEADER = ["SYMBOL", "TYPE", "COORDS", "TRAITS"];

function printSystem(s: System): void {
    const coords = `(${s.x}, ${s.y})`;
    const factions = s.factions.map((f) => f.symbol).join(", ") || "-";
    console.log(row([s.symbol, s.type, coords, String(s.waypoints.length), factions], SYSTEM_COLS));
}

function printWaypoint(w: Waypoint): void {
    const coords = `(${w.x}, ${w.y})`;
    const traits = w.traits.map((t) => t.symbol).join(", ") || "-";
    console.log(row([w.symbol, w.type, coords, traits], WAYPOINT_COLS));
}

export const systemCommands = {
    async systems() {
        const list = await systems.listSystems();
        header(SYSTEM_HEADER, SYSTEM_COLS);
        for (const s of list) {
            printSystem(s);
        }
    },
    async system([system]: string[]) {
        const s = await systems.getSystem(system);
        header(SYSTEM_HEADER, SYSTEM_COLS);
        printSystem(s);
    },
    async waypoints([system, trait]: string[]) {
        const list = await systems.listWaypoints(system, trait as WaypointTraitSymbol | undefined);
        if (list.length === 0) return console.log("No waypoints found");
        header(WAYPOINT_HEADER, WAYPOINT_COLS);
        for (const w of list) printWaypoint(w);
    },
    async waypoint([symbol]: string[]) {
        const w = await systems.getWaypoint(symbol);
        header(WAYPOINT_HEADER, WAYPOINT_COLS);
        printWaypoint(w);
        if (w.orbitals.length) console.log(`  Orbitals: ${w.orbitals.map((o) => o.symbol).join(", ")}`);
        if (w.orbits) console.log(`  Orbits: ${w.orbits}`);
        if (w.faction) console.log(`  Faction: ${w.faction.symbol}`);
    }
}
