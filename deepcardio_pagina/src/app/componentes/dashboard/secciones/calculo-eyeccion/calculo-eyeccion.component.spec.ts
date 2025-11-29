import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculoEyeccionComponent } from './calculo-eyeccion.component';

describe('CalculoEyeccionComponent', () => {
  let component: CalculoEyeccionComponent;
  let fixture: ComponentFixture<CalculoEyeccionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculoEyeccionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CalculoEyeccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
