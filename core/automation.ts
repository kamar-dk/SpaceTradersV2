import { ensureDocked, ensureOrbit, flyTo, refuel } from "./navigation.ts";
import { mineUntilFull, type MiningEvent, type MiningMethod } from "./mining.ts";
import { getMarket, sellAll } from "./market.ts";
import { getCargo } from "./cargo.ts";
import { getAgent } from "./agent.ts";
import { canSurvey, getCooldown, getShip } from "./ships.ts";
import { scoreSurvey, survey } from "./surveying.ts";
import { listSurveys } from "./surveyStore.ts";
import { listWaypoints } from "./systems.ts";
import { sleep, systemOf } from "../utils.ts";
import type { MarketTransaction, ShipFuel, TradeSymbol, Waypoint } from "./types.ts";

const MAX_FAILED_SALES = 3;      // give up after this many empty sales in a row
const SALE_RETRY_SECONDS = 15;   // wait this long between attempts

// --- Types ---

export type AutoStats = {
    trips: number;           // trips completed
    sold: number;            // credits earned from sales
    fuel: number;            // credits spent on fuel
    profit: number;          // sold - fuel
    creditsPerHour: number;  // profit, scaled to an hour
    credits: number;         // agent's credits now
    startCredits: number;    // agent's credits when the loop started
};

export type AutoEvent =
    | { type: "start"; keep: TradeSymbol[] }
    | { type: "trip"; trip: number }
    | { type: "departing"; destination: string; fuel: ShipFuel; seconds: number }
    | { type: "mining"; event: MiningEvent }
    | { type: "sold"; transactions: MarketTransaction[] }
    | { type: "sale-failed"; attempt: number; retryIn: number }
    | { type: "refuel-failed"; message: string }
    | { type: "trip-done"; sold: number; fuel: number; stats: AutoStats }
    | { type: "stopped"; stats: AutoStats };

export type AutoOptions = {
    method?: MiningMethod;                                 // "extract" (asteroids, default) or "siphon" (gas giants)
    keep?: TradeSymbol[];                                  // empty = everything the sell market buys
    onEvent?: (e: AutoEvent) => void;
    wait?: (seconds: number, label: string) => Promise<void>;
    shouldStop?: () => boolean;
};

// --- Helpers ---

// Refuels if possible. Returns the cost, or 0 if it failed.
// Fails harmlessly at waypoints that don't sell fuel, so it reports instead of throwing.
async function tryRefuel(ship: string, onEvent: (e: AutoEvent) => void): Promise<number> {
    try {
        await ensureDocked(ship);
        const { transaction } = await refuel(ship);
        return transaction.totalPrice;
    } catch (e) {
        onEvent({ type: "refuel-failed", message: e instanceof Error ? e.message : String(e) });
        return 0;
    }
}

// --- The mining loop ---

