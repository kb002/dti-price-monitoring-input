import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevaBusinessPage } from './nueva-business.page';

describe('NuevaBusinessPage', () => {
  let component: NuevaBusinessPage;
  let fixture: ComponentFixture<NuevaBusinessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevaBusinessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
