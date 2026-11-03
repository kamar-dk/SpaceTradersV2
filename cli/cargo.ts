import * as cargo from "../core/cargo.ts";
import type { TradeSymbol } from "../core/types.ts";

export const cargoCommands = {
    async cargo([ship]: string[]) {
        const c = await cargo.getCargo(ship);
        console.log(`${c.units}/${c.capacity}`);
        for (const item of c.inventory) console.log(`  ${item.units}x ${item.symbol}`);
    },
    async jettison([ship, symbol, units]: string[]) {
        const result = await cargo.jettison(ship, symbol as TradeSymbol, units ? Number(units) : undefined);
        if (!result) return console.log(`No ${symbol} in cargo`);

        console.log(`Jettisoned ${result.units} ${result.symbol}`);
        console.log(`Cargo: ${result.cargo.units}/${result.cargo.capacity}`);
    },
    async transfer([from, to, symbol, units]: string[]) {
        const result = await cargo.transfer(from, to, symbol as TradeSymbol, units ? Number(units) : undefined);
        if (!result) return console.log(`${from} has no ${symbol}`);
        console.log(`Transferred ${result.units} ${result.symbol} from ${from} to ${to}`);
        console.log(`${from} cargo: ${result.cargo.units}/${result.cargo.capacity}`);
    },
}