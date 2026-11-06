import { Component, computed, inject, input, linkedSignal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { MatTabsModule } from "@angular/material/tabs";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatAccordion } from "@angular/material/expansion";
import { SystemMapComponent } from "../../system-map/system-map.component";
import { ApiService } from "../../services/api.service";
import { ShipsService } from "../../services/ships.service";
import { systemOf } from "../../utils/symbols";
import { ShipCardComponent } from "../../ship-card/ship-card.component";
import { MatPaginatorModule, type PageEvent } from "@angular/material/paginator";

type SystemTab = { symbol: string; label: string; ships: number };

const SHIPS_PER_PAGE = 6;


@Component({
  imports: [RouterLink, MatTabsModule, MatExpansionModule, SystemMapComponent, ShipCardComponent, MatAccordion, MatPaginatorModule],
  selector: 'app-map-page',
  styleUrl: './map-page.component.scss',
  templateUrl: './map-page.component.html',
})
export class MapPageComponent {
  private api = inject(ApiService);
  private shipsService = inject(ShipsService);

  system = input.required<string>(); // from :system in the URL

  private agent = toSignal(this.api.getAgent());
  
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

  shipsPerPage = SHIPS_PER_PAGE;

  pageIndex = linkedSignal({ source: this.system, computation: () => 0 });

  // Only the ships on the current page
  pagedShips = computed(() => {
      const start = this.pageIndex() * SHIPS_PER_PAGE;
      return this.ships().slice(start, start + SHIPS_PER_PAGE);
  });

  onPage(event: PageEvent): void {
      this.pageIndex.set(event.pageIndex);
  }
}
