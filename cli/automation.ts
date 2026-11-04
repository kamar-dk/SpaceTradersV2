import { runMiningLoop, runSurveyLoop, type AutoStats } from "../core/automation.ts";
import type { TradeSymbol } from "../core/types.ts";
import { formatDuration } from "../utils.ts";
import { countdown } from "./countdown.ts";

function printStats(s: AutoStats): void {
    console.log(`  Session: ${s.trips} trips, sold ${s.sold}, fuel -${s.fuel}, profit ${s.profit}`);
    console.log(`  Rate:    ~${s.creditsPerHour.toLocaleString()} credits/hour`);
    console.log(`  Credits: ${s.credits.toLocaleString()} (started at ${s.startCredits.toLocaleString()})`);
}

export const automationCommands = {
    async auto([ship, mineAt, sellAt, ...keep]: string[]) {
        if (!ship || !mineAt || !sellAt) {
            return console.log("Usage: st auto <ship> <mineWaypoint> <sellWaypoint> [goods to keep...]");
        }

        let stopping = false;
        process.once("SIGINT", () => {
            console.log("\nStopping after this step... (Ctrl+C again to force quit)");
            stopping = true;
        });

        await runMiningLoop(ship, mineAt, sellAt, {
            keep: keep.map((g) => g.toUpperCase()) as TradeSymbol[],
            wait: countdown,
            shouldStop: () => stopping,
            onEvent: (e) => {
                switch (e.type) {
                    case "start":
                        console.log(`Keeping: ${e.keep.join(", ")}`);
                        break;
                    case "trip":
                        console.log(`\n=== Trip ${e.trip} ===`);
                        break;
                    case "departing":
                        console.log(`Flying to ${e.destination}, ${formatDuration(e.seconds)} (fuel ${e.fuel.current}/${e.fuel.capacity})`);
                        break;
                    case "mining": {
                        const m = e.event;
                        const tag = (surveyed: boolean) => (surveyed ? " (surveyed)" : "");
                        if (m.type === "extracted") console.log(`  Extracted ${m.units} ${m.symbol}${tag(m.surveyed)}`);
                        if (m.type === "jettisoned") console.log(`  Jettisoned ${m.units} ${m.symbol}${tag(m.surveyed)}`);
                        if (m.type === "full") console.log("  Cargo full");
                        break;
                    }
                    case "sold":
                        for (const t of e.transactions) console.log(`  Sold ${t.units} ${t.tradeSymbol} for ${t.totalPrice}`);
                        break;
                    case "sale-failed":
                        console.log(`  Nothing sold (attempt ${e.attempt} of 3), retrying in ${e.retryIn}s`);
                        break;
                    case "refuel-failed":
                        console.log(`  Could not refuel: ${e.message}`);
                        break;
                    case "trip-done":
                        console.log(`  Trip: sold ${e.sold}, fuel -${e.fuel}, net ${e.sold - e.fuel}`);
                        printStats(e.stats);
                        break;
                    case "stopped":
                        console.log("\n=== Stopped ===");
                        printStats(e.stats);
                        break;
                }
            },
        });
    },

    async autoSurvey([ship, waypoint, ...goods]: string[]) {
        if (!ship || !waypoint || goods.length === 0) {
            return console.log("Usage: st autoSurvey <ship> <asteroid> <goods to keep...>  (the same goods as your miners)");
        }

        let stopping = false;
        process.once("SIGINT", () => {
            console.log("\nStopping after this step... (Ctrl+C again to force quit)");
            stopping = true;
        });

        await runSurveyLoop(ship, waypoint, {
            keep: goods.map((g) => g.toUpperCase()) as TradeSymbol[],
            wait: countdown,
            shouldStop: () => stopping,
            onEvent: (e) => {
                switch (e.type) {
                    case "start":
                        console.log(`Surveying at ${e.waypoint}, scoring by ${goods.join(", ")}`);
                        break;
                    case "departing":
                        console.log(`Flying to ${e.destination}, ${formatDuration(e.seconds)} (fuel ${e.fuel.current}/${e.fuel.capacity})`);
                        break;
                    case "surveyed":
                        console.log(`Surveyed: ${e.count} new, best score ${e.best.toFixed(2)}, ${e.good} good saved`);
                        break;
                    case "idle":
                        console.log(`${e.good} good surveys saved, pausing ${e.seconds}s`);
                        break;
                    case "stopped":
                        console.log(`\n=== Stopped after ${e.total} surveys ===`);
                        break;
                }
            },
        });
    },
};
