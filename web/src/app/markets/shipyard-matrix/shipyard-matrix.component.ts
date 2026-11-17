import { Component, computed, effect, inject, input } from "@angular/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ShipyardsService } from "../../services/shipyards.service";
import type { Shipyard } from "../../models/shipyard";
import { prettyName } from "../../utils/format";

// One cell: offered here, and the price if known
type Cell = { price?: number } | undefined;
type Row = { type: string; name: string; cells: Cell[] };

@Component({
    selector: "app-shipyard-matrix",
    imports: [MatProgressSpinnerModule],
    templateUrl: "./shipyard-matrix.component.html",
    styleUrl: "./shipyard-matrix.component.scss",
})
export class ShipyardMatrixComponent {
    private shipyardsService = inject(ShipyardsService);

    system = input.required<string>();

    loaded = computed(() => this.shipyardsService.isLoaded(this.system()));

    // The columns: this system's shipyards, sorted by name
    columns = computed(() =>
        [...this.shipyardsService.inSystem(this.system())].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );

    // The rows: every ship type any shipyard offers
    rows = computed<Row[]>(() => {
        const columns = this.columns();
        const types = new Set(columns.flatMap((y) => y.shipTypes.map((t) => t.type)));

        return [...types]
            .sort()
            .map((type) => ({ type, name: prettyName(type), cells: columns.map((y) => this.cellFor(y, type)) }));
    });

    constructor() {
        effect(() => this.shipyardsService.load(this.system()));
    }

    private cellFor(shipyard: Shipyard, type: string): Cell {
        if (!shipyard.shipTypes.some((t) => t.type === type)) return undefined;
        // Full ship details with prices only exist if one of your ships was there
        const ship = shipyard.ships?.find((s) => s.type === type);
        return { price: ship?.purchasePrice };
    }

    // "X1-VK6-A2" → "A2"
    short(symbol: string): string {
        return symbol.split("-").pop() ?? symbol;
    }
}