import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaselineInputPage } from './baseline-input.page';

describe('BaselineInputPage', () => {
  let component: BaselineInputPage;
  let fixture: ComponentFixture<BaselineInputPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BaselineInputPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
