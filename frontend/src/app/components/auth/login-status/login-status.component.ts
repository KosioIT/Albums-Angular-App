import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { User } from '../../../models/user';
import { AuthService } from '../../../services/auth.service';
import { DropdownService } from '../../../services/dropdown.service';
import { filter } from 'rxjs/operators';

const key = "loginStatus";

export type Submenu = 'admin' | 'music' | 'account';

export interface MenuItem {
  label: string;
  link?: string;
  action?: () => void;
}

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
  dropdownOpen$ = this.dropdownService.getState(key);
  openSubmenu: Submenu | null = null; // the second-level menu that is shown

  readonly adminItems: MenuItem[] = [
    { label: 'Manage albums', link: '/admin/albums' },
    { label: 'Add album', link: '/admin/add-album' },
    { label: 'Manage users', link: '/admin/users' },
    { label: 'Statistics', link: '/admin/stats' },
  ];

  readonly musicItems: MenuItem[] = [
    { label: 'My playlists', link: '/playlists/mine' },
    { label: 'Favorite albums', link: '/favorites' },
    { label: 'My activity', link: '/account/activity' },
  ];

  readonly accountItems: MenuItem[] = [
    { label: 'Active sessions', link: '/account/sessions' },
    { label: 'Sign out of all devices', action: () => this.logoutAll() },
  ];

  private routerSub = this.router.events
    .pipe(filter((e) => e instanceof NavigationEnd))
    .subscribe(() => this.closeMenu());

  constructor(
    public authService: AuthService,
    private router: Router,
    private dropdownService: DropdownService,
  ) {
    this.authService.user$.subscribe((user) => (this.user = user));
  }

  onMouseEnter() {
    this.dropdownService.onMouseEnter(key);
  }

  onMouseLeave() {
    this.dropdownService.onMouseLeave(key);
    if (!this.dropdownService.isMobile()) this.openSubmenu = null;
  }

  // Second level: hover opens it on desktop, click (or Enter) toggles it everywhere
  hoverSubmenu(name: Submenu | null) {
    if (!this.dropdownService.isMobile()) this.openSubmenu = name;
  }

  toggleSubmenu(name: Submenu, event: Event) {
    event.stopPropagation(); // the click must not close the main menu on mobile
    this.openSubmenu = this.openSubmenu === name ? null : name;
  }

  private closeMenu() {
    this.dropdownService.close(key);
    this.openSubmenu = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.openSubmenu) this.openSubmenu = null;
    else this.closeMenu();
  }

  onClick() {
    this.dropdownService.onClick(key);
  }

  logout() {
    this.dropdownService.closeAll();
    this.openSubmenu = null;
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  logoutAll() {
    this.dropdownService.closeAll();
    this.openSubmenu = null;
    this.authService.logoutAll().subscribe(() => this.router.navigate(['/login']));
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }
}
