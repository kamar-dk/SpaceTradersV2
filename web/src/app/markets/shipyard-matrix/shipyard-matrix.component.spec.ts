import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShipyardMatrixComponent } from './shipyard-matrix.component';

describe('ShipyardMatrixComponent', () => {
  let component: ShipyardMatrixComponent;
  let fixture: ComponentFixture<ShipyardMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShipyardMatrixComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ShipyardMatrixComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
