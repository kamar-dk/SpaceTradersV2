import type { components } from "./api-types.ts";

type Schemas = components["schemas"];

export type Ship = Schemas["Ship"];
export type ShipNav = Schemas["ShipNav"];
export type ShipFuel = Schemas["ShipFuel"];
export type ShipCargo = Schemas["ShipCargo"];
export type Agent = Schemas["Agent"];
export type MarketTransaction = Schemas["MarketTransaction"];
export type TradeSymbol = Schemas["TradeSymbol"];
export type Contract = Schemas["Contract"];
export type System = Schemas["System"];
export type SystemSymbol = Schemas["SystemSymbol"];
export type Waypoint = Schemas["Waypoint"];
export type WaypointTraitSymbol = Schemas["WaypointTraitSymbol"];
export type Extraction = Schemas["Extraction"];
export type Cooldown = Schemas["Cooldown"];
export type Market = Schemas["Market"];
export type MarketTradeGood = Schemas["MarketTradeGood"];
export type ShipType = Schemas["ShipType"];
export type ShipyardTransaction = Schemas["ShipyardTransaction"];
export type Shipyard = Schemas["Shipyard"];
export type Survey = Schemas["Survey"];