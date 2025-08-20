import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { User } from '../../../models/user';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { DropdownService } from '../../../services/dropdown.service';

@Component({
    selector: 'app-login-status',
    imports: [CommonModule, RouterModule, NgbDropdownModule],
    templateUrl: './login-status.component.html',
    styleUrls: ['./login-status.component.css', "../../navbar/navbar.component.css"]
})
export class LoginStatusComponent {
  user: User | null = null;
  dropdownOpen$ = this.dropdownService.getState('loginStatus');

  constructor(
    public authService: AuthService,
    private router: Router,
    private dropdownService: DropdownService
  ) {
    this.authService.user$.subscribe(user => this.user = user);
  }

  onMouseEnter() {
    this.dropdownService.onMouseEnter('loginStatus');
  }

  onMouseLeave() {
    this.dropdownService.onMouseLeave('loginStatus');
  }

  onClick() {
    this.dropdownService.onClick('loginStatus');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
