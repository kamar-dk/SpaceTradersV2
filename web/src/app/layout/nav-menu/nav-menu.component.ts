import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";

@Component({
    selector: "app-nav-menu",
    imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule],
    templateUrl: "./nav-menu.component.html",
    styleUrl: "./nav-menu.component.scss",
})
export class NavMenuComponent {}