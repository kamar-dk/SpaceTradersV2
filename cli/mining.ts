import * as mining from "../core/mining.ts";
import { findSurvey } from "../core/surveyStore.ts";
import type { TradeSymbol } from "../core/types.ts";
import { countdown } from "./countdown.ts";

export const miningCommands = {
    async extract([ship, signature]: string[]) {
        if (!ship) return console.log("Usage: st extract <ship> [surveySignature]");
        let result;
        if (signature) {
            const s = findSurvey(signature);
            if (!s) return console.log(`No saved survey ${signature}`);
            result = await mining.extractWithSurvey(ship, s);
        } else {
            result = await mining.extract(ship);
        }

        const { extraction, cargo, cooldown } = result;
        console.log(`Extracted ${extraction.yield.units} ${extraction.yield.symbol}${signature ? " (surveyed)" : ""}`);
        console.log(`Cargo: ${cargo.units}/${cargo.capacity}`);
        console.log(`Cooldown: ${cooldown.remainingSeconds}s`);
    },

    async mine([ship, ...keep]: string[]) {
        if (!ship) return console.log("Usage: st mine <ship> [goods to keep...]");
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
                if (e.type === "extracted") console.log(`Extracted ${e.units} ${e.symbol}${e.surveyed ? " (surveyed)" : ""}`);
                if (e.type === "jettisoned") console.log(`Jettisoned ${e.units} ${e.symbol}${e.surveyed ? " (surveyed)" : ""}`);
                if (e.type === "full") {
                    console.log("Cargo full, stopping.");
                    for (const item of e.cargo.inventory) console.log(`  ${item.units}x ${item.symbol}`);
                }
            },
        });
    },
};