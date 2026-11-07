import { Component, DestroyRef, computed, effect, inject, input, signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { switchMap } from "rxjs";
import { ApiService } from "../services/api.service";
import type { Waypoint } from "../models/waypoint";
import { ShipsService } from "../services/ships.service";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { OTHER_STYLE, TYPE_STYLES, styleOf, type TypeStyle } from "../utils/waypoint-styles";

// --- How each waypoint type looks ---

// Types too numerous to label when zoomed out
const MINOR_TYPES = new Set(["ASTEROID", "ENGINEERED_ASTEROID", "ASTEROID_FIELD", "DEBRIS_FIELD"]);

// --- Types used by the template ---

type Placed = Waypoint & { px: number; py: number; style: TypeStyle; angle: number | null };
type View = { x: number; y: number; w: number; h: number };

type ShipMarker = {
    symbol: string;
    number: string;
    status: string;
    x: number;
    y: number;
    route: { x1: number; y1: number; x2: number; y2: number } | null;
};

@Component({
    imports: [MatButtonModule, MatIconModule],
    selector: "app-system-map",
    templateUrl: "./system-map.component.html",
    styleUrl: "./system-map.component.scss",
})
export class SystemMapComponent {
    private api = inject(ApiService);
    private shipsService = inject(ShipsService);

    system = input.required<string>();   // from :system in the URL

    // --- Data ---

    waypoints = toSignal(
        toObservable(this.system).pipe(switchMap((s) => this.api.getWaypoints(s))),
        { initialValue: [] },
    );

    ships = computed(() => this.shipsService.inSystem(this.system()));

    // Ticks every second, so ships in transit move smoothly between refreshes
    private now = signal(Date.now());

    // --- Camera (zoom and pan) ---

    private view = signal<View>({ x: -10, y: -10, w: 20, h: 20 });
    private fitView = signal<View | null>(null);   // the "whole system" view, for resetting

    viewBox = computed(() => {
        const v = this.view();
        return `${v.x} ${v.y} ${v.w} ${v.h}`;
    });

    // How far in you are: 1 = the whole system, 2 = twice as close, ...
    zoom = computed(() => {
        const fit = this.fitView();
        return fit ? fit.w / this.view().w : 1;
    });

    // Sizes follow the zoom, so things stay the same size on screen
    unit = computed(() => (this.view().w / 600) * Math.pow(this.zoom(), 0.6));
    textSize = computed(() => (this.view().w / 80) * Math.pow(this.zoom(), 0.3));

    // --- Placing waypoints ---

    // Spread positions, with moons and stations in a ring around their planet.
    // The ring radius is in units, so moons stay outside the planet at every zoom level.
    placed = computed<Placed[]>(() => {
      const list = this.waypoints();
      const unit = this.unit();
      const bySymbol = new Map(list.map((w) => [w.symbol, w]));

      return list.map((w) => {
          const style = styleOf(w.type);
          const parent = w.orbits ? bySymbol.get(w.orbits) : undefined;

          if (!parent) return { ...w, px: w.x, py: w.y, style, angle: null };

          const siblings = parent.orbitals.map((o) => o.symbol);
          const angle = (2 * Math.PI * siblings.indexOf(w.symbol)) / Math.max(siblings.length, 1) - Math.PI / 2;
          const ring = unit * (styleOf(parent.type).size + style.size + 4);
          return { ...w, px: parent.x + Math.cos(angle) * ring, py: parent.y + Math.sin(angle) * ring, style, angle };
      });
    });

    private positionOf = computed(() => new Map(this.placed().map((w) => [w.symbol, w])));

    // --- Selection ---

    selectedSymbol = signal<string | null>(null);
    selected = computed(() => this.positionOf().get(this.selectedSymbol() ?? "") ?? null);

    // --- Ships ---

    shipMarkers = computed(() => {
        const now = this.now();
        const pos = this.positionOf();
        const unit = this.unit();

        // Space between parked ships: wide enough that "S1" and "S5" don't touch
        const spacing = Math.max(unit * 4, this.textSize() * 1.8);

        // How many ships are parked at each waypoint, so each row can be centred
        const parked = this.ships().filter((s) => s.nav.status !== "IN_TRANSIT");
        const total = new Map<string, number>();
        for (const s of parked) total.set(s.nav.waypointSymbol, (total.get(s.nav.waypointSymbol) ?? 0) + 1);
        const placedSoFar = new Map<string, number>();

        return this.ships().flatMap((s): ShipMarker[] => {
            const number = s.symbol.split("-").pop() ?? s.symbol;
            const status = s.nav.status;

            if (status === "IN_TRANSIT") {
                const from = pos.get(s.nav.route.origin.symbol);
                const to = pos.get(s.nav.route.destination.symbol);
                if (!from || !to) return [];

                const start = new Date(s.nav.route.departureTime).getTime();
                const end = new Date(s.nav.route.arrival).getTime();
                const t = Math.min(1, Math.max(0, (now - start) / Math.max(end - start, 1)));

                return [{
                    symbol: s.symbol, number, status,
                    x: from.px + (to.px - from.px) * t,
                    y: from.py + (to.py - from.py) * t,
                    route: { x1: from.px, y1: from.py, x2: to.px, y2: to.py },
                }];
            }

            const at = pos.get(s.nav.waypointSymbol);
            if (!at) return [];

            // This ship's place in the row: 0, 1, 2, ...
            const index = placedSoFar.get(at.symbol) ?? 0;
            placedSoFar.set(at.symbol, index + 1);
            const count = total.get(at.symbol) ?? 1;

            // Centre the row over the waypoint, just above its dot
            const x = at.px + (index - (count - 1) / 2) * spacing;
            const y = at.py - unit * (at.style.size + 3);

            return [{ symbol: s.symbol, number, status, x, y, route: null }];
        });
    });

    // Waypoints with a ship parked there; these always get a label
    private shipWaypoints = computed(
        () => new Set(this.ships().filter((s) => s.nav.status !== "IN_TRANSIT").map((s) => s.nav.waypointSymbol)),
    );

    // Only the types that exist in this system
    legend = computed(() => {
        const present = new Set(this.placed().map((w) => w.style));
        return [...Object.values(TYPE_STYLES), OTHER_STYLE].filter((s) => present.has(s));
    });

    // --- Dragging state ---

    private drag: { x: number; y: number; view: View; scale: number; moved: boolean } | null = null;
    private justDragged = false;
    dragging = signal(false);

    constructor() {
        const id = setInterval(() => this.now.set(Date.now()), 1000);
        inject(DestroyRef).onDestroy(() => clearInterval(id));

        // Fit the whole system when its waypoints load.
        // Uses spread() directly instead of placed(), because placed() depends on the view,
        // and reading it here would refit on every zoom.
        effect(() => {
            const list = this.waypoints();
            if (list.length === 0) return;

            const xs = [0, ...list.map((w) => w.x)];
            const ys = [0, ...list.map((w) => w.y)];
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const size = Math.max(maxX - minX, maxY - minY) * 1.15;   // 15% margin
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;

            const fit = { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
            this.fitView.set(fit);
            this.view.set(fit);
        });
    }

    // --- Zoom handling ---
    private zoomAt(x: number, y: number, factor: number): void {
        const fit = this.fitView();
        if (!fit) return;

        const v = this.view();
        const w = v.w * factor;
        if (w < fit.w / 40 || w > fit.w * 3) return;   // don't zoom endlessly in or out

        this.view.set({
            x: x - (x - v.x) * factor,
            y: y - (y - v.y) * factor,
            w,
            h: v.h * factor,
        });
    }

    // Mouse wheel / touchpad: zoom towards the cursor
    onWheel(event: WheelEvent): void {
        event.preventDefault();
        const ctm = (event.currentTarget as SVGSVGElement).getScreenCTM();
        if (!ctm) return;

        const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
        this.zoomAt(p.x, p.y, event.deltaY > 0 ? 1.15 : 1 / 1.15);
    }

    onPointerDown(event: PointerEvent): void {
        if (event.button !== 0) return;   // left button / touch only
        const ctm = (event.currentTarget as SVGSVGElement).getScreenCTM();
        if (!ctm) return;

        this.justDragged = false;
        this.drag = { x: event.clientX, y: event.clientY, view: this.view(), scale: 1 / ctm.a, moved: false };
    }

    // Buttons: zoom around the middle of what you're looking at
    zoomBy(factor: number): void {
        const v = this.view();
        this.zoomAt(v.x + v.w / 2, v.y + v.h / 2, factor);
    }

    onPointerMove(event: PointerEvent): void {
        if (!this.drag) return;
        const dx = event.clientX - this.drag.x;
        const dy = event.clientY - this.drag.y;

        // Ignore tiny movements, so a normal click still works
        if (!this.drag.moved) {
            if (Math.hypot(dx, dy) < 4) return;
            this.drag.moved = true;
            this.dragging.set(true);
            (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
        }

        const v = this.drag.view;
        this.view.set({ ...v, x: v.x - dx * this.drag.scale, y: v.y - dy * this.drag.scale });
    }

    onPointerUp(): void {
        this.justDragged = this.drag?.moved ?? false;
        this.drag = null;
        this.dragging.set(false);
    }

    resetView(): void {
        const fit = this.fitView();
        if (fit) this.view.set(fit);
    }

    select(w: Placed): void {
        if (this.justDragged) return;   // the end of a drag isn't a click
        this.selectedSymbol.set(w.symbol);
    }

    // --- Template helpers ---
    
    // Where a label goes: to the right for normal waypoints,
    // and outwards (away from the planet) for moons and stations
    label(w: Placed): { x: number; y: number; anchor: string } {
        const gap = this.unit() * (w.style.size + 1.5);
        if (w.angle === null) return { x: w.px + gap, y: w.py, anchor: "start" };

        const cos = Math.cos(w.angle);
        const sin = Math.sin(w.angle);
        // Right side: text starts at the point. Left side: text ends at it. Top/bottom: centred.
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        const extraY = anchor === "middle" ? Math.sign(sin) * this.textSize() * 0.6 : 0;
        return { x: w.px + cos * gap, y: w.py + sin * gap + extraY, anchor };
    }

    // Label planets and other big things always; asteroids and moons only when zoomed in,
    // selected, or when a ship is there
    showLabel(w: Placed): boolean {
        if (w.symbol === this.selectedSymbol() || this.shipWaypoints().has(w.symbol)) return true;
        if (w.orbits) return this.zoom() >= 6;               // moons and stations: only close up
        if (MINOR_TYPES.has(w.type)) return this.zoom() >= 3; // asteroids: once zoomed in a bit
        return true;                                          // planets, gas giants, jump gate: always
    }

    has(w: Waypoint, trait: string): boolean {
        return w.traits.some((t) => t.symbol === trait);
    }

    traitList(w: Waypoint): string {
        return w.traits.map((t) => t.name).join(", ");
    }

    shortName(symbol: string): string {
        return symbol.split("-").pop() ?? symbol;
    }
}