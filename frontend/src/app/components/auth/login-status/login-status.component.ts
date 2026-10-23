import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { User } from '../../../models/user';
import { AuthService } from '../../../services/auth.service';
import { DropdownService } from '../../../services/dropdown.service';
import { filter } from 'rxjs/operators';

const key = "loginStatus";

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

  private routerSub = this.router.events
    .pipe(filter((e) => e instanceof NavigationEnd))
    .subscribe(() => this.dropdownService.close(key));

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
  }

  onClick() {
    this.dropdownService.onClick(key);
  }

  logout() {
    this.dropdownService.closeAll();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }
}
