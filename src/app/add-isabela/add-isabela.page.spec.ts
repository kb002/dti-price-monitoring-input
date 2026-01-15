import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddIsabelaPage } from './add-isabela.page';

describe('AddIsabelaPage', () => {
  let component: AddIsabelaPage;
  let fixture: ComponentFixture<AddIsabelaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddIsabelaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
