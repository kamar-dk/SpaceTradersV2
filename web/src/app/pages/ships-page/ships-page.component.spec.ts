import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShipsPageComponent } from './ships-page.component';

describe('ShipsPageComponent', () => {
  let component: ShipsPageComponent;
  let fixture: ComponentFixture<ShipsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShipsPageComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ShipsPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
