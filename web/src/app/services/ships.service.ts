import { Injectable, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { switchMap, timer } from "rxjs";
import { ApiService } from "./api.service";
import type { Ship } from "../models/ship";

const REFRESH_MS = 15_000;

@Injectable({ providedIn: "root" })
export class ShipsService {
    private api = inject(ApiService);

    // All your ships, refreshed every REFRESH_MS
    ships = toSignal(
        timer(0, REFRESH_MS).pipe(switchMap(() => this.api.getShips())),
        { initialValue: [] as Ship[] },
    );

    // The ships currently in the given system
    inSystem(system: string): Ship[] {
        return this.ships().filter((s) => s.nav.systemSymbol === system);
    }
}