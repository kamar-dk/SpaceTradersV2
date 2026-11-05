
export function systemOf(waypoint: string): string {
    return waypoint.split("-").slice(0, 2).join("-");
}