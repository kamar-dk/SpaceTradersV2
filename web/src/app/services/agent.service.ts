import { Injectable, computed, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class AgentService {
    private api = inject(ApiService);

    // Fetched once, shared by everyone who injects the service
    agent = toSignal(this.api.getAgent());

    // First letter of the agent: "KAMAR" → "K". Empty until the agent has loaded.
    prefix = computed(() => this.agent()?.symbol[0].toUpperCase() ?? "");

    // "KAMAR-1" → "K1"
    shipName(symbol: string): string {
        return this.prefix() + (symbol.split("-").pop() ?? symbol);
    }
}