import { api } from "./api.ts";
import { systemOf, sleep } from "../utils.ts";
import { getCargo } from "./cargo.ts";
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