import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemMapComponent } from './system-map.component';

describe('MapComponent', () => {
  let component: SystemMapComponent;
  let fixture: ComponentFixture<SystemMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemMapComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SystemMapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
