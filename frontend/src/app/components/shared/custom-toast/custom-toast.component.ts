import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-custom-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-toast.component.html',
  styleUrls: ['./custom-toast.component.css']
})
export class CustomToastComponent {
  @Input() message: string = 'Успешно!';
  @Input() type: 'success' | 'error' | 'info' | 'warning' = 'success';
  @Input() title: string = '';

  closeToast() {
    const el = document.querySelector('app-custom-toast');
    if (el) el.remove();
  }
}
