import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddNuevaPage } from './add-nueva.page';

describe('AddNuevaPage', () => {
  let component: AddNuevaPage;
  let fixture: ComponentFixture<AddNuevaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddNuevaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
