import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaypointCardComponent } from './waypoint-card.component';

describe('WaypointCardComponent', () => {
  let component: WaypointCardComponent;
  let fixture: ComponentFixture<WaypointCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaypointCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WaypointCardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
