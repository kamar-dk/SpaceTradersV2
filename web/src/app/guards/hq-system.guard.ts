import { inject } from "@angular/core";
import { Router, type CanActivateFn } from "@angular/router";
import { map } from "rxjs";
import { ApiService } from "../services/api.service";
import { systemOf } from "../utils/symbols";

// Sends /map to /map/<HQ system>
export const hqSystemGuard: CanActivateFn = () => {
    const api = inject(ApiService);
    const router = inject(Router);
    return api.getAgent().pipe(
        map((agent) => router.createUrlTree(["/map", systemOf(agent.headquarters)])),
    );
};