import * as market from "../core/market.ts";
import { header, row } from "./table.ts";
import type { MarketTransaction, TradeSymbol } from "../core/types.ts";

const GOOD_COLS = [24, -7, -7, -5, 0];
const GOOD_HEADERS = ["SYMBOL", "YOU PAY", "YOU GET", "VOL", "SUPPLY"];

function printTransaction(verb: string, t: MarketTransaction): void {
    console.log(`${verb} ${t.units} ${t.tradeSymbol} for ${t.totalPrice} credits (${t.pricePerUnit}/unit)`);
}

const unitsArg = (units?: string) => (units ? Number(units) : undefined);


export const marketCommands = {
    async market([waypoint]: string[]) {
        const m = await market.getMarket(waypoint);

        if (m.tradeGoods) {
            // Live Prices
            header(GOOD_HEADERS, GOOD_COLS)
            for (const g of m.tradeGoods) {
                console.log(row(
                    [g.symbol, String(g.purchasePrice), String(g.sellPrice), String(g.tradeVolume), g.supply],
                    GOOD_COLS,
                ));
            }
        } else {
            const list = (arr: {symbol: string}[]) => arr.map((g) => g.symbol).join(", ") || "-";
            console.log(`Imports:  ${list(m.imports)}`);
            console.log(`Exports:  ${list(m.exports)}`);
            console.log(`Exchange: ${list(m.exchange)}`);
            console.log("(Send a ship here to see prices)");
        }
    },
    async sell([ship, symbol, units]: string[]) {
        const result = await market.sell(ship, symbol as TradeSymbol, unitsArg(units));
        if (!result) return console.log(`No ${symbol} in cargo`);
        printTransaction("Sold", result.transaction);
        console.log(`Credits: ${result.agent.credits}`);
    },
    async buy([ship, symbol, units]: string[]) {
        const result = await market.buy(ship, symbol as TradeSymbol, unitsArg(units));
        if (!result) return console.log("Cargo is full");
        printTransaction("Bought", result.transaction);
        console.log(`Credits: ${result.agent.credits}`);
    },
    async sellAll([ship, waypoint]: string[]) {
        const transactions = await market.sellAll(ship, waypoint);
        if (transactions.length === 0) return console.log("Nothing this market buys");
        for (const t of transactions) printTransaction("Sold", t);
        console.log(`Total: ${transactions.reduce((sum, t) => sum + t.totalPrice, 0)} credits`);
    },
    async buyers([system, symbol]: string[]) {
        const found = await market.findTraders(system, symbol as TradeSymbol, "buyers");
        if (found.length === 0) return console.log(`Nobody in ${system} buys ${symbol}`);
        for (const f of found) console.log(`${f.waypoint}  ${f.role === "import" ? "imports (best prices)" : "exchange"}`);
    },
    async sellers([system, symbol]: string[]) {
        const found = await market.findTraders(system, symbol as TradeSymbol, "sellers");
        if (found.length === 0) return console.log(`Nobody in ${system} sells ${symbol}`);
        for (const f of found) console.log(`${f.waypoint}  ${f.role === "export" ? "exports (cheapest)" : "exchange"}`);
    },
}