import { Component, OnInit } from '@angular/core';
import { DropdownService } from '../../services/dropdown.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { LoginStatusComponent } from '../auth/login-status/login-status.component';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AlbumService } from '../../services/album.service';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    imports: [NgbModule, CommonModule, RouterModule, LoginStatusComponent]
})
export class NavbarComponent implements OnInit {
  isNavbarCollapsed = true;
  isInHomePage = true;

  constructor(
    public dropdownService: DropdownService,
    public albumService: AlbumService,
    private router: Router
  ) {
    //check if the user is on the home page
    this.router.events.subscribe((event) => { 
      if (event instanceof NavigationEnd) {
        this.isInHomePage = event.url === '/';
        console.log("isInHomePage:", this.isInHomePage);
      }
    });
  }

  ngOnInit() {
    
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
