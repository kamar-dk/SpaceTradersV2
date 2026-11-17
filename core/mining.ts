import { api, ApiError } from "./api.ts";
import type { Cooldown, Extraction, ShipCargo, Siphon, Survey, TradeSymbol } from "./types.ts";
import { sleep } from "../utils.ts";
import { getCargo, jettison } from "./cargo.ts";
import { getCooldown, getShip } from "./ships.ts";
import { listSurveys, removeSurvey } from "./surveyStore.ts";
import { bestSurvey, scoreSurvey } from "./surveying.ts";

type ExtractResult = { extraction: Extraction; cooldown: Cooldown; cargo: ShipCargo };
type SiphonResult = { siphon: Siphon; cooldown: Cooldown; cargo: ShipCargo };

export function extract(ship: string) {
    return api<ExtractResult>(`/my/ships/${ship}/extract`, { method: "POST" });
}

export async function extractWithSurvey(ship: string, survey: Survey) {
    try {
        return await api<ExtractResult>(`/my/ships/${ship}/extract/survey`, { method: "POST", body: survey });
    } catch (e) {
        // A 4xx from this endpoint usually means the survey is no longer usable.
        // 409 is the cooldown error, which says nothing about the survey.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409) {
            removeSurvey(survey.signature);
        }
        throw e;
    }
}

export function siphon(ship: string) {
    return api<SiphonResult>(`/my/ships/${ship}/siphon`, { method: "POST" });
}

// --- Mining until full ---

export type MiningMethod = "extract" | "siphon";

export type MiningEvent =
    | { type: "extracted"; symbol: TradeSymbol; units: number; cargo: ShipCargo; surveyed: boolean }
    | { type: "jettisoned"; symbol: TradeSymbol; units: number; cargo: ShipCargo; surveyed: boolean }
    | { type: "full"; cargo: ShipCargo };

export type MiningOptions = {
    method?: MiningMethod;                                 // "extract" (asteroids, default) or "siphon" (gas giants)
    keep?: TradeSymbol[];                                  // empty = keep everything
    onEvent?: (e: MiningEvent) => void;
    wait?: (seconds: number, label: string) => Promise<void>;
    shouldStop?: () => boolean;
    minSurveyScore?: number;                               // default 0.3 (extract only)
};

// One round of work, whichever method: what came out, the cargo after, and the new cooldown
type Collected = {
    symbol: TradeSymbol;
    units: number;
    cargo: ShipCargo;
    cooldown: Cooldown;
    surveyed: boolean;
};

// Extracts or siphons until the hold is full or shouldStop() says to stop.
// Returns the cargo when full, or null if stopped early.
// When extracting with a keep list, it uses the best saved survey for this asteroid if one scores high enough.
// Siphoning never uses surveys: gas giants can't be surveyed.
export async function mineUntilFull(ship: string, options: MiningOptions = {}): Promise<ShipCargo | null> {
    const {
        method = "extract", keep = [], onEvent = () => { },
        wait = sleep, shouldStop = () => false, minSurveyScore = 0.3,
    } = options;

    // Already full? Nothing to do.
    const start = await getCargo(ship);
    if (start.units >= start.capacity) {
        onEvent({ type: "full", cargo: start });
        return start;
    }

    // Surveys belong to one asteroid, so find out which one we're at (once: the ship doesn't move while mining)
    const waypoint = (await getShip(ship)).nav.waypointSymbol;

    // The best saved survey, if extracting with a keep list and one scores high enough
    const pickSurvey = (): Survey | undefined => {
        if (method !== "extract" || keep.length === 0) return undefined;
        const best = bestSurvey(listSurveys(waypoint), keep);
        return best && scoreSurvey(best, keep) >= minSurveyScore ? best : undefined;
    };

    // Do one round of work with the chosen method, and return the result in one common shape
    const collect = async (): Promise<Collected> => {
        if (method === "siphon") {
            const data = await siphon(ship);
            return { ...data.siphon.yield, cargo: data.cargo, cooldown: data.cooldown, surveyed: false };
        }

        const target = pickSurvey();
        if (target) {
            try {
                const data = await extractWithSurvey(ship, target);
                return { ...data.extraction.yield, cargo: data.cargo, cooldown: data.cooldown, surveyed: true };
            } catch (e) {
                if (e instanceof ApiError && e.status === 409) throw e;
                // The survey didn't work; fall through to a plain extract below
            }
        }

        const data = await extract(ship);
        return { ...data.extraction.yield, cargo: data.cargo, cooldown: data.cooldown, surveyed: false };
    };

    const cd = await getCooldown(ship);
    if (cd?.remainingSeconds) await wait(cd.remainingSeconds, "On cooldown");

    while (!shouldStop()) {
        const result = await collect();
        const { symbol, units, surveyed } = result;
        let cargo = result.cargo;

        if (keep.length && !keep.includes(symbol)) {
            const jettisoned = await jettison(ship, symbol, units);
            if (jettisoned) cargo = jettisoned.cargo;
            onEvent({ type: "jettisoned", symbol, units, cargo, surveyed });
        } else {
            onEvent({ type: "extracted", symbol, units, cargo, surveyed });
        }

        if (cargo.units >= cargo.capacity) {
            onEvent({ type: "full", cargo });
            return cargo;
        }

        await wait(result.cooldown.remainingSeconds, `Cargo ${cargo.units}/${cargo.capacity}, cooldown`);
    }
    return null;
}