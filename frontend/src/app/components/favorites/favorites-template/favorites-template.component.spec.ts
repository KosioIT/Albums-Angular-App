import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoritesTemplateComponent } from './favorites-template.component';

describe('FavoritesTemplateComponent', () => {
  let component: FavoritesTemplateComponent;
  let fixture: ComponentFixture<FavoritesTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoritesTemplateComponent],
      providers: [provideRouter([]), provideToastr()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FavoritesTemplateComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('albumId', 'back-in-black');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
