import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditFilePage } from './edit-file.page';

describe('EditFilePage', () => {
  let component: EditFilePage;
  let fixture: ComponentFixture<EditFilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditFilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
