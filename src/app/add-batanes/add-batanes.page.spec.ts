import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddBatanesPage } from './add-batanes.page';

describe('AddBatanesPage', () => {
  let component: AddBatanesPage;
  let fixture: ComponentFixture<AddBatanesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddBatanesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
