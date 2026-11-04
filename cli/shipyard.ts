import * as shipyard from "../core/shipyard.ts";
import type { ShipType } from "../core/types.ts";
import { header, row } from "./table.ts";

const SHIP_COLS = [24, -10, 10, -6, -5];

export const shipyardCommands = {
    async shipyards([system, shipType]: string[]) {
        if (!system) return console.log("Usage: st shipyards <system> [shipType]");
        const wanted = shipType?.toUpperCase();

        const yards = await shipyard.listShipyards(system);
        let shown = 0;

        for (const yard of yards) {
            const types = yard.shipTypes.map((t) => t.type);
            if (wanted && !types.includes(wanted as ShipType)) continue;
            shown++

            console.log(`\n${yard.symbol}`);
            if(yard.ships) {
                // Live prices
                for (const s of yard.ships) {
                    if (wanted && s.type !== wanted) continue;
                    console.log(`  ${s.type.padEnd(26)} ${s.purchasePrice.toLocaleString().padStart(10)}  ${s.supply}`);
                }   
            } else {
                for (const t of types) {
                    if (wanted && t !== wanted) continue;
                    console.log(`  ${t}`);
                }
                console.log("  (send a ship here to see prices)");
            } 
        }
        if (shown === 0) {
            console.log(wanted ? `No shipyard in ${system} sells ${wanted}` : `No shipyards in ${system}`);
        }
    },
    async shipyard([waypoint]: string[]) {
        const yard = await shipyard.getShipyard(waypoint);

        if (yard.ships) {
            header(["TYPE", "PRICE", "SUPPLY", "CARGO", "FUEL"], SHIP_COLS);
            for (const s of yard.ships) {
                const cargo = s.modules
                    .reduce((sum, m) => sum + (m.capacity ?? 0), 0);
                console.log(row(
                    [s.type, s.purchasePrice.toLocaleString(), s.supply, String(cargo), String(s.frame.fuelCapacity)],
                    SHIP_COLS,
                ));
            }
        } else {
            console.log(`Sells: ${yard.shipTypes.map((t) => t.type).join(", ")}`);
            console.log("(Send a ship here to see prices)");
        }
    },
    async buyShip([shipType, waypoint]: string[]) {
        const { ship, transaction, agent } = await shipyard.buyShip(shipType as ShipType, waypoint);

        const number = ship.symbol.split("-").pop();
        console.log(`Bought ${ship.registration.role} ${ship.symbol} (S${number}) for ${transaction.price.toLocaleString()} credits`);
        console.log(`  At ${ship.nav.waypointSymbol}, ${ship.nav.status}`);
        console.log(`  Cargo ${ship.cargo.capacity}, fuel ${ship.fuel.capacity}`);
        console.log(`Credits left: ${agent.credits.toLocaleString()}`);
    },
}