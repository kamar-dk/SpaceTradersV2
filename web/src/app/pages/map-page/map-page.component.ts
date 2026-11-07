import { Component, computed, inject, input } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { MatTabsModule } from "@angular/material/tabs";
import { MatExpansionModule } from "@angular/material/expansion";
import { SystemMapComponent } from "../../system-map/system-map.component";
import { ShipCardComponent } from "../../ship-card/ship-card.component";
import { ApiService } from "../../services/api.service";
import { ShipsService } from "../../services/ships.service";
import { systemOf } from "../../utils/symbols";

type SystemTab = { symbol: string; label: string; ships: number };

@Component({
    selector: "app-map-page",
    imports: [RouterLink, MatTabsModule, MatExpansionModule, SystemMapComponent, ShipCardComponent],
    templateUrl: "./map-page.component.html",
    styleUrl: "./map-page.component.scss",
})
export class MapPageComponent {
    private api = inject(ApiService);
    private shipsService = inject(ShipsService);

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
}