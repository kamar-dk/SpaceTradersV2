import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { TradeMatrixComponent } from "../trade-matrix/trade-matrix.component";

export type TradeMatrixDialogData = { system: string };

@Component({
    selector: "app-trade-matrix-dialog",
    imports: [MatDialogModule, MatButtonModule, TradeMatrixComponent],
    templateUrl: "./trade-matrix-dialog.component.html",
    styleUrl: "./trade-matrix-dialog.component.scss",
})
export class TradeMatrixDialogComponent {
    data = inject<TradeMatrixDialogData>(MAT_DIALOG_DATA);
}