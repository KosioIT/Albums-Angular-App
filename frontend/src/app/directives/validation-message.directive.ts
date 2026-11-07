import { Directive, Input, ElementRef, OnInit, OnDestroy, Optional } from '@angular/core';
import { AbstractControl, ControlContainer } from '@angular/forms';
import { Subscription, merge } from 'rxjs';
import { ValidationService } from '../services/validation.service';

/*
  Shows the validation message of a form field, e.g.
    <div appValidationMessage="password" controlName="newPassword"></div>
  appValidationMessage picks the messages (ValidationService); controlName is the form control,
  and defaults to the same name. The element sits next to the input, so the control is looked up
  in the parent form instead of being injected.
*/
@Directive({
  selector: '[appValidationMessage]',
  standalone: true,
})
export class ValidationMessageDirective implements OnInit, OnDestroy {
  @Input('appValidationMessage') fieldName!: string;
  @Input() controlName?: string;

  private sub?: Subscription;

  constructor(
    private el: ElementRef<HTMLElement>,
    @Optional() private container: ControlContainer | null,
    private validationService: ValidationService,
  ) {}

  ngOnInit(): void {
    const name = this.controlName ?? this.fieldName;
    const control = this.container?.control?.get(name);
    if (!control) {
      console.warn(`appValidationMessage: no form control named "${name}"`);
      return;
    }

    this.render(control);
    // statusChanges covers validation; events covers markAsTouched from blur or submit
    this.sub = merge(control.statusChanges, control.events).subscribe(() => this.render(control));
  }

  private render(control: AbstractControl): void {
    const msg = control.touched || control.dirty
      ? this.validationService.getErrorMessage(control, this.fieldName)
      : '';
    this.el.nativeElement.textContent = msg;
    this.el.nativeElement.style.display = msg ? 'block' : 'none';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
