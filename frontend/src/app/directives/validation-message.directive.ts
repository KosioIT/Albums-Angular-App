import { Directive, Input, ElementRef, OnInit, OnDestroy, Optional, Renderer2 } from '@angular/core';
import { AbstractControl, ControlContainer } from '@angular/forms';
import { Subscription, merge } from 'rxjs';
import { ValidationService } from '../services/validation.service';

/*
  Shows the validation message of a form field, e.g.
    <div appValidationMessage="password" controlName="newPassword"></div>
  appValidationMessage picks the messages (ValidationService); controlName is the form control,
  and defaults to the same name. The control is looked up in the parent form.

  It can also sit on the input itself (<input formControlName="title" appValidationMessage="title">):
  then the message goes into a <div class="validation-error"> added right after the input.
*/
@Directive({
  selector: '[appValidationMessage]',
  standalone: true,
})
export class ValidationMessageDirective implements OnInit, OnDestroy {
  @Input('appValidationMessage') fieldName!: string;
  @Input() controlName?: string;

  private sub?: Subscription;
  private target!: HTMLElement; // where the message is written

  constructor(
    private el: ElementRef<HTMLElement>,
    @Optional() private container: ControlContainer | null,
    private validationService: ValidationService,
    private renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    const name = this.controlName ?? this.fieldName;
    const control = this.container?.control?.get(name);
    if (!control) {
      console.warn(`appValidationMessage: no form control named "${name}"`);
      return;
    }

    this.target = this.el.nativeElement;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(this.target.tagName)) {
      // Never write into (or hide) the input itself
      this.target = this.renderer.createElement('div');
      this.target.className = 'validation-error text-danger mt-1';
      this.renderer.insertBefore(this.el.nativeElement.parentNode, this.target, this.el.nativeElement.nextSibling);
    }

    this.render(control);
    // statusChanges covers validation; events covers markAsTouched from blur or submit
    this.sub = merge(control.statusChanges, control.events).subscribe(() => this.render(control));
  }

  private render(control: AbstractControl): void {
    const msg = control.touched || control.dirty
      ? this.validationService.getErrorMessage(control, this.fieldName)
      : '';
    this.target.textContent = msg;
    this.target.style.display = msg ? 'block' : 'none';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.target && this.target !== this.el.nativeElement) this.target.remove();
  }
}
