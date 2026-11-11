import { Injectable, computed, inject, signal, untracked } from "@angular/core";
import { finalize } from "rxjs";
import { ApiService } from "./api.service";
import type { Waypoint } from "../models/waypoint";

@Injectable({ providedIn: "root" })
export class WaypointsService {
    private api = inject(ApiService);

    // The store: each system's waypoints, by system symbol
    private bySystem = signal(new Map<string, Waypoint[]>());

    // Systems being fetched right now, so two components asking at once only cause one request
    private pending = new Set<string>();

    // Every loaded waypoint by its own symbol, for quick lookups like get("X1-VP96-B7")
    private bySymbol = computed(() => {
        const result = new Map<string, Waypoint>();
        for (const list of this.bySystem().values()) {
            for (const w of list) result.set(w.symbol, w);
        }
        return result;
    });

    // --- Reading ---

    // A system's waypoints, or [] while they're not loaded yet
    inSystem(system: string): Waypoint[] {
        return this.bySystem().get(system) ?? [];
    }

    isLoaded(system: string): boolean {
        return this.bySystem().has(system);
    }

    get(symbol: string): Waypoint | undefined {
        return this.bySymbol().get(symbol);
    }

    // --- Loading ---

    // Fetch a system's waypoints, unless they're already loaded or on their way
    load(system: string): void {
        const known = untracked(() => this.bySystem().has(system));
        if (known || this.pending.has(system)) return;

        this.pending.add(system);
        this.api
            .getWaypoints(system)
            .pipe(finalize(() => this.pending.delete(system)))
            .subscribe({
                next: (list) => this.bySystem.update((old) => new Map(old).set(system, list)),
                error: () => {},   // nothing cached; the next load() call tries again
            });
    }
}