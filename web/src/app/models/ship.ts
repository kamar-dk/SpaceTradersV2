import type { components } from "./api-types";

export type ApiShip = components["schemas"]["Ship"];

export interface Ship extends ApiShip {
    updatedAt: number;
}

export type ShipNav = components["schemas"]["ShipNav"];
export type ShipFuel = components["schemas"]["ShipFuel"];
export type ShipCargo = components["schemas"]["ShipCargo"];
export type ShipMount = components["schemas"]["ShipMount"];