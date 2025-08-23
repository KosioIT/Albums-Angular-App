import { Injectable, ViewContainerRef } from '@angular/core';
import { CustomToastComponent } from '../components/shared/custom-toast/custom-toast.component';

@Injectable({
  providedIn: 'root'
})
export class CustomToastrService {
  constructor(private vcr: ViewContainerRef) { }

  showToast(message: string, type: 'success' | 'error' | 'info') {
    const toastRef = this.vcr.createComponent(CustomToastComponent);
    toastRef.instance.message = message;
    toastRef.instance.type = type;

    setTimeout(() => toastRef.destroy(), 5000); // auto-dismiss after 5 seconds
  }
}
