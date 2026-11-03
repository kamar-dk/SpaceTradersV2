import { api } from "./api.ts";
import { getCargo } from "./cargo.ts";
import type { Contract, Agent, TradeSymbol, ShipCargo } from "./types.ts";

export function listContracts(): Promise<Contract[]> {
    return api<Contract[]>("/my/contracts");
}

export function accept(id: string) {
    return api<{agent: Agent, contract: Contract }>(`/my/contracts/${id}/accept`, { method: "POST" });
}

export async function negotiate(ship: string): Promise<Contract> {
    const data = await api<{ contract: Contract }>(`/my/ships/${ship}/negotiate/contract`, { method: "POST" });
    return data.contract;
}

export async function deliver(contractId: string, ship: string, tradeSymbol: TradeSymbol, units?: number) {
    if (units === undefined) {
        const cargo = await getCargo(ship);
        const item = cargo.inventory.find((i) => i.symbol === tradeSymbol);
        if (!item) {
            return null;
        }
        units = item.units;
    }

    const data = await api<{ contract: Contract; cargo: ShipCargo}>(`/my/contracts/${contractId}/deliver`, {
        method: "POST",
        body: {shipSymbol: ship, tradeSymbol, units },
    });
    return { ...data, units };
}

export function fulfill(id: string) {
    return api<{ agent: Agent; contract: Contract }>(`/my/contracts/${id}/fulfill`, { method: "POST" });
}

export function remaining(contract: Contract) {
    return (contract.terms.deliver ?? []).map((d) => ({
        ...d,
        unitsLeft: d.unitsRequired - d.unitsFulfilled,
    }));
}

