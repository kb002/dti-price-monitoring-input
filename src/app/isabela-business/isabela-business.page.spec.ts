import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IsabelaBusinessPage } from './isabela-business.page';

describe('IsabelaBusinessPage', () => {
  let component: IsabelaBusinessPage;
  let fixture: ComponentFixture<IsabelaBusinessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IsabelaBusinessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
