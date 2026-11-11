import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ShipDialogComponent, type ShipDialogData } from '../ship-dialog/ship-dialog.component';
import { ShipsService } from '../../services/ships.service';
import { ShipCardComponent } from '../ship-card/ship-card.component';
import type { Ship } from '../../models/ship';

@Component({
  imports: [ShipCardComponent],
  selector: 'app-ships-page',
  styleUrl: './ships-page.component.scss',
  templateUrl: './ships-page.component.html',
})
export class ShipsPageComponent {
    ships = inject(ShipsService).ships;

    private dialog = inject(MatDialog)

    open(ship: Ship): void {
      this.dialog.open<ShipDialogComponent, ShipDialogData>(ShipDialogComponent, {
          data: {ship: ship },
          width: "520px",
          autoFocus: false,
      });
  }
}