import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Market } from "./types.ts";

const FILE = new URL("../markets.json", import.meta.url);

// A saved market: the lists of goods, plus the last live prices and when they were seen
export type MarketSnapshot = Market & { pricesAt?: string };

type StoreFile = Record<string, MarketSnapshot>;   // by waypoint symbol

// Read from disk every time, so the CLI and the server (separate processes) see each other's saves
function load(): StoreFile {
    if (!existsSync(FILE)) return {};
    try {
        return JSON.parse(readFileSync(FILE, "utf8")) as StoreFile;
    } catch {
        return {};
    }
}

export function getSavedMarket(waypoint: string): MarketSnapshot | undefined {
    return load()[waypoint];
}

// Save a freshly fetched market. With live prices: store them with the time.
// Without (no ship present): keep the prices saved last time.
export function saveMarket(market: Market): MarketSnapshot {
    const data = load();
    const old = data[market.symbol];

    const snapshot: MarketSnapshot = market.tradeGoods
        ? { ...market, pricesAt: new Date().toISOString() }
        : { ...market, tradeGoods: old?.tradeGoods, pricesAt: old?.pricesAt };

    data[market.symbol] = snapshot;
    writeFileSync(FILE, JSON.stringify(data));
    return snapshot;
}