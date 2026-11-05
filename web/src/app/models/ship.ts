export interface ShipRoute {
    origin: { symbol: string };
    destination: { symbol: string };
    departureTime: string;
    arrival: string;
}

export interface Ship {
    symbol: string;
    nav: {
        systemSymbol: string;
        waypointSymbol: string;
        status: string;            // "DOCKED", "IN_ORBIT", "IN_TRANSIT"
        route: ShipRoute;
    };
}