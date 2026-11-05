import { Injectable } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { interval, map } from "rxjs";

// One clock for the whole app, ticking every second.
// Anything that counts down (ETAs, cooldowns) reads now().
@Injectable({ providedIn: "root" })
export class ClockService {
    now = toSignal(interval(1000).pipe(map(() => Date.now())), { initialValue: Date.now() });
}