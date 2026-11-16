import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TradeMatrixComponent } from './trade-matrix.component';

describe('TradeMatrixComponent', () => {
  let component: TradeMatrixComponent;
  let fixture: ComponentFixture<TradeMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeMatrixComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TradeMatrixComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
