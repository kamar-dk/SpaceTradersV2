import { Routes } from "@angular/router";
import { SystemMapComponent } from "./system-map/system-map.component";
import { hqSystemGuard } from "./guards/hq-system.guard";
import { ShipsPageComponent } from "./pages/ships-page/ships-page.component";
import { MapPageComponent } from "./pages/map-page/map-page.component";

export const routes: Routes = [
    { path: "", redirectTo: "map", pathMatch: "full" },
    { path: "map", canActivate: [hqSystemGuard], children: [] },
    { path: "map/:system", component: MapPageComponent },
    { path: "ships", component: ShipsPageComponent },
];