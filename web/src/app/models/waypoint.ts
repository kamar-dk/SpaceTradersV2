export interface WaypointTrait {
    symbol: string;          // e.g. "MARKETPLACE", "PRECIOUS_METAL_DEPOSITS"
    name: string;
}

export interface Waypoint {
    symbol: string;          // "X1-XK92-B42"
    type: string;            // "ASTEROID", "PLANET", "MOON", ...
    x: number;
    y: number;
    orbits?: string;         // set on moons and stations: the planet they orbit
    orbitals: { symbol: string }[];   // what orbits this waypoint
    traits: WaypointTrait[];
}