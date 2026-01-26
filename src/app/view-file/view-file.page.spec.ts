import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewFilePage } from './view-file.page';

describe('ViewFilePage', () => {
  let component: ViewFilePage;
  let fixture: ComponentFixture<ViewFilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewFilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
