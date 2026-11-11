import { Injectable, inject, signal, computed } from "@angular/core";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { catchError, EMPTY, switchMap, timer, map, firstValueFrom } from "rxjs";
import { ApiService } from "./api.service";
import type { Ship, ApiShip } from "../models/ship";

const REFRESH_MS = 15_000;

@Injectable({ providedIn: "root" })
export class ShipsService {
    private api = inject(ApiService);

    private store = signal(new Map<string, Ship>())

    ships = computed(() => [...this.store().values()]);

    loaded = signal(false);

    constructor() {
        timer(0, REFRESH_MS)
            .pipe(
                switchMap(() => {
                    const requestedAt = Date.now();
                    return this.api.getShips().pipe(
                        map((ships) => ({ ships, requestedAt })),
                        catchError(() => EMPTY),
                    )
                }),
                takeUntilDestroyed(),
            )
            .subscribe(({ ships, requestedAt }) => this.replaceAll(ships, requestedAt));
    }

    get(symbol: string): Ship | undefined {
        return this.store().get(symbol);
    }

    // The ships currently in the given system
    inSystem(system: string): Ship[] {
        return this.ships().filter((s) => s.nav.systemSymbol === system);
    }

    async orbit(symbol: string): Promise<void> {
        const { nav } = await firstValueFrom(this.api.orbit(symbol));
        this.patch(symbol, { nav });
    }

    async dock(symbol: string): Promise<void> {
        const { nav } = await firstValueFrom(this.api.dock(symbol));
        this.patch(symbol, { nav });
    }

    // --- Writing ---

    // From the poll: take the fresh list, but keep any ship an action updated after the poll started
    private replaceAll(fresh: ApiShip[], requestedAt: number): void {
        this.store.update((old) => {
            const next = new Map<string, Ship>();
            for (const ship of fresh) {
                const current = old.get(ship.symbol);
                const keepCurrent = current !== undefined && current.updatedAt > requestedAt;
                next.set(ship.symbol, keepCurrent ? current : { ...ship, updatedAt: requestedAt });
            }
            return next;
        });
        this.loaded.set(true);
    }

    // From an action: change some parts of one ship, e.g. patch("KAMAR-1", { nav })
    patch(symbol: string, changes: Partial<ApiShip>): void {
        this.store.update((old) => {
            const ship = old.get(symbol);
            if (!ship) return old;

            const next = new Map(old);
            next.set(symbol, { ...ship, ...changes, updatedAt: Date.now() });
            return next;
        });
    }
}