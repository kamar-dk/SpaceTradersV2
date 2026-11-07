// How each waypoint type looks: used by the map, its legend and the waypoint list

export type TypeStyle = {
    size: number;    // radius on the map, in "units"
    color: string;
    label: string;   // readable name for the legend, tooltips and lists
};

export const TYPE_STYLES: Record<string, TypeStyle> = {
    GAS_GIANT:           { size: 4,   color: "#ffb74d", label: "Gas giant" },
    PLANET:              { size: 3,   color: "#4fc3f7", label: "Planet" },
    JUMP_GATE:           { size: 2.5, color: "#ef5350", label: "Jump gate" },
    MOON:                { size: 1.6, color: "#b0bec5", label: "Moon" },
    ORBITAL_STATION:     { size: 1.6, color: "#ce93d8", label: "Station" },
    FUEL_STATION:        { size: 1.6, color: "#fff176", label: "Fuel station" },
    ASTEROID_BASE:       { size: 1.4, color: "#a1887f", label: "Asteroid base" },
    ENGINEERED_ASTEROID: { size: 1.4, color: "#81c784", label: "Engineered asteroid" },
    ASTEROID:            { size: 0.9, color: "#6b7280", label: "Asteroid" },
};

export const OTHER_STYLE: TypeStyle = { size: 1, color: "#9e9e9e", label: "Other" };

// Types too numerous to label when zoomed out
export const MINOR_TYPES = new Set(["ASTEROID", "ENGINEERED_ASTEROID", "ASTEROID_FIELD", "DEBRIS_FIELD"]);

export function styleOf(type: string): TypeStyle {
    return TYPE_STYLES[type] ?? OTHER_STYLE;
}