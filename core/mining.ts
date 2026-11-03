import { api } from "./api.ts";
import type { Cooldown, Extraction, ShipCargo, TradeSymbol } from "./types.ts";
import { sleep } from "../utils.ts";
import { getCargo, jettison } from "./cargo.ts";


export function extract(ship: string) {
    return api<{ extraction: Extraction; cooldown: Cooldown;  cargo: ShipCargo}>(
        `/my/ships/${ship}/extract`,
        { method: "POST" },
    );
}

// Returns undefined when the ship has no cooldown (the API answers 204)
export function getCooldown(ship: string): Promise<Cooldown | undefined> {
    return api<Cooldown | undefined>(`/my/ships/${ship}/cooldown`);
}

export type MiningEvent =
    | { type: "extracted"; symbol: TradeSymbol; units: number; cargo: ShipCargo }
    | { type: "jettisoned"; symbol: TradeSymbol; units: number; cargo: ShipCargo }
    | { type: "full"; cargo: ShipCargo };

export type MiningOptions = {
    keep?: TradeSymbol[];                                  // empty = keep everything
    onEvent?: (e: MiningEvent) => void;
    wait?: (seconds: number, label: string) => Promise<void>;
    shouldStop?: () => boolean;
};

// Extracts until the hold is full or shouldStop() says to stop.
// Returns the cargo when full, or null if stopped early.
export async function mineUntilFull(ship: string, options: MiningOptions = {}): Promise<ShipCargo | null> { 
    const { keep = [], onEvent = () => {}, wait = sleep, shouldStop = () => false } = options;

    // Already full? Nothing to do.
    const start = await getCargo(ship);
    if (start.units >= start.capacity) {
        onEvent({ type: "full", cargo: start });
        return start;
    }

    const cd = await getCooldown(ship);
    if (cd?.remainingSeconds) await wait(cd.remainingSeconds, "On cooldown");

    while (!shouldStop()) {
        const data = await extract(ship);
        const { symbol, units } = data.extraction.yield;
        let cargo = data.cargo;

        if (keep.length && !keep.includes(symbol)) {
            const result = await jettison(ship, symbol, units);
            if (result) cargo = result.cargo;
            onEvent({ type: "jettisoned", symbol, units, cargo });
        } else {
            onEvent({ type: "extracted", symbol, units, cargo });
        }

        if (cargo.units >= cargo.capacity) {
            onEvent({ type: "full", cargo });
            return cargo;
        }

        await wait(data.cooldown.remainingSeconds, `Cargo ${cargo.units}/${cargo.capacity}, cooldown`);
    }
    return null;
}

