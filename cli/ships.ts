import * as ships from "../core/ships.ts"
import { formatDuration, secondsUntil } from "../utils.ts"
import { nextArrival } from "../core/navigation.ts";
import { countdown } from "./countdown.ts";

export const shipCommands = {
    async ships([mode]: string[]) {
        const list = await ships.listShips();

        for (const s of list) {
            const eta = s.nav.status === "IN_TRANSIT"
                ? `  → ${s.nav.route.destination.symbol}  ETA ${formatDuration(secondsUntil(s.nav.route.arrival))}`
                : "";
            console.log(`${s.symbol}  ${s.nav.status}  @ ${s.nav.waypointSymbol}  fuel ${s.fuel.current}/${s.fuel.capacity}  cargo ${s.cargo.units}/${s.cargo.capacity}${eta}`);
        }

        if (mode === "wait") {
            const next = nextArrival(list);
            if (next) {
                await countdown(secondsUntil(next.nav.route.arrival), `${next.symbol} arriving in`);
                console.log(`${next.symbol} has arrived at ${next.nav.route.destination.symbol}`);
            }
        }
    },
    async ship([symbol, mode]: string[]) {
        if (!symbol) return console.log("Usage: st ship <ship> [raw]");

        const s = await ships.getShip(symbol)

        // `st ship S1 raw` dumps the full JSON instead
        if (mode === "raw") return console.dir(s, { depth: null });

        const pct = (n: number) => `${Math.round(n * 100)}%`;
        const health = (p: { condition: number; integrity: number }) =>
            `condition ${pct(p.condition)}, integrity ${pct(p.integrity)}`;
        const section = (title: string) => console.log(`\n${title}`);

        // Print overview
        console.log(`${s.symbol}  ${s.registration.role}  (${s.registration.factionSymbol})`);

        section("Fuel & cargo");
        console.log(`  Fuel:     ${s.fuel.current}/${s.fuel.capacity}`);
        console.log(`  Cargo:    ${s.cargo.units}/${s.cargo.capacity}`);
        for (const item of s.cargo.inventory) console.log(`            ${item.units}x ${item.symbol}`);

        section("Cooldown");
        console.log(s.cooldown.remainingSeconds > 0
            ? `  ${formatDuration(s.cooldown.remainingSeconds)} remaining`
            : "  Ready");

        section("Navigation");
        console.log(`  Status:   ${s.nav.status}, flight mode ${s.nav.flightMode}`);
        console.log(`  Location: ${s.nav.waypointSymbol} (system ${s.nav.systemSymbol})`);
        if (s.nav.status === "IN_TRANSIT") {
            const r = s.nav.route;
            console.log(`  Route:    ${r.origin.symbol} → ${r.destination.symbol}, ETA ${formatDuration(secondsUntil(r.arrival))}`);
        }

        section("Crew");
        console.log(`  ${s.crew.current}/${s.crew.capacity} (needs ${s.crew.required}), morale ${s.crew.morale}, wages ${s.crew.wages}, rotation ${s.crew.rotation}`);

        section("Frame");
        console.log(`  ${s.frame.name}: ${s.frame.moduleSlots} module slots, ${s.frame.mountingPoints} mounting points, fuel tank ${s.frame.fuelCapacity}`);
        console.log(`  ${health(s.frame)}`);

        section("Reactor");
        console.log(`  ${s.reactor.name}: ${s.reactor.powerOutput} power`);
        console.log(`  ${health(s.reactor)}`);

        section("Engine");
        console.log(`  ${s.engine.name}: speed ${s.engine.speed}`);
        console.log(`  ${health(s.engine)}`);

        section(`Modules (${s.modules.length})`);
        for (const m of s.modules) {
            const extra = [
                m.capacity !== undefined ? `capacity ${m.capacity}` : "",
                m.range !== undefined ? `range ${m.range}` : "",
            ].filter(Boolean).join(", ");
            console.log(`  ${m.name}${extra ? ` (${extra})` : ""}`);
        }

        section(`Mounts (${s.mounts.length})`);
        for (const m of s.mounts) {
            const strength = m.strength !== undefined ? ` (strength ${m.strength})` : "";
            console.log(`  ${m.name}${strength}`);
            if (m.deposits?.length) console.log(`    can find: ${m.deposits.join(", ")}`);
        }
    }
}