import { Injectable, computed, inject, signal, untracked } from "@angular/core";
import { finalize } from "rxjs";
import { ApiService } from "./api.service";
import type { Market } from "../models/market";

@Injectable({ providedIn: "root" })
export class MarketsService {
    private api = inject(ApiService);

    // The store: each system's markets, by system symbol
    private bySystem = signal(new Map<string, Market[]>());

    // Systems being fetched right now
    private pending = new Set<string>();

    // Every loaded market by its waypoint symbol, for get("X1-VP96-B7")
    private byWaypoint = computed(() => {
        const result = new Map<string, Market>();
        for (const list of this.bySystem().values()) {
            for (const m of list) result.set(m.symbol, m);
        }
        return result;
    });

    // --- Reading ---

    // A system's markets, or [] while they're not loaded yet
    inSystem(system: string): Market[] {
        return this.bySystem().get(system) ?? [];
    }

    isLoaded(system: string): boolean {
        return this.bySystem().has(system);
    }

    // The market at one waypoint, if loaded
    get(waypoint: string): Market | undefined {
        return this.byWaypoint().get(waypoint);
    }

    // --- Loading ---

    // Fetch a system's markets, unless they're already loaded or on their way
    load(system: string): void {
        const known = untracked(() => this.bySystem().has(system));
        if (known || this.pending.has(system)) return;

        this.pending.add(system);
        this.api
            .getMarkets(system)
            .pipe(finalize(() => this.pending.delete(system)))
            .subscribe({
                next: (list) => this.bySystem.update((old) => new Map(old).set(system, list)),
                error: () => {},   // nothing cached; the next load() call tries again
            });
    }
}