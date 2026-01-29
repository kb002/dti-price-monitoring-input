import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatanesBusinessPage } from './batanes-business.page';

describe('BatanesBusinessPage', () => {
  let component: BatanesBusinessPage;
  let fixture: ComponentFixture<BatanesBusinessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BatanesBusinessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
