import type { ShipNavStatus } from "../models/ship";

// The icon for each navigation status
export const STATUS_ICONS: Record<ShipNavStatus, string> = {
    DOCKED: "anchor",
    IN_ORBIT: "satellite_alt",
    IN_TRANSIT: "rocket_launch",
};

export function statusIcon(status: ShipNavStatus): string {
    return STATUS_ICONS[status];
}