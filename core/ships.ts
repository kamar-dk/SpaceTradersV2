import { api } from "./api.ts";
import type { Ship, Cooldown } from "./types.ts";

export function listShips(): Promise<Ship[]> {
    return api<Ship[]>("/my/ships");
}

export function getShip(ship: string): Promise<Ship> {
    return api<Ship>(`/my/ships/${ship}`);
}

export function isMiner(ship: Ship): boolean {
    return ship.mounts.some((m) => m.symbol.startsWith("MOUNT_MINING_LASER"));
}

// A ship can survey if it has any surveyor mounted
export function canSurvey(ship: Ship): boolean {
    return ship.mounts.some((m) => m.symbol.startsWith("MOUNT_SURVEYOR"));
}

// Returns undefined when the ship has no cooldown (the API answers 204)
export function getCooldown(ship: string): Promise<Cooldown | undefined> {
    return api<Cooldown | undefined>(`/my/ships/${ship}/cooldown`);
}