// Mine (or siphon) at one waypoint, sell at another, repeat until shouldStop()
export async function runMiningLoop(ship: string, mineAt: string, sellAt: string, options: AutoOptions = {}): Promise<void> {
    const { method = "extract", onEvent = () => { }, wait = sleep, shouldStop = () => false } = options;

    // 1. Decide what to keep: only goods the sell market actually buys
    const market = await getMarket(sellAt);
    const sellable = [...market.imports, ...market.exchange].map((g) => g.symbol);
    if (sellable.length === 0) {
        throw new Error(`${sellAt} doesn't buy anything. Pick a different sell market.`);
    }

    const requested = options.keep ?? [];
    const unsellable = requested.filter((g) => !sellable.includes(g));
    if (unsellable.length) {
        throw new Error(`${sellAt} doesn't buy ${unsellable.join(", ")}. Remove them or pick another sell market.`);
    }

    const keep = requested.length ? requested : sellable;
    onEvent({ type: "start", keep });

    // Session bookkeeping
    const startTime = Date.now();
    const startCredits = (await getAgent()).credits;
    let trips = 0;
    let totalSold = 0;
    let totalFuel = 0;
    let failedSales = 0;

    // A snapshot of the session so far
    const stats = async (): Promise<AutoStats> => {
        const hours = Math.max((Date.now() - startTime) / 3_600_000, 1 / 60);
        const profit = totalSold - totalFuel;
        return {
            trips,
            sold: totalSold,
            fuel: totalFuel,
            profit,
            creditsPerHour: Math.round(profit / hours),
            credits: (await getAgent()).credits,
            startCredits,
        };
    };

    // Every flight reports its departure the same way
    const fly = (to: string) =>
        flyTo(ship, to, { wait, onDepart: (info) => onEvent({ type: "departing", ...info }) });

    for (let trip = 1; !shouldStop(); trip++) {
        onEvent({ type: "trip", trip });
        let fuel = 0; // this trip's fuel cost

        // 2. Mine, unless the hold is already full
        const before = await getCargo(ship);
        if (before.units < before.capacity) {
            await fly(mineAt);
            fuel += await tryRefuel(ship, onEvent);
            await ensureOrbit(ship);

            const cargo = await mineUntilFull(ship, {
                method,
                keep,
                wait,
                shouldStop,
                onEvent: (event) => onEvent({ type: "mining", event }),
            });
            if (!cargo) break; // stopped mid-mining
        }

        // 3. Sell
        await fly(sellAt);
        await ensureDocked(ship);
        const transactions = await sellAll(ship, sellAt);
        onEvent({ type: "sold", transactions });
        fuel += await tryRefuel(ship, onEvent);

        // 4. Add up this trip and report it
        const sold = transactions.reduce((sum, t) => sum + t.totalPrice, 0);
        totalSold += sold;
        totalFuel += fuel;
        trips++;
        onEvent({ type: "trip-done", sold, fuel, stats: await stats() });

        // 5. Nothing sold: wait before retrying instead of spinning, and give up after a few tries
        if (transactions.length === 0) {
            failedSales++;
            if (failedSales >= MAX_FAILED_SALES) {
                throw new Error(`Couldn't sell anything at ${sellAt} ${MAX_FAILED_SALES} times in a row`);
            }
            onEvent({ type: "sale-failed", attempt: failedSales, retryIn: SALE_RETRY_SECONDS });
            await wait(SALE_RETRY_SECONDS, "Retrying sale in");
        } else {
            failedSales = 0;
        }
    }

    onEvent({ type: "stopped", stats: await stats() });
}

// --- The survey loop ---

const SURVEY_IDLE_SECONDS = 60;  // how long to pause while enough good surveys are saved

export type SurveyEvent =
    | { type: "start"; waypoint: string }
    | { type: "departing"; destination: string; fuel: ShipFuel; seconds: number }
    | { type: "surveyed"; count: number; best: number; good: number }
    | { type: "idle"; good: number; seconds: number }
    | { type: "stopped"; total: number };

export type SurveyOptions = {
    keep?: TradeSymbol[];                                  // what the miners want; used to judge surveys
    minSurveyScore?: number;                               // default 0.3, same as the miners
    enoughGood?: number;                                   // pause while this many good surveys exist (default 5)
    onEvent?: (e: SurveyEvent) => void;
    wait?: (seconds: number, label: string) => Promise<void>;
    shouldStop?: () => boolean;
};

