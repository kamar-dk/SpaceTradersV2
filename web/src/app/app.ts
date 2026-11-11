import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgentSummaryComponent } from './layout/agent-summary/agent-summary.component';
import { NavMenuComponent } from './layout/nav-menu/nav-menu.component';

@Component({
  imports: [RouterOutlet, AgentSummaryComponent, NavMenuComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('web');
}
