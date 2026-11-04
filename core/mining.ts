import { api, ApiError } from "./api.ts";
import type { Cooldown, Extraction, ShipCargo, Survey, TradeSymbol,  } from "./types.ts";
import { sleep } from "../utils.ts";
import { getCargo, jettison } from "./cargo.ts";
import { getShip } from "./ships.ts";
import { listSurveys, removeSurvey } from "./surveyStore.ts";
import { bestSurvey, scoreSurvey } from "./surveying.ts";

type ExtractResult = { extraction: Extraction; cooldown: Cooldown; cargo: ShipCargo };

export function extract(ship: string) {
    return api<ExtractResult>(`/my/ships/${ship}/extract`, { method: "POST" });
}

export async function extractWithSurvey(ship: string, survey: Survey) {
    try {
        return await api<ExtractResult>(`/my/ships/${ship}/extract/survey`, {method: "POST", body: survey});
    } catch (e) {
        // A 4xx from this endpoint usually means the survey is no longer usable.
        // 409 is the cooldown error, which says nothing about the survey.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409) {
            removeSurvey(survey.signature);
        }
        throw e;
    }
}

// Returns undefined when the ship has no cooldown (the API answers 204)
export function getCooldown(ship: string): Promise<Cooldown | undefined> {
    return api<Cooldown | undefined>(`/my/ships/${ship}/cooldown`);
}

export type MiningEvent =
    | { type: "extracted"; symbol: TradeSymbol; units: number; cargo: ShipCargo; surveyed: boolean }
    | { type: "jettisoned"; symbol: TradeSymbol; units: number; cargo: ShipCargo; surveyed: boolean }
    | { type: "full"; cargo: ShipCargo };

export type MiningOptions = {
    keep?: TradeSymbol[];                                  // empty = keep everything
    onEvent?: (e: MiningEvent) => void;
    wait?: (seconds: number, label: string) => Promise<void>;
    shouldStop?: () => boolean;
    minSurveyScore?: number;                               // default 0.5
};

// Extracts until the hold is full or shouldStop() says to stop.
// Returns the cargo when full, or null if stopped early.
// With a keep list, it uses the best saved survey for this asteroid when one scores high enough.
export async function mineUntilFull(ship: string, options: MiningOptions = {}): Promise<ShipCargo | null> { 
    const { keep = [], onEvent = () => {}, wait = sleep, shouldStop = () => false, minSurveyScore = 0.5 } = options;

    // Already full? Nothing to do.
    const start = await getCargo(ship);
    if (start.units >= start.capacity) {
        onEvent({ type: "full", cargo: start });
        return start;
    }

    // Surveys belong to one asteroid, so find out which one we're at (once: the ship doesn't move while mining)
    const waypoint = (await getShip(ship)).nav.waypointSymbol;

    // The best saved survey, if there's a keep list to score by and it scores high enough
    const pickSurvey = (): Survey | undefined => {
        if (keep.length === 0) return undefined;
        const best = bestSurvey(listSurveys(waypoint), keep);
        return best && scoreSurvey(best, keep) >= minSurveyScore ? best : undefined;
    };

    const cd = await getCooldown(ship);
    if (cd?.remainingSeconds) await wait(cd.remainingSeconds, "On cooldown");

    while (!shouldStop()) {
        const target = pickSurvey();
        let data: ExtractResult;
        let surveyed = false;

        if (target) {
            try {
                data = await extractWithSurvey(ship, target);
                surveyed = true;
            } catch (e) {
                if (e instanceof ApiError && e.status === 409) throw e;
                data = await extract(ship);
            }
        } else {
            data = await extract(ship);
        }
        
        const { symbol, units } = data.extraction.yield;
        let cargo = data.cargo;

        if (keep.length && !keep.includes(symbol)) {
            const result = await jettison(ship, symbol, units);
            if (result) cargo = result.cargo;
            onEvent({ type: "jettisoned", symbol, units, cargo, surveyed});
        } else {
            onEvent({ type: "extracted", symbol, units, cargo, surveyed});
        }

        if (cargo.units >= cargo.capacity) {
            onEvent({ type: "full", cargo });
            return cargo;
        }

        await wait(data.cooldown.remainingSeconds, `Cargo ${cargo.units}/${cargo.capacity}, cooldown`);
    }
    return null;
}

