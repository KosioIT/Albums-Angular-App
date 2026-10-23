import { Directive, Input, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ValidationService } from '../services/validation.service';

@Directive({
  selector: '[appValidationMessage]',
  standalone: true,
})
export class ValidationMessageDirective implements OnInit, OnDestroy {
  @Input('appValidationMessage') fieldName!: string;

  private sub?: Subscription;

  constructor(
    private el: ElementRef,
    private control: NgControl,
    private validationService: ValidationService,
  ) {}

  ngOnInit(): void {
    const formControl = this.control.control;
    if (!formControl) return;

    this.sub = formControl.statusChanges.subscribe(() => {
      const msg = this.validationService.getErrorMessage(
        formControl,
        this.fieldName,
      );
      this.el.nativeElement.textContent = msg || '';
      this.el.nativeElement.style.display = msg ? 'block' : 'none';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
