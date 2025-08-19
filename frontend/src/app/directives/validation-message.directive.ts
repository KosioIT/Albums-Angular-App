import {
  Directive,
  Input,
  ElementRef,
  OnInit,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ValidationService } from '../services/validation.service';

@Directive({
  selector: '[appValidationMessage]',
  standalone: true,
})
export class ValidationMessageDirective implements OnInit, OnDestroy {
  @Input('appValidationMessage') fieldName!: string;

  private statusSub?: Subscription;

  constructor(
    private el: ElementRef,
    private control: NgControl,
    private validationService: ValidationService,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const formControl = this.control.control;
    if (!formControl) return;

    const updateErrorMessage = () => {
      const errorMsg = this.validationService.getErrorMessage(
        formControl,
        this.fieldName
      );

      const parent = this.el.nativeElement.parentElement;
      if (!parent) return;

      let errorDiv = parent.querySelector('.validation-error');

      if (!errorDiv) {
        errorDiv = this.renderer.createElement('div');
        this.renderer.addClass(errorDiv, 'validation-error');
        this.renderer.addClass(errorDiv, 'text-danger');
        this.renderer.setStyle(errorDiv, 'fontSize', '22px');
        this.renderer.setStyle(errorDiv, 'marginTop', '4px');
        this.renderer.appendChild(parent, errorDiv);
      }

      this.renderer.setProperty(errorDiv, 'textContent', errorMsg || '');
    };

    this.statusSub = formControl.statusChanges?.subscribe(updateErrorMessage);
    this.statusSub.add(formControl.valueChanges?.subscribe(updateErrorMessage));
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
  }
}
