import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { Observable } from "rxjs";
import type { Agent } from "../models/agent";
import type { Waypoint } from "../models/waypoint";
import type { Ship, ApiShip, ShipNav } from "../models/ship";

@Injectable({ providedIn: "root" })
export class ApiService {
    private http = inject(HttpClient);

    getAgent(): Observable<Agent> {
        return this.http.get<Agent>("/api/agent");
    }

    getWaypoints(system: string): Observable<Waypoint[]> {
        return this.http.get<Waypoint[]>("/api/waypoints", { params: { system } });
    }

    getShips(): Observable<ApiShip[]> {
        return this.http.get<ApiShip[]>("/api/ships");
    }

    orbit(ship: string): Observable<{ nav: ShipNav }> {
        return this.http.post<{ nav: ShipNav }>(`/api/ships/${ship}/orbit`, null);
    }

    dock(ship: string): Observable<{ nav: ShipNav }> {
        return this.http.post<{ nav: ShipNav }>(`/api/ships/${ship}/dock`, null);
    }
}