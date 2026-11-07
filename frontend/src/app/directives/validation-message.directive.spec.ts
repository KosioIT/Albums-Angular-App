import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ValidationMessageDirective } from './validation-message.directive';

@Component({
  imports: [ReactiveFormsModule, ValidationMessageDirective],
  template: `
    <form [formGroup]="form">
      <input formControlName="newPassword" />
      <div appValidationMessage="password" controlName="newPassword"></div>
    </form>
  `,
})
class HostComponent {
  form = new FormGroup({ newPassword: new FormControl('', Validators.required) });
}

describe('ValidationMessageDirective', () => {
  it('shows the message only after the field is touched', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const message: HTMLElement = fixture.nativeElement.querySelector('[appValidationMessage]');

    expect(message.textContent).toBe('');

    fixture.componentInstance.form.controls.newPassword.markAsTouched();
    expect(message.textContent).toBe('Password is required!');
  });
});
