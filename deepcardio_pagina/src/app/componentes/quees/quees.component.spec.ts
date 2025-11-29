import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueesComponent } from './quees.component';

describe('QueesComponent', () => {
  let component: QueesComponent;
  let fixture: ComponentFixture<QueesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(QueesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
