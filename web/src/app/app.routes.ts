import { Routes } from "@angular/router";
import { MapComponent } from "./map/map.component";
import { hqSystemGuard } from "./guards/hq-system.guard";

export const routes: Routes = [
    { path: "", redirectTo: "map", pathMatch: "full" },
    { path: "map", canActivate: [hqSystemGuard], children: [] },
    { path: "map/:system", component: MapComponent },
];