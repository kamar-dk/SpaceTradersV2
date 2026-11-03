import { api } from "./api.ts";
import { systemOf, sleep } from "../utils.ts";
import { getCargo } from "./cargo.ts";
import { listWaypoints } from "./systems.ts";
import type { Market, TradeSymbol, Agent, ShipCargo, MarketTransaction } from "./types.ts";

type TradeResult = { agent: Agent; cargo: ShipCargo; transaction: MarketTransaction };

export function getMarket(waypoint: string): Promise<Market> {
    return api<Market>(`/systems/${systemOf(waypoint)}/waypoints/${waypoint}/market`);
}

// Fetches the market and waits for live prices, which can lag slightly behind a ship's arrival.
// Throws if they never show up.
export async function getLiveMarket(waypoint: string, attempts = 4): Promise<Market> {
    let market = await getMarket(waypoint);
    
    for (let attempt = 1; !market.tradeGoods && attempt < attempts; attempts++) {
        await sleep(3);
        market = await getMarket(waypoint);
    }
    if (!market.tradeGoods) {
        throw new Error(`No live prices at ${waypoint}. Is one of your ships there?`);
    }
    return market;
}

// Returns null if there's none of that item to sell
export async function sell(ship: string, symbol: TradeSymbol, units?: number): Promise<TradeResult | null> {
    if (units === undefined) {
        const cargo = await getCargo(ship);
        const item = cargo.inventory.find((i) => i.symbol === symbol);
        if (!item) return null;
        units = item.units;
    }
    return api<TradeResult>(`/my/ships/${ship}/sell`, { method: "POST", body: { symbol, units } });
}

// Returns null if the hold is full. Defaults to filling the free space.
export async function buy(ship: string, symbol: TradeSymbol, units?: number): Promise<TradeResult | null> {
    if (units === undefined) {
        const cargo = await getCargo(ship);
        units = cargo.capacity - cargo.units;
        if (units <= 0) return null;
    }
    return api<TradeResult>(`/my/ships/${ship}/purchase`, { method: "POST", body: { symbol, units } });
}

// Sells everything the market buys, in tradeVolume-sized chunks.
// `except` lets you hold on to things, e.g. contract goods.
export async function sellAll(ship: string, waypoint: string, except: TradeSymbol[] = []): Promise<MarketTransaction[]> {
    const market = await getLiveMarket(waypoint);
    const tradeGoods = market.tradeGoods ?? [];
    const cargo = await getCargo(ship);
    const transactions: MarketTransaction[] = [];

    for (const item of cargo.inventory) {
        if (except.includes(item.symbol)) continue;
        const good = tradeGoods.find((g) => g.symbol === item.symbol);
        if (!good) continue;

        let left = item.units;
        while (left > 0) {
            const units = Math.min(left, good.tradeVolume);
            const result = await sell(ship, item.symbol, units);
            if (!result) break;
            transactions.push(result.transaction);
            left -= units;
        }
    }
    return transactions;
}

export type TraderRole = "import" | "export" | "exchange";

// Finds every market in a system that trades a good.
// side "buyers" = markets that import it, "sellers" = markets that export it. Both include exchange.
export async function findTraders(system: string, symbol: TradeSymbol, side: "buyers" | "sellers") {
    const markets = await listWaypoints(system, "MARKETPLACE");
    const found: { waypoint: string; role: TraderRole }[] = [];

    for (const w of markets) {
        const m = await getMarket(w.symbol);
        const has = (list: { symbol: TradeSymbol }[]) => list.some((g) => g.symbol === symbol);

        if (side === "buyers" && has(m.imports)) found.push({ waypoint: w.symbol, role: "import" });
        else if (side === "sellers" && has(m.exports)) found.push({ waypoint: w.symbol, role: "export" });
        else if (has(m.exchange)) found.push({ waypoint: w.symbol, role: "exchange" });
    }
    return found;
}