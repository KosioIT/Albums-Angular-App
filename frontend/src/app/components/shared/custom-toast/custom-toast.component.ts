import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-custom-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-toast.component.html',
  styleUrls: ['./custom-toast.component.css'],
})
export class CustomToastComponent {
  @Input() message: string = 'Успешно!';
  @Input() type: 'success' | 'error' | 'info' | 'warning' = 'success';
  @Input() title: string = '';
  @Input() actionLabel: string = '';
  @Input() actionUrl: string = '';

  constructor(private router: Router) {}

  closeToast() {
    const el = document.querySelector('app-custom-toast');
    if (el) el.remove();
  }

  navigateToAction() {
    if (this.actionUrl) {
      this.router.navigateByUrl(this.actionUrl);
    }
  }
}
