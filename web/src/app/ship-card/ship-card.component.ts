import { Component, booleanAttribute, computed, inject, input, signal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { ClockService } from "../services/clock.service";
import { formatDuration } from "../utils/time";
import { AgentService } from "../services/agent.service";
import type { Ship } from "../models/ship";
import { HttpErrorResponse } from "@angular/common/http";
import { MatMenuModule } from "@angular/material/menu";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ShipsService } from "../services/ships.service";

const STATUS_ICONS: Record<string, string> = {
    DOCKED: "anchor",
    IN_ORBIT: "satellite_alt",
    IN_TRANSIT: "rocket_launch",
};

@Component({
    selector: "app-ship-card",
    imports: [MatCardModule, MatIconModule, MatProgressBarModule, MatMenuModule, MatButtonModule, MatSnackBarModule],
    templateUrl: "./ship-card.component.html",
    styleUrl: "./ship-card.component.scss",
})
export class ShipCardComponent {
  private clock = inject(ClockService);
  private agentService = inject(AgentService);
  private shipsService = inject(ShipsService);
  private snackBar = inject(MatSnackBar);

  // True while an action is running, so you can't click twice
  busy = signal(false);

  ship = input.required<Ship>();
  compact = input(false, { transform: booleanAttribute });

  name = computed(() => this.agentService.shipName(this.ship().symbol));

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

  orbit(): void {
    this.run(() => this.shipsService.orbit(this.ship().symbol));
  }

  dock(): void {
      this.run(() => this.shipsService.dock(this.ship().symbol));
  }

  // Runs an action, and shows the game's error message if it fails
  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
        await action();
    } catch (e) {
        const message = e instanceof HttpErrorResponse ? (e.error?.error ?? e.message) : String(e);
        this.snackBar.open(message, "OK", { duration: 5000 });
    } finally {
        this.busy.set(false);
    }
  }
}