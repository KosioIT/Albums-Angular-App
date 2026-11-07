import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAlbumsComponent } from './manage-albums.component';

describe('ManageAlbumsComponent', () => {
  let component: ManageAlbumsComponent;
  let fixture: ComponentFixture<ManageAlbumsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAlbumsComponent],
      providers: [provideRouter([]), provideToastr()],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageAlbumsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
