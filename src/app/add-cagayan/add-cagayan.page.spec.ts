import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddCagayanPage } from './add-cagayan.page';

describe('AddCagayanPage', () => {
  let component: AddCagayanPage;
  let fixture: ComponentFixture<AddCagayanPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddCagayanPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
