import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuirinoBusinessPage } from './quirino-business.page';

describe('QuirinoBusinessPage', () => {
  let component: QuirinoBusinessPage;
  let fixture: ComponentFixture<QuirinoBusinessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuirinoBusinessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
