import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CagayanBusinessPage } from './cagayan-business.page';

describe('CagayanBusinessPage', () => {
  let component: CagayanBusinessPage;
  let fixture: ComponentFixture<CagayanBusinessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CagayanBusinessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
