import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { ShipsService } from '../../services/ships.service';
import { ShipCardComponent } from '../ship-card/ship-card.component';

@Component({
  imports: [ShipCardComponent],
  selector: 'app-ships-page',
  styleUrl: './ships-page.component.scss',
  templateUrl: './ships-page.component.html',
})
export class ShipsPageComponent {
    ships = inject(ShipsService).ships;
}