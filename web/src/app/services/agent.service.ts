import { Injectable, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EMPTY, catchError, switchMap, timer } from "rxjs";
import { ApiService } from "./api.service";
import type { Agent } from "../models/agent";

// Credits also change from CLI loops running elsewhere, so check now and then
const REFRESH_MS = 60_000;

@Injectable({ providedIn: "root" })
export class AgentService {
    private api = inject(ApiService);

    // The store. Private and writable inside, read-only outside.
    private state = signal<Agent | undefined>(undefined);
    agent = this.state.asReadonly();

    // "KAMAR" → "K"
    prefix = computed(() => this.agent()?.symbol[0].toUpperCase() ?? "");

    constructor() {
        timer(0, REFRESH_MS)
            .pipe(
                switchMap(() => this.api.getAgent().pipe(catchError(() => EMPTY))),
                takeUntilDestroyed(),
            )
            .subscribe((agent) => this.state.set(agent));
    }

    // After an action that costs or earns credits (refuel, sell, buy)
    setCredits(credits: number): void {
        this.state.update((agent) => agent && { ...agent, credits });
    }

    // "KAMAR-1" → "K1"
    shipName(symbol: string): string {
        return this.prefix() + (symbol.split("-").pop() ?? symbol);
    }
}