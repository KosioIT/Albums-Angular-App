import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageUsersComponent, timeAgo } from './manage-users.component';

describe('ManageUsersComponent', () => {
  let component: ManageUsersComponent;
  let fixture: ComponentFixture<ManageUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageUsersComponent],
      providers: [provideRouter([]), provideToastr()],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('says how long ago a date was', () => {
    const now = Date.parse('2026-11-20T12:00:00Z');
    expect(timeAgo(null, now)).toBe('');
    expect(timeAgo('2026-11-20T08:00:00Z', now)).toBe('today');
    expect(timeAgo('2026-11-19T10:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('2026-11-15T12:00:00Z', now)).toBe('5 days ago');
    expect(timeAgo('2026-09-20T12:00:00Z', now)).toBe('2 months ago');
    expect(timeAgo('2023-11-01T12:00:00Z', now)).toBe('3 years ago');
  });
});
