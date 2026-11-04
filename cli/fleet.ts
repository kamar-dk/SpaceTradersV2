import { styleText } from "node:util";
import { runFleet } from "../core/fleet.ts";
import type { AutoEvent } from "../core/automation.ts";
import type { TradeSymbol } from "../core/types.ts";

// A different colour per ship, so lines are easy to tell apart
const COLORS = ["cyan", "yellow", "magenta", "green", "blue", "red"] as const;
type Color = (typeof COLORS)[number];

// "SP0ILEDDADDY-3" → "S3", the same shortcut you type
const shortName = (ship: string) => `S${ship.split("-").pop()}`;

// Turns one ship's event into a line of text, or null to print nothing.
// Without -v, only the important events are shown.
function describe(e: AutoEvent, verbose: boolean): string | null {
    switch (e.type) {
        case "start":
            return `keeping ${e.keep.join(", ")}`;
        case "trip":
            return verbose ? `--- trip ${e.trip} ---` : null;
        case "departing":
            return verbose ? `flying to ${e.destination} (fuel ${e.fuel.current}/${e.fuel.capacity})` : null;
        case "mining": {
            if (!verbose) return null;
            const m = e.event;
            const tag = (surveyed: boolean) => (surveyed ? " (surveyed)" : "");
            if (m.type === "extracted") return `extracted ${m.units} ${m.symbol}${tag(m.surveyed)}`;
            if (m.type === "jettisoned") return `jettisoned ${m.units} ${m.symbol}${tag(m.surveyed)}`;
            return "cargo full";
        }
        case "sold": {
            const total = e.transactions.reduce((sum, t) => sum + t.totalPrice, 0);
            return `sold ${e.transactions.length} goods for ${total}`;
        }
        case "sale-failed":
            return `nothing sold (attempt ${e.attempt} of 3), retrying in ${e.retryIn}s`;
        case "refuel-failed":
            return verbose ? `could not refuel: ${e.message}` : null;
        case "trip-done":
            return `trip ${e.stats.trips} done: net ${e.sold - e.fuel}, ~${e.stats.creditsPerHour}/h, credits ${e.stats.credits}`;
        case "stopped":
            return `stopped after ${e.stats.trips} trips, profit ${e.stats.profit}`;
    }
}

type FleetArgs = {
    mineAt?: string;
    sellAt?: string;
    ships: string[];
    keep: TradeSymbol[];
    verbose: boolean;
    error?: string;
};

// Splits the arguments into waypoints, ships and flags.
// Flags (-v, --keep A,B) can appear anywhere.
function parseArgs(args: string[]): FleetArgs {
    const positional: string[] = [];
    let keep: TradeSymbol[] = [];
    let verbose = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === "-v") {
            verbose = true;
        } else if (arg === "--keep") {
            const list = args[++i];
            if (!list) return { ships: [], keep: [], verbose, error: "--keep needs a list, e.g. --keep COPPER_ORE,IRON_ORE" };
            keep = list.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean) as TradeSymbol[];
        } else {
            positional.push(arg);
        }
    }

    const [mineAt, sellAt, ...ships] = positional;
    return { mineAt, sellAt, ships, keep, verbose };
}

export const fleetCommands = {
    async fleet(args: string[]) {
        const { mineAt, sellAt, ships, keep, verbose, error } = parseArgs(args);
        if (error) return console.log(error);
        if (!mineAt || !sellAt) {
            return console.log("Usage: st fleet <mineWaypoint> <sellWaypoint> [ships...] [--keep A,B] [-v]");
        }

        let stopping = false;
        process.once("SIGINT", () => {
            console.log("\nStopping all ships after their current step... (Ctrl+C again to force quit)");
            stopping = true;
        });

        const colorOf = new Map<string, Color>();
        const tag = (ship: string) => styleText(colorOf.get(ship) ?? "white", `[${shortName(ship)}]`);

        await runFleet(mineAt, sellAt, {
            ships,
            keep,
            shouldStop: () => stopping,
            onEvent: (e) => {
                switch (e.type) {
                    case "ships":
                        e.ships.forEach((s, i) => colorOf.set(s, COLORS[i % COLORS.length]!));
                        console.log(`Running ${e.ships.length} ships: ${e.ships.map(shortName).join(", ") || "none"}`);
                        if (e.skipped.length) {
                            console.log(styleText("yellow", `Skipped (no mining laser): ${e.skipped.map(shortName).join(", ")}`));
                        }
                        break;
                    case "ship": {
                        const text = describe(e.event, verbose);
                        if (text) console.log(`${tag(e.ship)} ${text}`);
                        break;
                    }
                    case "error":
                        console.log(`${tag(e.ship)} ${styleText("red", `ERROR: ${e.message}`)}`);
                        break;
                    case "done":
                        console.log("All ships stopped.");
                        break;
                }
            },
        });
    },
};
