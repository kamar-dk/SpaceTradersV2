import { api } from "./api.ts";
import type { Ship } from "./types.ts";

export function listShips(): Promise<Ship[]> {
    return api<Ship[]>("/my/ships");
}

export function getShip(ship: string): Promise<Ship> {
    return api<Ship>(`/my/ships/${ship}`);
}