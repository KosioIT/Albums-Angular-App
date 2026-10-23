import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { DropdownService } from '../../services/dropdown.service';
import { LoginStatusComponent } from '../auth/login-status/login-status.component';
import { AlbumService } from '../../services/album.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, LoginStatusComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  isNavbarCollapsed = true;
  isInHomePage = true;

  rockOpen$ = this.dropdownService.getState('rock');
  metalOpen$ = this.dropdownService.getState('metal');

  constructor(
    public dropdownService: DropdownService,
    public albumService: AlbumService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isInHomePage = event.url === '/';
        this.dropdownService.closeAll();
      });
  }

  toggleNavbar() {
    this.isNavbarCollapsed = !this.isNavbarCollapsed;
  }

  onMouseEnter(key: string) {
    this.dropdownService.onMouseEnter(key);
  }

  onMouseLeave(key: string) {
    this.dropdownService.onMouseLeave(key);
  }

  onClick(key: string) {
    this.dropdownService.onClick(key);
  }
}
