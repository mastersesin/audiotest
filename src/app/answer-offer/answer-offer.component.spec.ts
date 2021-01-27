import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerOfferComponent } from './answer-offer.component';

describe('AnswerOfferComponent', () => {
  let component: AnswerOfferComponent;
  let fixture: ComponentFixture<AnswerOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnswerOfferComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnswerOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
