import { runMarketTour, runMiningLoop, runSurveyLoop, type AutoStats } from "../core/automation.ts";
import type { MiningMethod } from "../core/mining.ts";
import type { TradeSymbol } from "../core/types.ts";
import { formatDuration } from "../utils.ts";
import { countdown } from "./countdown.ts";

function printStats(s: AutoStats): void {
    console.log(`  Session: ${s.trips} trips, sold ${s.sold}, fuel -${s.fuel}, profit ${s.profit}`);
    console.log(`  Rate:    ~${s.creditsPerHour.toLocaleString()} credits/hour`);
    console.log(`  Credits: ${s.credits.toLocaleString()} (started at ${s.startCredits.toLocaleString()})`);
}

// Shared by auto and autoSiphon: runs the mining loop and prints what happens
async function runAuto(method: MiningMethod, [ship, mineAt, sellAt, ...keep]: string[], usage: string) {
    if (!ship || !mineAt || !sellAt) return console.log(usage);

    const verb = method === "siphon" ? "Siphoned" : "Extracted";

    let stopping = false;
    process.once("SIGINT", () => {
        console.log("\nStopping after this step... (Ctrl+C again to force quit)");
        stopping = true;
    });

    await runMiningLoop(ship, mineAt, sellAt, {
        method,
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
                    if (m.type === "extracted") console.log(`  ${verb} ${m.units} ${m.symbol}${tag(m.surveyed)}`);
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
}

export const automationCommands = {
    async auto(args: string[]) {
        await runAuto("extract", args, "Usage: st auto <ship> <asteroid> <sellWaypoint> [goods to keep...]");
    },

    async autoSiphon(args: string[]) {
        await runAuto("siphon", args, "Usage: st autoSiphon <ship> <gasGiant> <sellWaypoint> [gases to keep...]");
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

    async scoutMarkets(args: string[]) {
        const once = args.includes("--once");
        const [ship] = args.filter((a) => a !== "--once");
        if (!ship) return console.log("Usage: st scoutMarkets <ship> [--once]");

        let stopping = false;
        process.once("SIGINT", () => {
            console.log("\nStopping after this stop... (Ctrl+C again to force quit)");
            stopping = true;
        });

        await runMarketTour(ship, {
            once,
            wait: countdown,
            shouldStop: () => stopping,
            onEvent: (e) => {
                switch (e.type) {
                    case "start":
                        console.log(`Touring ${e.stops.length} markets in ${e.system}: ${e.stops.map((s) => s.split("-").pop()).join(" → ")}`);
                        break;
                    case "departing":
                        console.log(`Flying to ${e.destination}, ${formatDuration(e.seconds)}`);
                        break;
                    case "scanned":
                        console.log(`  [${e.stop}/${e.of}] ${e.waypoint}: ${e.goods} prices saved`);
                        break;
                    case "scan-failed":
                        console.log(`  ${e.waypoint}: scan failed (${e.message})`);
                        break;
                    case "lap-done":
                        console.log(`\n=== Lap ${e.lap} done ===\n`);
                        break;
                    case "stopped":
                        console.log(`\nStopped after ${e.scanned} scans`);
                        break;
                }
            },
        });
    },
};