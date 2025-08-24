import { Injectable } from '@angular/core';
import { CustomToastComponent } from '../components/shared/custom-toast/custom-toast.component';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';


@Injectable({
  providedIn: 'root'
})
export class CustomToastrService {
  constructor(private overlay: Overlay) { }

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning', title: string = '', actionLabel: string = '', actionUrl: string = ''): void {
    const overlayRef: OverlayRef = this.overlay.create({
      positionStrategy: this.overlay.position()
        .global()
        .top('20px')
        .right('20px'),
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.noop()
    });

    const toastPortal = new ComponentPortal(CustomToastComponent);
    const toastRef = overlayRef.attach(toastPortal);

    toastRef.instance.message = message;
    toastRef.instance.type = type;
    toastRef.instance.title = title;
    toastRef.instance.actionLabel = actionLabel;
    toastRef.instance.actionUrl = actionUrl;

    setTimeout(() => overlayRef.dispose(), 5000); // Auto close after 5 seconds
  }
}
