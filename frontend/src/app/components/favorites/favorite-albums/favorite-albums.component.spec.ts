import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoriteAlbumsComponent } from './favorite-albums.component';

describe('FavoriteAlbumsComponent', () => {
  let component: FavoriteAlbumsComponent;
  let fixture: ComponentFixture<FavoriteAlbumsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavoriteAlbumsComponent],
      providers: [provideRouter([]), provideToastr()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(FavoriteAlbumsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
