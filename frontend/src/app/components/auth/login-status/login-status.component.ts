import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { User } from '../../../models/user';
import { AuthService } from '../../../services/auth.service';
import { DropdownService } from '../../../services/dropdown.service';
import { filter } from 'rxjs/operators';

// Dropdown keys in DropdownService
const ACCOUNT = 'loginStatus';
const ADMIN = 'adminMenu';

export interface MenuItem {
  label: string;
  link?: string;
  action?: () => void;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

/*
  The right side of the navbar: "Admin" (admins only) and the account menu.
  The account menu is one level with section headings, so nothing has to fly out past the edge.
*/
@Component({
  selector: 'app-login-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login-status.component.html',
  styleUrls: [
    './login-status.component.css',
    '../../navbar/navbar.component.css',
  ],
})
export class LoginStatusComponent implements OnDestroy {
  user: User | null = null;
  readonly accountOpen$ = this.dropdownService.getState(ACCOUNT);
  readonly adminOpen$ = this.dropdownService.getState(ADMIN);
  readonly ACCOUNT = ACCOUNT;
  readonly ADMIN = ADMIN;

  readonly adminItems: MenuItem[] = [
    { label: 'Manage albums', link: '/admin/albums' },
    { label: 'Add album', link: '/admin/add-album' },
    { label: 'Manage users', link: '/admin/users' },
    { label: 'Statistics', link: '/admin/stats' },
  ];

  readonly accountSections: MenuSection[] = [
    {
      title: 'My music',
      items: [
        { label: 'My playlists', link: '/playlists/mine' },
        { label: 'Favorite albums', link: '/favorites' },
        { label: 'My activity', link: '/account/activity' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Active sessions', link: '/account/sessions' },
        { label: 'Sign out of all devices', action: () => this.logoutAll() },
      ],
    },
  ];

  private routerSub = this.router.events
    .pipe(filter((e) => e instanceof NavigationEnd))
    .subscribe(() => this.closeAll());

  constructor(
    public authService: AuthService,
    private router: Router,
    private dropdownService: DropdownService,
  ) {
    this.authService.user$.subscribe((user) => (this.user = user));
  }

  // Desktop: hover opens a menu. Phones: a tap toggles it
  onMouseEnter(key: string) {
    this.dropdownService.onMouseEnter(key);
  }

  onMouseLeave(key: string) {
    this.dropdownService.onMouseLeave(key);
  }

  onClick(key: string) {
    this.dropdownService.onClick(key);
  }

  // Keyboard: Enter / Space on the button toggles its menu on every screen size
  onKeyToggle(key: string, event: Event) {
    event.preventDefault();
    this.dropdownService.toggle(key);
  }

  @HostListener('document:keydown.escape')
  closeAll() {
    this.dropdownService.close(ACCOUNT);
    this.dropdownService.close(ADMIN);
  }

  logout() {
    this.closeAll();
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  logoutAll() {
    this.closeAll();
    this.authService.logoutAll().subscribe(() => this.router.navigate(['/login']));
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }
}
