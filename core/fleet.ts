import { runMiningLoop, type AutoEvent } from "./automation.ts";
import { isMiner, listShips } from "./ships.ts";
import { sleep } from "../utils.ts";
import type { TradeSymbol } from "./types.ts";

const STAGGER_SECONDS = 2; // delay between ship starts, so they don't all hit the API at once

export type FleetEvent =
    | { type: "ships"; ships: string[]; skipped: string[] }  // which ships run, which were left out
    | { type: "ship"; ship: string; event: AutoEvent }       // something one ship did
    | { type: "error"; ship: string; message: string }       // one ship's loop crashed
    | { type: "done" };                                      // every loop has finished

export type FleetOptions = {
    ships?: string[];                      // empty = every ship that can mine
    keep?: TradeSymbol[];                  // passed to every ship's loop
    onEvent?: (e: FleetEvent) => void;
    shouldStop?: () => boolean;            // shared: one Ctrl+C stops every ship
};

// Runs runMiningLoop for several ships at once
export async function runFleet(mineAt: string, sellAt: string, options: FleetOptions = {}): Promise<void> {
    const { onEvent = () => {}, shouldStop = () => false, keep = [] } = options;

    // Which ships can mine?
    const miners = (await listShips()).filter(isMiner).map((s) => s.symbol);

    // Use the requested ships if given (only the ones that can mine), otherwise all miners
    const requested = options.ships ?? [];
    const ships = requested.length ? requested.filter((s) => miners.includes(s)) : miners;
    const skipped = requested.filter((s) => !miners.includes(s));
    onEvent({ type: "ships", ships, skipped });

    // One loop per ship, all running at the same time
    await Promise.all(
        ships.map(async (ship, i) => {
            await sleep(i * STAGGER_SECONDS);
            if (shouldStop()) return;

            // Each ship catches its own errors, so one crash doesn't stop the rest
            try {
                await runMiningLoop(ship, mineAt, sellAt, {
                    keep,
                    wait: sleep,
                    shouldStop,
                    onEvent: (event) => onEvent({ type: "ship", ship, event }),
                });
            } catch (e) {
                onEvent({ type: "error", ship, message: e instanceof Error ? e.message : String(e) });
            }
        }),
    );

    onEvent({ type: "done" });
}
