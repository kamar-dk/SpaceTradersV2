import * as mining from "../core/mining.ts";
import type { TradeSymbol } from "../core/types.ts";
import { countdown } from "./countdown.ts";

export const miningCommands = {
    async extract([ship]: string[]) {
        const { extraction, cargo, cooldown } = await mining.extract(ship);
        console.log(`Extracted ${extraction.yield.units} ${extraction.yield.symbol}`);
        console.log(`Cargo: ${cargo.units}/${cargo.capacity}`);
        console.log(`Cooldown: ${cooldown.remainingSeconds}s`);
    },

    async mine([ship, ...keep]: string[]) {
        let stopping = false;
        process.once("SIGINT", () => {
            console.log("\nStopping after this step... (Ctrl+C again to force quit)");
            stopping = true;
        });

        await mining.mineUntilFull(ship, {
            keep: keep as TradeSymbol[],
            wait: countdown,
            shouldStop: () => stopping,
            onEvent: (e) => {
                if (e.type === "extracted") console.log(`Extracted ${e.units} ${e.symbol}`);
                if (e.type === "jettisoned") console.log(`Jettisoned ${e.units} ${e.symbol}`);
                if (e.type === "full") {
                    console.log("Cargo full, stopping.");
                    for (const item of e.cargo.inventory) console.log(`  ${item.units}x ${item.symbol}`);
                }
            },
        });
    },
};