import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./components/navbar/navbar.component";
import { PlayerComponent } from './components/player/player.component';
import { PlayerService } from './services/player.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, NavbarComponent, PlayerComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
  readonly player = inject(PlayerService);
}
