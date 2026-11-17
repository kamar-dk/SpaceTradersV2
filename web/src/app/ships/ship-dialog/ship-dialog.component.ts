import { Component, inject, computed } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import type { Ship, ShipModule, ShipMount } from '../../models/ship';
import { statusIcon as iconFor } from "../ships-util";
import { MatIconModule } from "@angular/material/icon";
import { formatDuration } from "../../utils/time";
import { ClockService } from '../../services/clock.service';
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { prettyName } from '../../utils/format';
import { DatePipe } from '@angular/common';
import { ShipsService } from '../../services/ships.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AgentService } from "../../services/agent.service";

export type ShipDialogData = { ship: Ship };

@Component({
    imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, DatePipe],
    selector: 'app-ship-dialog',
    styleUrl: './ship-dialog.component.scss',
    templateUrl: './ship-dialog.component.html',
})
export class ShipDialogComponent {
    private data = inject<ShipDialogData>(MAT_DIALOG_DATA)
    private clock = inject(ClockService);
    private shipsService = inject(ShipsService);
    private agentService = inject(AgentService);

    ship = computed(() => this.shipsService.get(this.data.ship.symbol) ?? this.data.ship);
    prettyName = prettyName;

    statusIcon = computed(() => iconFor(this.ship().nav.status));

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

    moduleGroups = computed(() => {
        const groups = new Map<string, { module: ShipModule; count: number }>();
        for (const module of this.ship().modules) {
            const group = groups.get(module.symbol);
            if (group) group.count++;
            else groups.set(module.symbol, { module, count: 1 });
        }
        return [...groups.values()];
    });

    mountGroups = computed(() => {
        const groups = new Map<string, { mount: ShipMount; count: number }>();
        for (const mount of this.ship().mounts) {
            const group = groups.get(mount.symbol);
            if (group) group.count++;
            else groups.set(mount.symbol, { mount, count: 1 });
        }
        return [...groups.values()];
    });

    fuelPercent = computed(() => this.percent(this.ship().fuel.current, this.ship().fuel.capacity));
    cargoPercent = computed(() => this.percent(this.ship().cargo.units, this.ship().cargo.capacity));

    slotsUsed = computed (() => 
        this.ship().modules.reduce((sum, module) => sum + (module.requirements.slots ?? 0), 0)
    );
    powerUsed = computed(() => {
        const s = this.ship();
        const parts = [s.frame, s.reactor, s.engine, ...s.modules, ...s.mounts];
        return parts.reduce((sum, part) => sum + (part.requirements.power ?? 0), 0);
    });

    cooldownLeft = computed(() => {
        const expiration = this.ship().cooldown.expiration;
        if (!expiration) return 0;
        return Math.max(0, (new Date(expiration).getTime() - this.clock.now()) / 1000);
    });

    components = computed(() => {
        const s = this.ship();
        return [
            { kind: "Frame", part: s.frame, stat: `fuel ${s.frame.fuelCapacity}` },
            { kind: "Reactor", part: s.reactor, stat: `power output ${s.reactor.powerOutput}` },
            { kind: "Engine", part: s.engine, stat: `speed ${s.engine.speed}` },
        ];
    });

    arrivalLeft = computed(() => {
        const nav = this.ship().nav;
        if (nav.status !== "IN_TRANSIT") return 0;
        return Math.max(0, (new Date(nav.route.arrival).getTime() - this.clock.now()) / 1000);
    });

    short(symbol: string): string {
        return symbol.split("-").pop() ?? symbol;
    }

    formatDuration = formatDuration;

    private percent(value: number, max: number): number {
        return max > 0 ? (value / max) * 100 : 0;
    }

    shipName(symbol: string): string {
        return this.agentService.shipName(symbol);
    }

    conditionLevel(condition: number): "good" | "worn" | "bad" {
        if (condition >= 0.8) return "good";
        if (condition >= 0.5) return "worn";
        return "bad";
    }
}
