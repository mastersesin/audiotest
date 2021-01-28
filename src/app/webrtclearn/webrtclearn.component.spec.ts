import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebrtclearnComponent } from './webrtclearn.component';

describe('WebrtclearnComponent', () => {
  let component: WebrtclearnComponent;
  let fixture: ComponentFixture<WebrtclearnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WebrtclearnComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WebrtclearnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
