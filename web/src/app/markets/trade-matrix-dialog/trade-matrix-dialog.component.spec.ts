import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TradeMatrixDialogComponent } from './trade-matrix-dialog.component';

describe('TradeMatrixDialogComponent', () => {
  let component: TradeMatrixDialogComponent;
  let fixture: ComponentFixture<TradeMatrixDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeMatrixDialogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TradeMatrixDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
