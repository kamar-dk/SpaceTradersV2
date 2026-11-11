import { Routes } from "@angular/router";
import { SystemMapComponent } from "./map/system-map/system-map.component";
import { hqSystemGuard } from "./guards/hq-system.guard";
import { ShipsPageComponent } from "./ships/ships-page/ships-page.component";
import { MapPageComponent } from "./map/map-page/map-page.component";

export const routes: Routes = [
    { path: "", redirectTo: "map", pathMatch: "full" },
    { path: "map", canActivate: [hqSystemGuard], children: [] },
    { path: "map/:system", component: MapPageComponent },
    { path: "ships", component: ShipsPageComponent },
];