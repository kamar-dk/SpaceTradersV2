import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MarketsService } from "../../services/markets.service";
import type { Market } from "../../models/market";

type Kind = "import" | "export" | "exchange";

// One cell: how a market deals in a good, and its price if known
type Cell = { kind: Kind; price?: number } | undefined;

// One row: a good, and one cell per market column
type Row = { symbol: string; name: string; cells: Cell[] };

const KIND_SYMBOLS: Record<Kind, string> = { import: "▼", export: "▲", exchange: "⇄" };
const KIND_TITLES: Record<Kind, string> = {
    import: "Buys this (sell here)",
    export: "Sells this (buy here)",
    exchange: "Trades both ways",
};

@Component({
    selector: "app-trade-matrix",
    imports: [MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
    templateUrl: "./trade-matrix.component.html",
    styleUrl: "./trade-matrix.component.scss",
})
export class TradeMatrixComponent {
    private marketsService = inject(MarketsService);

    system = input.required<string>();

    // Text in the filter box
    filter = signal("");

    loaded = computed(() => this.marketsService.isLoaded(this.system()));

    // The columns: this system's markets, sorted by name
    columns = computed(() =>
        [...this.marketsService.inSystem(this.system())].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );

    // The rows: every good any market trades, filtered and sorted by name
    rows = computed<Row[]>(() => {
        const columns = this.columns();

        // Collect all goods across all markets (a Map keeps each good once)
        const goods = new Map<string, string>();
        for (const m of columns) {
            for (const g of [...m.imports, ...m.exports, ...m.exchange]) goods.set(g.symbol, g.name);
        }

        const query = this.filter().trim().toUpperCase();
        return [...goods]
            .filter(([symbol, name]) => !query || symbol.includes(query) || name.toUpperCase().includes(query))
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([symbol, name]) => ({ symbol, name, cells: columns.map((m) => this.cellFor(m, symbol)) }));
    });

    constructor() {
        effect(() => this.marketsService.load(this.system()));
    }

    // How one market deals in one good
    private cellFor(market: Market, symbol: string): Cell {
        const kind: Kind | undefined =
            market.imports.some((g) => g.symbol === symbol) ? "import"
            : market.exports.some((g) => g.symbol === symbol) ? "export"
            : market.exchange.some((g) => g.symbol === symbol) ? "exchange"
            : undefined;
        if (!kind) return undefined;

        // Prices only exist if one of your ships was at the market when it was fetched.
        // sellPrice = what the market pays you, purchasePrice = what you pay the market.
        const live = market.tradeGoods?.find((g) => g.symbol === symbol);
        const price = live ? (kind === "export" ? live.purchasePrice : live.sellPrice) : undefined;
        return { kind, price };
    }

    kindSymbol(kind: Kind): string {
        return KIND_SYMBOLS[kind];
    }

    kindTitle(kind: Kind): string {
        return KIND_TITLES[kind];
    }

    // "X1-VP96-B7" → "B7"
    short(symbol: string): string {
        return symbol.split("-").pop() ?? symbol;
    }
}