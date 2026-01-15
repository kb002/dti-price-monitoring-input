import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddQuirinoPage } from './add-quirino.page';

describe('AddQuirinoPage', () => {
  let component: AddQuirinoPage;
  let fixture: ComponentFixture<AddQuirinoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddQuirinoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
