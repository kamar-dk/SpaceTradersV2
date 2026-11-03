import { api } from "./api.ts";
import type { Contract, Agent } from "./types.ts";

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
