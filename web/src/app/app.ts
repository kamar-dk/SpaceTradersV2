import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgentSummaryComponent } from './agent-summary/agent-summary.component';

@Component({
  imports: [RouterOutlet, AgentSummaryComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('web');
}
