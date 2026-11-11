import { Component, computed, inject, input, effect } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { switchMap } from "rxjs";
import { MatTabsModule } from "@angular/material/tabs";
import { MatExpansionModule } from "@angular/material/expansion";
import { SystemMapComponent } from "../system-map/system-map.component";
import { ShipCardComponent } from "../../ships/ship-card/ship-card.component";
import { WaypointCardComponent } from "../waypoint-card/waypoint-card.component";
import { ApiService } from "../../services/api.service";
import { ShipsService } from "../../services/ships.service";
import { systemOf } from "../../utils/symbols";
import { TYPE_STYLES } from "../../utils/waypoint-styles";
import { WaypointsService } from "../../services/waypoints.service";

type SystemTab = { symbol: string; label: string; ships: number };

// Waypoint types in legend order: planets first, asteroids last
const TYPE_ORDER = Object.keys(TYPE_STYLES);

@Component({
    selector: "app-map-page",
    imports: [
        RouterLink,
        MatTabsModule,
        MatExpansionModule,
        SystemMapComponent,
        ShipCardComponent,
        WaypointCardComponent,
    ],
    templateUrl: "./map-page.component.html",
    styleUrl: "./map-page.component.scss",
})
export class MapPageComponent {
    private api = inject(ApiService);
    private shipsService = inject(ShipsService);
    private waypointsService = inject(WaypointsService)

    system = input.required<string>();   // from :system in the URL

    private agent = toSignal(this.api.getAgent());

    // One tab per system: HQ first, then every system where you have ships
    tabs = computed<SystemTab[]>(() => {
        const agent = this.agent();
        const hq = agent ? systemOf(agent.headquarters) : undefined;

        const symbols = new Set<string>();
        if (hq) symbols.add(hq);
        for (const ship of this.shipsService.ships()) symbols.add(ship.nav.systemSymbol);
        symbols.add(this.system());   // the one you're viewing, even if no ships are there

        return [...symbols].map((symbol) => ({
            symbol,
            label: symbol === hq ? `HQ · ${symbol}` : symbol,
            ships: this.shipsService.inSystem(symbol).length,
        }));
    });

    // Ships in the system being shown, for the side column
    ships = computed(() => this.shipsService.inSystem(this.system()));

    // Waypoints in the system being shown (the server caches them, so the map's request is instant)
    waypoints = computed(() => this.waypointsService.inSystem(this.system()));

    // Grouped by type in legend order, then by name
    waypointList = computed(() =>
        [...this.waypoints()].sort((a, b) => {
            const ta = TYPE_ORDER.indexOf(a.type);
            const tb = TYPE_ORDER.indexOf(b.type);
            const byType = (ta === -1 ? 99 : ta) - (tb === -1 ? 99 : tb);
            return byType || a.symbol.localeCompare(b.symbol);
        }),
    );

    constructor() {
        // Make sure the cache has the system that's showing; does nothing if it's already there
        effect(() => this.waypointsService.load(this.system()));
    }
}