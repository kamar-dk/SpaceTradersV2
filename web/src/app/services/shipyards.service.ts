import { Injectable, computed, inject, signal, untracked } from "@angular/core";
import { finalize } from "rxjs";
import { ApiService } from "./api.service";
import type { Shipyard } from "../models/shipyard";

@Injectable({ providedIn: "root" })
export class ShipyardsService {
    private api = inject(ApiService);

    // The store: each system's shipyard, by system symbol
    private bySystem = signal(new Map<string, Shipyard[]>());

    // Systems being fetched right now
    private pending = new Set<string>();

    // Every loaded shipyard by its waypoint symbol, for get("X1-VP96-B7")
    private byWaypoint = computed(() => {
        const result = new Map<string, Shipyard>();
        for (const list of this.bySystem().values()) {
            for (const m of list) result.set(m.symbol, m);
        }
        return result;
    });

    // --- Reading ---

    // A system's shipyards, or [] while they're not loaded yet
    inSystem(system: string): Shipyard[] {
        return this.bySystem().get(system) ?? [];
    }

    isLoaded(system: string): boolean {
        return this.bySystem().has(system);
    }

    // The shipyard at one waypoint, if loaded
    get(waypoint: string): Shipyard | undefined {
        return this.byWaypoint().get(waypoint);
    }

    // --- Loading ---

    // Fetch a system's shipyards, unless they're already loaded or on their way
    load(system: string): void {
        const known = untracked(() => this.bySystem().has(system));
        if (known || this.pending.has(system)) return;

        this.pending.add(system);
        this.api
            .getShipyards(system)
            .pipe(finalize(() => this.pending.delete(system)))
            .subscribe({
                next: (list) => this.bySystem.update((old) => new Map(old).set(system, list)),
                error: () => {},
            });
    }
}