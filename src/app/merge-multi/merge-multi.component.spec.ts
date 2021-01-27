import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MergeMultiComponent } from './merge-multi.component';

describe('MergeMultiComponent', () => {
  let component: MergeMultiComponent;
  let fixture: ComponentFixture<MergeMultiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MergeMultiComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MergeMultiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
