import { Component, inject, computed } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { Ship } from '../../models/ship';
import { statusIcon as iconFor } from "../ships-util";
import { MatIconModule } from "@angular/material/icon";
import { formatDuration } from "../../utils/time";
import { ClockService } from '../../services/clock.service';
import { MatProgressBarModule } from "@angular/material/progress-bar";

export type ShipDialogData = { ship: Ship };

@Component({
  imports: [MatIconModule, MatProgressBarModule],
  selector: 'app-ship-dialog',
  styleUrl: './ship-dialog.component.scss',
  templateUrl: './ship-dialog.component.html',
})
export class ShipDialogComponent {
  private data = inject<ShipDialogData>(MAT_DIALOG_DATA)
  private clock = inject(ClockService);

  ship = this.data.ship;

  statusIcon = computed(() => iconFor(this.ship.nav.status));

  // "Docked at B7", "In orbit at B42", "→ B7 · 2m 05s"
  statusText = computed(() => {
      const nav = this.ship.nav;
      if (nav.status === "IN_TRANSIT") {
          const left = (new Date(nav.route.arrival).getTime() - this.clock.now()) / 1000;
          const eta = left > 0 ? formatDuration(left) : "arriving";
          return `→ ${this.short(nav.route.destination.symbol)} · ${eta}`;
      }
      const where = this.short(nav.waypointSymbol);
      return nav.status === "DOCKED" ? `Docked at ${where}` : `In orbit at ${where}`;
  });

  short(symbol: string): string {
      return symbol.split("-").pop() ?? symbol;
  }

  fuelPercent = computed(() => this.percent(this.ship.fuel.current, this.ship.fuel.capacity));
  cargoPercent = computed(() => this.percent(this.ship.cargo.units, this.ship.cargo.capacity));

  private percent(value: number, max: number): number {
      return max > 0 ? (value / max) * 100 : 0;
  }
}
