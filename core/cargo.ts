import { api } from "./api.ts";
import type { ShipCargo, TradeSymbol } from "./types.ts";

export function getCargo(ship: string): Promise<ShipCargo> {
    return api<ShipCargo>(`/my/ships/${ship}/cargo`);
}

export async function jettison(ship: string, symbol: TradeSymbol, units?: number) {
    if (units === undefined) {
        const cargo = await getCargo(ship);
        const item = cargo.inventory.find((i) => i.symbol === symbol);
        if (!item) return null;
        units = item.units;
    }

    const data = await api<{ cargo: ShipCargo}>(`/my/ships/${ship}/jettison`, {
        method: "POST",
        body: {symbol, units},
    });
    return { cargo: data.cargo, symbol, units};
}

export async function transfer(from: string, to: string, symbol: TradeSymbol, units?: number) {
    if (units === undefined) {
        const cargo = await getCargo(from);
        const item = cargo.inventory.find((i) => i.symbol === symbol);
        if (!item) return null;
        units = item.units;
    }
    const data = await api<{ cargo: ShipCargo }>(`/my/ships/${from}/transfer`, {
        method: "POST",
        body: { tradeSymbol: symbol, units, shipSymbol: to },
    });
    return { cargo: data.cargo, symbol, units };
}