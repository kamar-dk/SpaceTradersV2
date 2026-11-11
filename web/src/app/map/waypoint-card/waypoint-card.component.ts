import { Component, computed, input } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { styleOf } from "../../utils/waypoint-styles";
import type { Waypoint, WaypointTraitSymbol } from "../../models/waypoint";

// The traits worth showing on a card, with short names. Everything else is left out.
const KEY_TRAITS: Partial<Record<WaypointTraitSymbol, string>> = {
    MARKETPLACE: "Market",
    SHIPYARD: "Shipyard",
    COMMON_METAL_DEPOSITS: "Common metals",
    PRECIOUS_METAL_DEPOSITS: "Precious metals",
    RARE_METAL_DEPOSITS: "Rare metals",
    MINERAL_DEPOSITS: "Minerals",
    ICE_CRYSTALS: "Ice",
    EXPLOSIVE_GASES: "Gases",
};

@Component({
    selector: "app-waypoint-card",
    imports: [MatCardModule],
    templateUrl: "./waypoint-card.component.html",
    styleUrl: "./waypoint-card.component.scss",
})
export class WaypointCardComponent {
    waypoint = input.required<Waypoint>();

    style = computed(() => styleOf(this.waypoint().type));

    // "X1-XK92-B42" → "B42"
    name = computed(() => this.short(this.waypoint().symbol));

    // Only the key traits, in the order of KEY_TRAITS
    tags = computed(() => {
        const has = new Set(this.waypoint().traits.map((t) => t.symbol));
        return (Object.entries(KEY_TRAITS) as [WaypointTraitSymbol, string][])
            .filter(([symbol]) => has.has(symbol))
            .map(([symbol, label]) => ({ symbol, label }));
    });

    short(symbol: string): string {
        return symbol.split("-").pop() ?? symbol;
    }
}