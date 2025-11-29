import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalisisImagenesComponent } from './analisis-imagenes.component';

describe('AnalisisImagenesComponent', () => {
  let component: AnalisisImagenesComponent;
  let fixture: ComponentFixture<AnalisisImagenesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalisisImagenesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AnalisisImagenesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
