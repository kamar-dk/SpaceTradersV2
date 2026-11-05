import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import type { Observable } from "rxjs";
import type { Agent } from "../models/agent";
import type { Waypoint } from "../models/waypoint";
import type { Ship } from "../models/ship";

@Injectable({ providedIn: "root" })
export class ApiService {
    private http = inject(HttpClient);

    getAgent(): Observable<Agent> {
        return this.http.get<Agent>("/api/agent");
    }

    getWaypoints(system: string): Observable<Waypoint[]> {
        return this.http.get<Waypoint[]>("/api/waypoints", { params: { system } });
    }

    getShips(): Observable<Ship[]> {
        return this.http.get<Ship[]>("/api/ships");
    }
}