import type { components } from "./api-types";

export type Market = components["schemas"]["Market"];
export type TradeGood = components["schemas"]["TradeGood"];             // an entry in imports/exports/exchange
export type MarketTradeGood = components["schemas"]["MarketTradeGood"]; // a good with live prices
export type TradeSymbol = components["schemas"]["TradeSymbol"];