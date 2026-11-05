import { Component, booleanAttribute, computed, inject, input } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { ClockService } from "../services/clock.service";
import { formatDuration } from "../utils/time";
import type { Ship } from "../models/ship";

const STATUS_ICONS: Record<string, string> = {
    DOCKED: "anchor",
    IN_ORBIT: "satellite_alt",
    IN_TRANSIT: "rocket_launch",
};

@Component({
    selector: "app-ship-card",
    imports: [MatCardModule, MatIconModule, MatProgressBarModule],
    templateUrl: "./ship-card.component.html",
    styleUrl: "./ship-card.component.scss",
})
export class ShipCardComponent {
    private clock = inject(ClockService);

    ship = input.required<Ship>();
    compact = input(false, { transform: booleanAttribute });

    // "SP0ILEDDADDY-1" → "S1"
    name = computed(() => "S" + this.ship().symbol.split("-").pop());

    statusIcon = computed(() => STATUS_ICONS[this.ship().nav.status] ?? "help");

    // "Docked at B7", "In orbit at B42", "→ B7 · 2m 05s"
    statusText = computed(() => {
        const nav = this.ship().nav;
        if (nav.status === "IN_TRANSIT") {
            const left = (new Date(nav.route.arrival).getTime() - this.clock.now()) / 1000;
            const eta = left > 0 ? formatDuration(left) : "arriving";
            return `→ ${this.short(nav.route.destination.symbol)} · ${eta}`;
        }
        const where = this.short(nav.waypointSymbol);
        return nav.status === "DOCKED" ? `Docked at ${where}` : `In orbit at ${where}`;
    });

    fuelPercent = computed(() => this.percent(this.ship().fuel.current, this.ship().fuel.capacity));
    cargoPercent = computed(() => this.percent(this.ship().cargo.units, this.ship().cargo.capacity));

    private percent(value: number, max: number): number {
        return max > 0 ? (value / max) * 100 : 0;
    }

    // "X1-XK92-B42" → "B42"
    short(symbol: string): string {
        return symbol.split("-").pop() ?? symbol;
    }
}