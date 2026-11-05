export interface ShipRoute {
    origin: { symbol: string };
    destination: { symbol: string };
    departureTime: string;
    arrival: string;
}

export interface ShipNav {
    systemSymbol: string;
    waypointSymbol: string;
    status: string;            // "DOCKED", "IN_ORBIT", "IN_TRANSIT"
    route: ShipRoute;
}

export interface ShipFuel {
    current: number;
    capacity: number;
}

export interface ShipCargoItem {
    symbol: string;
    name: string;
    units: number;
}

export interface ShipCargo {
    capacity: number;
    units: number;
    inventory: ShipCargoItem[];
}

export interface ShipFrame {
    symbol: string;
    name: string;
}

export interface ShipMount {
    symbol: string;
    name: string;
    strength?: number;
    deposits?: string[];
}

export interface Ship {
    symbol: string;
    registration: { role: string };
    nav: ShipNav;
    fuel: ShipFuel;
    cargo: ShipCargo;
    frame: ShipFrame;
    mounts: ShipMount[];
}