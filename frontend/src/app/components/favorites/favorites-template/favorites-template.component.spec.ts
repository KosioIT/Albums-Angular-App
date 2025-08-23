import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoritesTemplateComponent } from './favorites-template.component';

describe('FavoritesTemplateComponent', () => {
  let component: FavoritesTemplateComponent;
  let fixture: ComponentFixture<FavoritesTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritesTemplateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FavoritesTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