// Flies to an asteroid and keeps the survey store stocked until shouldStop()
export async function runSurveyLoop(ship: string, waypoint: string, options: SurveyOptions = {}): Promise<void> {
    const {
        keep = [], minSurveyScore = 0.3, enoughGood = 5,
        onEvent = () => { }, wait = sleep, shouldStop = () => false,
    } = options;

    // 1. Check the ship can survey at all, before flying anywhere
    if (!canSurvey(await getShip(ship))) {
        throw new Error(`${ship} has no surveyor mount`);
    }
    onEvent({ type: "start", waypoint });

    // 2. Get there and into orbit
    await flyTo(ship, waypoint, { wait, onDepart: (info) => onEvent({ type: "departing", ...info }) });
    await ensureOrbit(ship);

    // How many saved surveys for this asteroid are good enough for the miners?
    const goodCount = () =>
        listSurveys(waypoint).filter((s) => scoreSurvey(s, keep) >= minSurveyScore).length;

    let total = 0;
    while (!shouldStop()) {
        // 3. Enough good surveys already: pause instead of spending API requests on more
        const good = goodCount();
        if (good >= enoughGood) {
            onEvent({ type: "idle", good, seconds: SURVEY_IDLE_SECONDS });
            await wait(SURVEY_IDLE_SECONDS, "Enough surveys, checking again in");
            continue;
        }

        // 4. Wait out any cooldown, then survey
        const cd = await getCooldown(ship);
        if (cd?.remainingSeconds) await wait(cd.remainingSeconds, "Cooldown");
        if (shouldStop()) break;

        const { surveys, cooldown } = await survey(ship);
        total += surveys.length;
        const scores = surveys.map((s) => scoreSurvey(s, keep));
        onEvent({ type: "surveyed", count: surveys.length, best: Math.max(0, ...scores), good: goodCount() });

        await wait(cooldown.remainingSeconds, "Survey cooldown");
    }

    onEvent({ type: "stopped", total });
}

// --- The market tour ---

export type TourEvent =
    | { type: "start"; system: string; stops: string[] }
    | { type: "departing"; destination: string; fuel: ShipFuel; seconds: number }
    | { type: "scanned"; waypoint: string; goods: number; stop: number; of: number }
    | { type: "scan-failed"; waypoint: string; message: string }
    | { type: "lap-done"; lap: number }
    | { type: "stopped"; scanned: number };

export type TourOptions = {
    once?: boolean;                                   // stop after one round instead of repeating
    onEvent?: (e: TourEvent) => void;
    wait?: (seconds: number, label: string) => Promise<void>;
    shouldStop?: () => boolean;
};

// Orders waypoints into a short route: always go to the nearest one not visited yet
function planTour(from: { x: number; y: number }, waypoints: Waypoint[]): Waypoint[] {
    const left = [...waypoints];
    const route: Waypoint[] = [];
    let here = from;

    while (left.length > 0) {
        let nearest = 0;
        for (let i = 1; i < left.length; i++) {
            const d = Math.hypot(left[i].x - here.x, left[i].y - here.y);
            const best = Math.hypot(left[nearest].x - here.x, left[nearest].y - here.y);
            if (d < best) nearest = i;
        }
        const [next] = left.splice(nearest, 1);
        route.push(next);
        here = next;
    }
    return route;
}

// Flies a ship around every marketplace in its system, saving live prices at each stop
export async function runMarketTour(ship: string, options: TourOptions = {}): Promise<void> {
    const { once = false, onEvent = () => { }, wait = sleep, shouldStop = () => false } = options;

    const start = await getShip(ship);
    const system = systemOf(start.nav.waypointSymbol);
    const markets = await listWaypoints(system, "MARKETPLACE");
    if (markets.length === 0) throw new Error(`No marketplaces in ${system}`);

    // Start the route from wherever the ship is now
    const here = markets.find((w) => w.symbol === start.nav.waypointSymbol) ?? { x: 0, y: 0 };
    const route = planTour(here, markets);
    onEvent({ type: "start", system, stops: route.map((w) => w.symbol) });

    let scanned = 0;
    for (let lap = 1; !shouldStop(); lap++) {
        for (const [i, w] of route.entries()) {
            if (shouldStop()) break;

            await flyTo(ship, w.symbol, { wait, onDepart: (info) => onEvent({ type: "departing", ...info }) });

            try {
                const market = await getMarket(w.symbol);   // the ship is here, so this has live prices and saves them
                scanned++;
                onEvent({ type: "scanned", waypoint: w.symbol, goods: market.tradeGoods?.length ?? 0, stop: i + 1, of: route.length });
            } catch (e) {
                // One market failing shouldn't end the tour
                onEvent({ type: "scan-failed", waypoint: w.symbol, message: e instanceof Error ? e.message : String(e) });
            }
        }

        if (shouldStop()) break;
        onEvent({ type: "lap-done", lap });
        if (once) break;
    }

    onEvent({ type: "stopped", scanned });
}