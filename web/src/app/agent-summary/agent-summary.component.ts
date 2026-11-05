import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";
import type { Agent } from "../models/agent";
import {MatCardModule} from '@angular/material/card';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ApiService } from "../services/api.service";

@Component({
  imports: [MatCardModule, MatProgressSpinnerModule],
  selector: 'app-agent-summary',
  styleUrl: './agent-summary.component.scss',
  templateUrl: './agent-summary.component.html',
})
export class AgentSummaryComponent {
  private api = inject(ApiService);

  agent = toSignal(this.api.getAgent());
}
