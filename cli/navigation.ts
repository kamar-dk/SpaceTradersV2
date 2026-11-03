import * as navigation from "../core/navigation.ts";
import { formatDuration } from "../utils.ts";
import { countdown } from "./countdown.ts";
import type { FlightMode } from "../core/navigation.ts";
import { getWaypoint } from "../core/systems.ts";
import { getShip } from "../core/ships.ts";

export const navigationCommands = {
    async orbit([ship]: string[]) {
        await navigation.orbit(ship);
        console.log(`${ship} is in orbit`)
    },
    async dock([ship]: string[]) {
        await navigation.dock(ship);
        console.log(`${ship} docked`);
    },
    async navigate([ship, waypoint, mode]: string[]) {
        const { nav, fuel, secondsLeft } = await navigation.navigate(ship, waypoint);
        const dest = nav.route.destination.symbol;
        console.log(`${ship} → ${dest}, arriving in ${formatDuration(secondsLeft)}`);
        console.log(`Fuel: ${fuel.current}/${fuel.capacity} (used ${fuel.consumed?.amount ?? 0})`);

        if (mode === "wait") {
            await countdown(secondsLeft, "Arriving in");
            console.log(`${ship} has arrived at ${dest}`);
        }
    },
    async refuel([ship]: string[]) {
        const { fuel, transaction, agent } = await navigation.refuel(ship);
        console.log(`Refueled: ${fuel.current}/${fuel.capacity}`);
        console.log(`Cost: ${transaction.totalPrice} credits (${agent.credits} left)`);
    },
    async mode([ship, flightMode]: string[]) {
        const modes = ["CRUISE", "BURN", "DRIFT", "STEALTH"];
        const wanted = flightMode?.toUpperCase();
        if (!ship || !wanted || !modes.includes(wanted)) {
            return console.log(`Usage: st mode <ship> <${modes.join("|")}>`);
        }
        const nav = await navigation.setFlightMode(ship, wanted as FlightMode);
        console.log(`${ship} flight mode: ${nav.flightMode}`);
    },
    async route([ship, destination]: string[]) {
        const s = await getShip(ship);
        const [from, to] = await Promise.all([
            getWaypoint(s.nav.waypointSymbol),
            getWaypoint(destination),
        ]);

        const { distance, options } = navigation.estimateRoute(s, from, to);
        console.log(`${ship}: ${from.symbol} → ${to.symbol}, distance ${Math.round(distance)}`);
        console.log(`Fuel now: ${s.fuel.current}/${s.fuel.capacity}, engine speed ${s.engine.speed}`);

        for (const o of options) {
            const warning = o.possible ? "" : "  (not enough fuel)";
            console.log(`  ${o.mode.padEnd(7)} ${String(o.fuel).padStart(4)} fuel   ${formatDuration(o.seconds)}${warning}`);
        }
    }
}